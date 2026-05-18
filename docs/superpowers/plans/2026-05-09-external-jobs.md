# External Jobs Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate external jobs (StartupJobs, Grafton) from `GET /v1/external-jobs` into the same job list, detail page (`/jobs/detail/[id]`), and My Jobs lists as internal QuickJobs jobs.

**Architecture:** Fetch external jobs client-side for logged-in users via a new `useExternalJobsList` hook, merge with internal jobs in `JobsListWrapper`. The existing `/jobs/detail/[id]` page tries internal fetch first, then falls back to external fetch. `FeaturesCard` gains an `isExternal` mode that swaps the apply mutation for an external anchor CTA (opens new tab). `MyJobsList` already fetches applied/ignored external jobs — update it to pass `feedName` and fix unique keys.

**Tech Stack:** Next.js 14 (App Router), React Query, TypeScript, GA (`gtag`)

---

## File Map

| File | Change |
|------|--------|
| `lib/migratedQueries.ts` | Add `fetchExternalJobsList()` and `fetchExternalJobById()` |
| `hooks/useExternalJobs.ts` | Add `useExternalJobsList` export |
| `components/JobsList.tsx` | Add `isExternal`, `feedName` to `JobWithStats`; fix filter + key |
| `components/JobCard.tsx` | Add `feedName` badge prop |
| `components/JobsListWrapper.tsx` | Fetch + merge external jobs for logged-in users |
| `components/FeaturesCard.tsx` | Add `isExternal`, `externalUrl`, `feedName` props; external CTA |
| `app/jobs/detail/[id]/page.tsx` | Fall back to external job if internal 404s |
| `components/MyJobs/MyJobsList.tsx` | Add `feedName` to merged jobs; fix unique key |

---

## Task 1: Add fetch functions for external jobs

**Files:**
- Modify: `apps/job-portal/lib/migratedQueries.ts`

- [ ] **Step 1: Add `fetchExternalJobsList` and `fetchExternalJobById` to migratedQueries.ts**

Add these two functions after the existing `fetchExternalIgnoredJobs` function (around line 215):

```typescript
export async function fetchExternalJobsList(
    options: Pick<FetchOptions, "signal" | "token"> = {}
): Promise<ExternalJobsResponse> {
    return fetchOpenApiJson<ExternalJobsResponse>("/external-jobs", {
        auth: true,
        signal: options.signal,
        token: options.token,
    });
}

export async function fetchExternalJobById(
    id: string | number,
    options: Pick<FetchOptions, "signal" | "token"> = {}
): Promise<ExternalJob | null> {
    try {
        return await fetchOpenApiJson<ExternalJob>(`/external-jobs/${id}`, {
            auth: true,
            signal: options.signal,
            token: options.token,
        });
    } catch {
        return null;
    }
}
```

Also add `ExternalJob` to the imports from `./openapi/types` at the top of the file:

```typescript
import type {
    AvailableJobsResponse,
    CompaniesResponse,
    CompanyDetailResponse,
    CompanyLookup,
    ExternalJob,           // ← add this
    ExternalJobsResponse,
    FacultiesResponse,
    FacultyLookup,
    JobTerm,
    MyApplicationsResponse,
    ProfileResponse,
    PublicJobDetailResponse,
    PublicJobsResponse,
    SchoolsResponse,
    SchoolLookup,
} from "./openapi/types";
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/job-portal && npx tsc --noEmit 2>&1 | grep "migratedQueries" | head -10
```

Expected: no errors mentioning `migratedQueries.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/job-portal/lib/migratedQueries.ts
git commit -m "feat(job-portal): add fetchExternalJobsList and fetchExternalJobById"
```

---

## Task 2: Add `useExternalJobsList` hook

**Files:**
- Modify: `apps/job-portal/hooks/useExternalJobs.ts`

- [ ] **Step 1: Add `useExternalJobsList` export**

Append at the bottom of `apps/job-portal/hooks/useExternalJobs.ts`:

```typescript
import { fetchExternalJobsList } from "../lib/migratedQueries";
// Note: fetchExternalAppliedJobs and fetchExternalIgnoredJobs are already imported above.
// Add fetchExternalJobsList to the existing import line instead of duplicating.
```

Replace the existing import line (currently `import { fetchExternalAppliedJobs, fetchExternalIgnoredJobs, ...`) with:

```typescript
import {
    fetchExternalAppliedJobs,
    fetchExternalIgnoredJobs,
    fetchExternalJobsList,
    type ExternalJobsResponse,
} from "../lib/migratedQueries";
```

Then add this new export at the bottom of the file:

```typescript
export const useExternalJobsList = (enabled: boolean = true) => {
    return useQuery<ExternalJobsResponse>({
        queryKey: [API_KEYS.JOBS, "external", "list"],
        queryFn: async () => {
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Request timeout")), REQUEST_TIMEOUT_MS)
            );
            return Promise.race([fetchExternalJobsList(), timeoutPromise]);
        },
        enabled,
        staleTime: 60_000,
    });
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/job-portal && npx tsc --noEmit 2>&1 | grep "useExternalJobs" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/job-portal/hooks/useExternalJobs.ts
git commit -m "feat(job-portal): add useExternalJobsList hook"
```

---

## Task 3: Extend `JobWithStats` and fix `JobsList` filter + keys

**Files:**
- Modify: `apps/job-portal/components/JobsList.tsx`

- [ ] **Step 1: Add `isExternal` and `feedName` to `JobWithStats`**

In `JobsList.tsx`, find the `JobWithStats` interface (line 10) and add two fields:

```typescript
export interface JobWithStats extends JobLike {
    title?: string;
    timeLeftDays?: number;
    timeLeftHour?: number;
    stats?: JobStats;
    created_at?: string;
    offer_expires_at?: string;
    starts_at?: string;
    ends_at?: string;
    salary_to?: number | null;
    salary_type?: string;
    isExternal?: boolean;   // ← add
    feedName?: string;      // ← add
}
```

- [ ] **Step 2: Always include external jobs in filtered list**

Find the `filteredJobs` useMemo (around line 105) and update the filter logic:

```typescript
const filteredJobs = useMemo(() => {
    const enabledTerms = new Set(effectiveEnabledTypes.map((t) => JOB_TYPE_TO_TERM[t]));
    return initialJobs.filter((job) => {
        if (job.isExternal) return true; // always show external jobs regardless of term filter
        return job.term && enabledTerms.has(job.term as string);
    });
}, [initialJobs, effectiveEnabledTypes]);
```

- [ ] **Step 3: Fix unique key in `JobsSection` to prevent collision between internal/external IDs**

Find the `JobsSection` component (around line 39) and update the `key` prop:

```typescript
{displayedItems.map((job) => (
    <JobCard
        key={job.isExternal ? `ext-${job.id}` : job.id}
        job={job}
        {...(isInactive && { isInactive: true })}
    />
))}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd apps/job-portal && npx tsc --noEmit 2>&1 | grep "JobsList" | head -10
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/job-portal/components/JobsList.tsx
git commit -m "feat(job-portal): extend JobWithStats with isExternal/feedName, fix filter + keys"
```

---

## Task 4: Add `feedName` source badge to `JobCard`

**Files:**
- Modify: `apps/job-portal/components/JobCard.tsx`

- [ ] **Step 1: Accept `feedName` from job and render badge**

In `JobCard.tsx`, extract `feedName` from the job object and render a second badge next to the job-type badge.

Find the `JobCardProps` interface and note that `feedName` comes from `job.feedName` (already in `JobWithStats` which is passed as `job`).

Find the badge section in the `CardHeader` (around line 72-78) and add a source badge after it:

```typescript
const feedName = (job as any).feedName as string | undefined;

// ... existing code ...

<CardHeader className="pb-4 !px-6 !pt-6">
    <div className="mb-6 flex flex-wrap gap-2 items-center">
        <Badge
            className="text-white text-xs font-semibold px-3 py-1.5 rounded-sm uppercase border-0"
            style={{ backgroundColor: badgeBgColor }}
        >
            {jobTypeLabel}
        </Badge>
        {feedName && (
            <Badge
                className="text-xs font-semibold px-3 py-1.5 rounded-sm uppercase border border-gray-300 bg-white text-gray-600"
            >
                {feedName}
            </Badge>
        )}
    </div>
    {/* ... rest of header ... */}
```

Full updated `CardHeader` block:

```typescript
<CardHeader className="pb-4 !px-6 !pt-6">
    <div className="mb-6 flex flex-wrap gap-2 items-center">
        <Badge
            className="text-white text-xs font-semibold px-3 py-1.5 rounded-sm uppercase border-0"
            style={{ backgroundColor: badgeBgColor }}
        >
            {jobTypeLabel}
        </Badge>
        {feedName && (
            <Badge className="text-xs font-semibold px-3 py-1.5 rounded-sm uppercase border border-gray-300 bg-white text-gray-600">
                {feedName}
            </Badge>
        )}
    </div>

    {dateTimeString && (
        <div className="text-lg font-medium text-gray-900 mb-3 leading-tight">
            {dateTimeString}
        </div>
    )}
</CardHeader>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/job-portal && npx tsc --noEmit 2>&1 | grep "JobCard" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/job-portal/components/JobCard.tsx
git commit -m "feat(job-portal): add source feed badge to JobCard for external jobs"
```

---

## Task 5: Fetch and merge external jobs in `JobsListWrapper`

**Files:**
- Modify: `apps/job-portal/components/JobsListWrapper.tsx`

- [ ] **Step 1: Import `useExternalJobsList`**

Add to the imports at the top of `JobsListWrapper.tsx`:

```typescript
import { useExternalJobsList } from "../hooks/useExternalJobs";
```

- [ ] **Step 2: Fetch external jobs for logged-in users**

After the existing `const { data: jobsData, isLoading, isError, error } = useJobs(debouncedShouldFetch);` line (around line 145), add:

```typescript
const { data: externalJobsData } = useExternalJobsList(!!hasValidToken);
```

- [ ] **Step 3: Merge external jobs into the processed jobs list**

Find the `activeJobs / allProcessedJobs` useMemo (around line 244) and add external job merging after `processedJobs` is determined:

```typescript
const { activeJobs, allProcessedJobs } = useMemo(() => {
    let processedJobs: JobWithStats[];

    if (debouncedShouldFetch && jobsData?.jobs && jobsData.jobs.length > 0 && !isError) {
        const now = new Date();
        processedJobs = jobsData.jobs.map((job: any) => {
            const expiresAt = new Date(job.offer_expires_at || job.offerExpiresAt);
            return {
                ...job,
                title: job.title,
                timeLeftDays: Math.max(0, differenceInDays(expiresAt, now)),
                timeLeftHour: Math.max(0, differenceInHours(expiresAt, now) % 24),
                created_at: job.created_at || job.createdAt,
                offer_expires_at: job.offer_expires_at || job.offerExpiresAt,
                starts_at: job.starts_at || job.startsAt,
                ends_at: job.ends_at || job.endsAt,
                salary: job.salary,
                salary_to: job.salary_to || job.salaryTo,
                salary_type: job.salary_type || job.salaryType,
            } as JobWithStats;
        });
        processedJobs = processedJobs.sort((a, b) => {
            const dateA = new Date(a.created_at ?? (a as { createdAt?: string }).createdAt ?? 0);
            const dateB = new Date(b.created_at ?? (b as { createdAt?: string }).createdAt ?? 0);
            return dateB.getTime() - dateA.getTime();
        });
    } else {
        processedJobs = initialPublicJobs;
    }

    // Merge external jobs for logged-in users
    if (hasValidToken && externalJobsData?.jobs?.length) {
        const internalIds = new Set(processedJobs.map((j) => j.id));
        const externalMapped: JobWithStats[] = externalJobsData.jobs.map((job: any) => ({
            id: job.id,
            description: job.description,
            title: job.title,
            term: typeof job.term === "string" ? job.term : undefined,
            status: typeof job.status === "string" ? job.status : "active",
            place: job.place,
            url: job.url,
            created_at: job.createdAt || job.created_at,
            isExternal: true,
            feedName: job.feedName || job.feed_name,
        }));
        const deduped = externalMapped.filter((j) => !internalIds.has(j.id));
        processedJobs = [...processedJobs, ...deduped].sort((a, b) => {
            const dateA = new Date((a as any).created_at || (a as any).createdAt || 0);
            const dateB = new Date((b as any).created_at || (b as any).createdAt || 0);
            return dateB.getTime() - dateA.getTime();
        });
    }

    const active = processedJobs.filter((job) => job.status === "active");
    return { activeJobs: active, allProcessedJobs: processedJobs };
}, [debouncedShouldFetch, jobsData, initialPublicJobs, isError, mounted, tokenRestored, userToken, isLoading, hasValidToken, externalJobsData]);
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd apps/job-portal && npx tsc --noEmit 2>&1 | grep "JobsListWrapper" | head -10
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/job-portal/components/JobsListWrapper.tsx
git commit -m "feat(job-portal): merge external jobs into main job list for logged-in users"
```

---

## Task 6: Extend `FeaturesCard` for external job CTA

**Files:**
- Modify: `apps/job-portal/components/FeaturesCard.tsx`

- [ ] **Step 1: Add `isExternal`, `externalUrl`, `feedName` to `FeaturesCardProps`**

Find `FeaturesCardProps` interface (around line 59) and add three fields:

```typescript
interface FeaturesCardProps {
    // ... existing fields ...
    isExternal?: boolean;
    externalUrl?: string;
    feedName?: string;
}
```

- [ ] **Step 2: Destructure new props in the function signature**

Find the `export default function FeaturesCard({` destructuring (around line 103) and add:

```typescript
    isExternal = false,
    externalUrl,
    feedName,
```

alongside the existing props.

- [ ] **Step 3: Add external CTA in the card footer (before closing `CardFooter`)**

Find the `!isInactive && (` block in `CardFooter` (around line 749). The external CTA should replace the apply/ignore buttons section when `isExternal` is true.

Find the inner `div` with `className="flex justify-between gap-4 w-full mt-4"` (around line 775) and wrap its contents conditionally:

```typescript
<div className="flex justify-between gap-4 w-full mt-4">
    {isExternal ? (
        <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full"
            onClick={() => {
                if (typeof window !== "undefined" && (window as any).gtag) {
                    (window as any).gtag("event", "external_job_click", {
                        job_id: id,
                        feed_name: feedName ?? "external",
                    });
                }
            }}
        >
            <Button
                variant="default"
                size="lg"
                className="uppercase w-full"
            >
                Reagovat na {feedName ?? "externím webu"}
            </Button>
        </a>
    ) : (
        /* existing apply/ignore button logic unchanged */
        currentApplicationStatus === "applied" ? (
            // ... existing JSX ...
        ) : currentApplicationStatus === "rejected" ? (
            // ... existing JSX ...
        ) : (
            // ... existing JSX ...
        )
    )}
</div>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd apps/job-portal && npx tsc --noEmit 2>&1 | grep "FeaturesCard" | head -10
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/job-portal/components/FeaturesCard.tsx
git commit -m "feat(job-portal): add external CTA with GA tracking to FeaturesCard"
```

---

## Task 7: Extend detail page to fall back to external job

**Files:**
- Modify: `apps/job-portal/app/jobs/detail/[id]/page.tsx`

- [ ] **Step 1: Import `fetchExternalJobById`**

Add to the imports at the top:

```typescript
import { fetchExternalJobById } from "../../../../lib/migratedQueries";
```

- [ ] **Step 2: Add `getExternalJobDetail` function**

Add below the existing `getJobDetailCached` definition (around line 172):

```typescript
async function getExternalJobDetail(id: string) {
    const jobId = Number(id);
    if (isNaN(jobId) || jobId <= 0 || !Number.isInteger(jobId)) return null;
    try {
        const job = await fetchExternalJobById(jobId);
        if (!job) return null;
        return {
            job: job as any,
            isExternal: true,
            externalUrl: (job as any).url as string,
            feedName: (job as any).feedName || (job as any).feed_name,
        };
    } catch {
        return null;
    }
}
```

- [ ] **Step 3: Fall back to external in `getJobDetail`**

The existing `getJobDetail` function returns `null` when the public job isn't found. Add the fallback before returning `null`:

In the `getJobDetail` function, change the final `return null` at the catch block to:

Actually, `getJobDetail` returns `null` on catch. Since external jobs are protected (need auth), we can't fetch them server-side from `getJobDetail` which runs outside `withAuthContext`. Instead, detect the fallback in `JobDetailPage` where `withAuthContext` is available:

In `JobDetailPage` (around line 478), after `jobDetail = await getJobDetailCached(id)`:

```typescript
let jobDetail;
let isExternalJob = false;
let externalJobExtra: { externalUrl: string; feedName: string } | null = null;

try {
    jobDetail = await getJobDetailCached(id);
} catch (e) {
    if (e instanceof JobLoadNetworkError) {
        return (/* existing network error JSX */);
    }
    throw e;
}

// If not found as internal job, try external
if (!jobDetail) {
    const externalDetail = await getExternalJobDetail(id);
    if (externalDetail) {
        jobDetail = {
            job: externalDetail.job,
            stats: {},
            title: externalDetail.job.title || "",
            timeLeftDays: 0,
            timeLeftHour: 0,
            applicationStatus: null,
        };
        isExternalJob = true;
        externalJobExtra = {
            externalUrl: externalDetail.externalUrl,
            feedName: externalDetail.feedName,
        };
    }
}

if (!jobDetail) {
    notFound();
}
```

- [ ] **Step 4: Pass external props to `FeaturesCard` via `JobDetailNavAndContent`**

Add `isExternal`, `externalUrl`, `feedName` props to `JobDetailNavAndContent` component interface and render call:

In the `JobDetailNavAndContent` function signature (around line 230), add:
```typescript
    isExternal?: boolean;
    externalUrl?: string;
    feedName?: string;
```

And pass them through to `FeaturesCard`:
```typescript
<FeaturesCard
    // ... existing props ...
    isExternal={isExternal}
    externalUrl={externalUrl}
    feedName={feedName}
/>
```

In the `JobDetailPage` render, pass them to `JobDetailNavAndContent`:
```typescript
<JobDetailNavAndContent
    // ... existing props ...
    isExternal={isExternalJob}
    externalUrl={externalJobExtra?.externalUrl}
    feedName={externalJobExtra?.feedName}
/>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd apps/job-portal && npx tsc --noEmit 2>&1 | grep "detail/\[id\]" | head -10
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/job-portal/app/jobs/detail/[id]/page.tsx
git commit -m "feat(job-portal): fall back to external job in detail page when internal 404s"
```

---

## Task 8: Fix `MyJobsList` — add `feedName`, fix key

**Files:**
- Modify: `apps/job-portal/components/MyJobs/MyJobsList.tsx`

- [ ] **Step 1: Add `feedName` to the merged external job object**

Find the external job merge block in `allJobs` useMemo (around line 116-130) and add `feedName`:

```typescript
jobs.push({
    id: job.id,
    description: job.description,
    title: job.title,
    url: job.url,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    term: typeof job.term === "string" ? job.term : undefined,
    status: typeof job.status === "string" ? job.status : undefined,
    isExternal: true,
    feedName: (job as any).feedName || (job as any).feed_name,   // ← add
    applicationsStats: { status: externalJobApplicationStatus },
});
```

Also extend the local `JobWithStats` interface at the top of the file:

```typescript
interface JobWithStats extends JobLike {
    title?: string;
    applicationsStats?: any;
    stats?: any;
    isExternal?: boolean;
    feedName?: string;    // ← add
}
```

- [ ] **Step 2: Fix unique key in the render to prevent ID collision**

Find the `displayedItems.map` in the render (around line 260):

```typescript
{displayedItems.map((job) => (
    <JobCard
        key={job.isExternal ? `ext-${job.id}` : job.id}
        job={job}
        {...(showInactive && { isInactive: true })}
    />
))}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/job-portal && npx tsc --noEmit 2>&1 | grep "MyJobsList" | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/job-portal/components/MyJobs/MyJobsList.tsx
git commit -m "feat(job-portal): add feedName + fix unique key for external jobs in MyJobsList"
```

---

## Task 9: Full TypeScript check + dev smoke test

- [ ] **Step 1: Full type check**

```bash
cd apps/job-portal && npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors.

- [ ] **Step 2: Start dev server and verify**

```bash
cd apps/job-portal && npm run dev
```

Check in browser:
1. `/jobs` — external job cards appear with source badge (StartupJobs / Grafton) for logged-in users
2. Click an external job card → `/jobs/detail/[id]` loads, shows "Reagovat na StartupJobs" CTA
3. Click CTA → new tab opens to external URL; GA event fires (check Network tab for `google-analytics` requests)
4. `/my-jobs` applied/ignored tabs — external jobs appear alongside internal jobs with source badge

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(job-portal): external jobs integration complete"
```

import type { components } from "./generated";

type Primitive = string | number | boolean | bigint | symbol | null | undefined;

type SnakeToCamel<S extends string> = S extends `${infer Head}_${infer Tail}`
    ? `${Head}${Capitalize<SnakeToCamel<Tail>>}`
    : S;

export type CamelizeDeep<T> =
    T extends Primitive
        ? T
        : T extends Date
            ? T
            : T extends Array<infer U>
                ? CamelizeDeep<U>[]
                : T extends Record<string, unknown>
                    ? {
                        [K in keyof T as K extends string ? SnakeToCamel<K> : K]: CamelizeDeep<T[K]>;
                    }
                    : T;

type Schemas = components["schemas"];

export type ProfileResponse = CamelizeDeep<Schemas["MeProfileResponseDto"]>;
export type ProfileData = ProfileResponse["data"];

export type PublicJobsResponse = CamelizeDeep<Schemas["PublicJobsListResponseDto"]>;
export type PublicJobDetailResponse = CamelizeDeep<Schemas["PublicJobDetailResponseDto"]>;
export type PublicJob = PublicJobsResponse["jobs"][number];
export type PublicJobDetail = PublicJobDetailResponse["data"];
export type JobStats = PublicJobsResponse["stats"][number];

export type AvailableJobsResponse = CamelizeDeep<Schemas["AvailableJobsListResponseDto"]>;
export type AvailableJob = AvailableJobsResponse["jobs"][number];

export type ExternalJobsResponse = CamelizeDeep<Schemas["ExternalJobsListResponseDto"]>;
export type ExternalJob = ExternalJobsResponse["jobs"][number];

export type MyApplicationsResponse = CamelizeDeep<Schemas["MyApplicationsListResponseDto"]>;
export type MyApplication = MyApplicationsResponse["applications"][number];
export type MyApplicationJob = MyApplicationsResponse["jobs"][number];

export type CompaniesResponse = CamelizeDeep<Schemas["CompaniesLookupResponseDto"]>;
export type CompanyLookup = CompaniesResponse["companies"][number];

export type CompanyDetailResponse = CamelizeDeep<Schemas["CompanyDetailResponseDto"]>;

export type SchoolsResponse = CamelizeDeep<Schemas["SchoolsLookupResponseDto"]>;
export type SchoolLookup = SchoolsResponse["schools"][number];

export type FacultiesResponse = CamelizeDeep<Schemas["FacultiesLookupResponseDto"]>;
export type FacultyLookup = FacultiesResponse["faculties"][number];

export const JOB_TERMS = ["one_time", "long_term", "full_time"] as const;
export type JobTerm = (typeof JOB_TERMS)[number];

type JobIdentity = Pick<AvailableJob, "id" | "description"> & Partial<Pick<
    AvailableJob,
    | "salary"
    | "salaryTo"
    | "startsAt"
    | "endsAt"
    | "createdAt"
    | "updatedAt"
    | "offerExpiresAt"
    | "benefits"
    | "place"
    | "url"
    | "ctaText"
    | "doesStartImmediately"
>>;

export type JobLike = JobIdentity & {
    author?: PublicJob["author"] | null;
    term?: JobTerm | string | null;
    status?: string | Record<string, never> | null;
    salaryType?: string | Record<string, never> | null;
    requirements?: string[] | Record<string, never> | null;
    timePeriod?: string | Record<string, never> | null;
    timeFlexibility?: string | Record<string, never> | null;
};

# Admin Backend KPI Routes

Tento dokument popisuje backend endpointy, které admin potřebuje pro přesné KPI bez klientského dopočítávání nad list response. Aktuální admin umí některé metriky odhadnout z `/v1/jobs`, `/admin/feedback`, `/v1/companies` a `/v1/schools`, ale chybí backend agregace za období, nové registrace, návštěvnost za období a globální aplikační funnel.

## Obecná pravidla

- Všechny route jsou admin-only a musí používat stejný auth model jako `/admin/me`.
- Prefix: `/admin/kpis`.
- Každý endpoint musí podporovat `from`, `to` a `timezone`; default bez parametrů je posledních 30 dní v `Europe/Prague`.
- `from` je inclusive, `to` je exclusive.
- Každá odpověď vrací `meta.generatedAt`, `meta.range`, `meta.timezone` a `meta.cacheTtlSeconds`.
- Backend má agregovat server-side. Frontend nemá stránkovat přes kandidáty, joby nebo aplikace a počítat KPI sám.
- Žádné PII v KPI odpovědích, pokud endpoint není výslovně detailní audit. Pro dashboard stačí ID, názvy jobů/firem a agregované počty.
- Cílová latence pro dashboard endpointy: p95 do 500 ms při běžném rozsahu 30 dní.
- Dotazy musí používat indexované sloupce pro časová okna a join/filter pole.

Společné query parametry:

```http
from=2026-04-01T00:00:00.000Z
to=2026-05-01T00:00:00.000Z
timezone=Europe/Prague
compare=previous_period
```

`compare=previous_period` vrací pro každou hlavní metriku i `previousValue` a `deltaPercent`.

## MVP Routes

### `GET /admin/kpis/overview`

Jeden agregovaný dashboard snapshot pro první obrazovku adminu.

Poskytuje:

- nové joby za období
- aktivní joby k `to`
- job visits za období
- unique visitors za období, pokud jsou dostupní
- apply/application count za období
- accepted/rejected/ignored count za období
- noví kandidáti/registrace za období
- dokončené profily za období
- nové firmy za období
- průměrný feedback rating za období
- low feedback count `rating <= 2`
- počty rizik: expired jobs, expiring in 7 days, zero-visit jobs, zero-apply jobs

Response shape:

```json
{
  "data": {
    "jobsCreated": { "value": 128, "previousValue": 96, "deltaPercent": 33.3 },
    "activeJobs": { "value": 412 },
    "jobVisits": { "value": 18420, "previousValue": 15120, "deltaPercent": 21.8 },
    "uniqueJobVisitors": { "value": 9320, "isEstimated": false },
    "applicationsCreated": { "value": 2380, "previousValue": 2010, "deltaPercent": 18.4 },
    "applicationsAccepted": { "value": 420 },
    "applicationsRejected": { "value": 180 },
    "applicationsIgnored": { "value": 260 },
    "candidateRegistrations": { "value": 740, "previousValue": 690, "deltaPercent": 7.2 },
    "completedCandidateProfiles": { "value": 510 },
    "companiesCreated": { "value": 34 },
    "feedbackAverageRating": { "value": 4.2 },
    "feedbackLowRatings": { "value": 9 },
    "riskJobs": {
      "expired": 18,
      "expiringIn7Days": 41,
      "withoutVisits": 52,
      "withoutApplications": 77
    }
  },
  "meta": {
    "range": { "from": "2026-04-01T00:00:00.000Z", "to": "2026-05-01T00:00:00.000Z" },
    "timezone": "Europe/Prague",
    "generatedAt": "2026-05-01T00:02:10.000Z",
    "cacheTtlSeconds": 300
  }
}
```

### `GET /admin/kpis/jobs`

Agregace jobů pro grafy, term/status breakdown a kvalitu nabídky.

Query:

```http
groupBy=day|week|month
term=one_time,long_term,full_time
```

Poskytuje:

- time series nových jobů
- time series aktivních jobů
- breakdown podle `term`
- breakdown podle statusu
- mzda: median, p25, p75 podle termu
- počet jobů s chybějící lokací, salary nebo CTA URL
- počet banned/not relevant jobů

Response shape:

```json
{
  "data": {
    "series": [
      { "bucket": "2026-04-01", "created": 12, "active": 388, "expired": 4 }
    ],
    "byTerm": [
      { "term": "one_time", "created": 72, "active": 190, "medianSalary": 180, "p25Salary": 150, "p75Salary": 220 }
    ],
    "byStatus": [
      { "status": "active", "count": 340 },
      { "status": "expired", "count": 38 }
    ],
    "quality": {
      "missingLocation": 3,
      "missingSalary": 0,
      "missingCtaUrl": 86,
      "banned": 4,
      "notRelevant": 11
    }
  },
  "meta": { "range": {}, "timezone": "Europe/Prague", "generatedAt": "", "cacheTtlSeconds": 300 }
}
```

### `GET /admin/kpis/jobs/performance`

Top/risk joby pro operativní zásah. Tento endpoint nahrazuje klientské řazení nad `/v1/jobs`.

Query:

```http
limit=10
sort=visits|applications|conversion|risk
direction=desc
```

Poskytuje:

- top visited jobs za období
- top applied jobs za období
- joby s vysokými visits a nízkou konverzí
- joby bez visits
- joby bez applications
- expirované/expirující joby

Response shape:

```json
{
  "data": {
    "topVisited": [
      { "jobId": 123, "title": "Promo akce", "companyName": "Acme", "visits": 840, "applications": 42, "conversionRate": 0.05 }
    ],
    "topApplications": [
      { "jobId": 456, "title": "Recepce", "companyName": "Hotel Praha", "visits": 610, "applications": 88, "conversionRate": 0.144 }
    ],
    "riskJobs": [
      {
        "jobId": 789,
        "title": "Skladová výpomoc",
        "companyName": "Logistics CZ",
        "reasons": ["high_visits_low_conversion", "expires_soon"],
        "visits": 520,
        "applications": 3,
        "conversionRate": 0.0058,
        "offerExpiresAt": "2026-05-04T00:00:00.000Z"
      }
    ]
  },
  "meta": { "range": {}, "timezone": "Europe/Prague", "generatedAt": "", "cacheTtlSeconds": 300 }
}
```

### `GET /admin/kpis/traffic`

Návštěvnost jobů za období. Aktuální OpenAPI nabízí jen lifetime `stats.jobVisits`; admin potřebuje date-range visits.

Query:

```http
groupBy=day|week|month
source=all|web|mobile|unknown
```

Poskytuje:

- visits za období
- unique visitors, pokud jsou trackovaní
- visits podle platformy/source
- visits podle job termu
- trend po dnech/týdnech

Response shape:

```json
{
  "data": {
    "totalVisits": 18420,
    "uniqueVisitors": 9320,
    "bySource": [
      { "source": "web", "visits": 12200 },
      { "source": "mobile", "visits": 5770 },
      { "source": "unknown", "visits": 450 }
    ],
    "byTerm": [
      { "term": "one_time", "visits": 9200 },
      { "term": "long_term", "visits": 6400 },
      { "term": "full_time", "visits": 2820 }
    ],
    "series": [
      { "bucket": "2026-04-01", "visits": 620, "uniqueVisitors": 410 }
    ]
  },
  "meta": { "range": {}, "timezone": "Europe/Prague", "generatedAt": "", "cacheTtlSeconds": 300 }
}
```

### `GET /admin/kpis/applications`

Globální application funnel. Nepoužívat current-user `/v1/my-applications`.

Query:

```http
groupBy=day|week|month
term=one_time,long_term,full_time
status=applied,accepted,rejected,ignored
```

Poskytuje:

- applications created za období
- status breakdown
- conversion visits -> applications, pokud jsou visits dostupné
- accepted rate
- rejected rate
- průměrný čas do reakce zaměstnavatele
- počty bez reakce po 24/72 hodinách

Response shape:

```json
{
  "data": {
    "created": 2380,
    "accepted": 420,
    "rejected": 180,
    "ignored": 260,
    "acceptedRate": 0.176,
    "rejectedRate": 0.075,
    "averageEmployerReactionHours": 18.6,
    "withoutEmployerReaction24h": 310,
    "withoutEmployerReaction72h": 82,
    "byStatus": [
      { "status": "applied", "count": 1520 },
      { "status": "accepted", "count": 420 }
    ],
    "series": [
      { "bucket": "2026-04-01", "created": 76, "accepted": 11, "rejected": 4, "ignored": 8 }
    ]
  },
  "meta": { "range": {}, "timezone": "Europe/Prague", "generatedAt": "", "cacheTtlSeconds": 300 }
}
```

### `GET /admin/kpis/candidates`

Registrace a kvalita kandidátských profilů bez PII.

Query:

```http
groupBy=day|week|month
schoolId=123
schoolType=1
```

Poskytuje:

- nové registrace za období
- aktivní kandidáti za období, pokud existuje aktivita/login/event
- dokončené profily
- profily s fotkou
- profily se školou
- profily se skills
- profily s oblastí/lokací
- registrations podle školy, typu školy, města, věkové skupiny a genderu

Response shape:

```json
{
  "data": {
    "registrations": 740,
    "activeCandidates": 390,
    "completedProfiles": 510,
    "profilesWithPhoto": 440,
    "profilesWithSchool": 610,
    "profilesWithSkills": 580,
    "profilesWithArea": 530,
    "completionRate": 0.689,
    "series": [
      { "bucket": "2026-04-01", "registrations": 24, "completedProfiles": 18 }
    ],
    "bySchoolType": [
      { "schoolType": 1, "registrations": 430 },
      { "schoolType": 2, "registrations": 210 }
    ],
    "byCity": [
      { "city": "Praha", "registrations": 210 },
      { "city": "Brno", "registrations": 96 }
    ],
    "byAgeGroup": [
      { "ageGroup": "18-20", "registrations": 180 },
      { "ageGroup": "21-25", "registrations": 320 }
    ]
  },
  "meta": { "range": {}, "timezone": "Europe/Prague", "generatedAt": "", "cacheTtlSeconds": 300 }
}
```

### `GET /admin/kpis/companies`

KPI pro firmy a kvalitu firemního katalogu.

Poskytuje:

- nové firmy za období
- firmy s aktivním jobem
- firmy bez aktivního jobu
- firmy bez loga/webu/kontaktu
- top firmy podle job visits
- top firmy podle applications
- firmy s nízkou konverzí

Response shape:

```json
{
  "data": {
    "created": 34,
    "withActiveJob": 128,
    "withoutActiveJob": 320,
    "missingLogo": 44,
    "missingWeb": 18,
    "missingContact": 29,
    "topByVisits": [
      { "companyId": 12, "companyName": "Acme", "activeJobs": 8, "visits": 3200, "applications": 180 }
    ],
    "lowConversion": [
      { "companyId": 18, "companyName": "Logistics CZ", "activeJobs": 5, "visits": 2100, "applications": 19, "conversionRate": 0.009 }
    ]
  },
  "meta": { "range": {}, "timezone": "Europe/Prague", "generatedAt": "", "cacheTtlSeconds": 300 }
}
```

### `GET /admin/kpis/feedback`

Agregace feedbacku za období. Nenahrazuje detailní `/admin/feedback` list.

Query:

```http
groupBy=day|week|month
```

Poskytuje:

- count feedbacků
- average rating
- low ratings `<= 2`
- high ratings `>= 4`
- time series ratingu
- poslední low-rating položky bez PII, maximálně s `feedbackId`, `createdAt`, `rating`, `messagePreview`

Response shape:

```json
{
  "data": {
    "count": 86,
    "averageRating": 4.2,
    "lowRatings": 9,
    "highRatings": 61,
    "series": [
      { "bucket": "2026-04-01", "count": 4, "averageRating": 4.5, "lowRatings": 0 }
    ],
    "latestLowRatings": [
      { "feedbackId": 921, "createdAt": "2026-04-21T12:34:00.000Z", "rating": 2, "messagePreview": "Notifikace mi přišla pozdě..." }
    ]
  },
  "meta": { "range": {}, "timezone": "Europe/Prague", "generatedAt": "", "cacheTtlSeconds": 300 }
}
```

## Phase 2 Routes

### `GET /admin/kpis/notifications`

Agregace push/email dispatchů.

Poskytuje:

- dispatch count
- recipients total
- success/failure count
- failure rate
- retry count
- top failed jobs/campaigns
- delivery trend po dnech

### `GET /admin/kpis/search`

Interní search/support aktivita.

Poskytuje:

- počet candidate search dotazů
- nejčastější filtry bez PII
- watchdog count
- active watchdog count
- watchdogs sent za období

### `GET /admin/kpis/data-quality`

Jednotný audit datové kvality napříč katalogy.

Poskytuje:

- jobs missing required operational fields
- companies missing content
- schools/faculties missing web/RID
- candidates with incomplete profiles
- stale stats count
- import/feed freshness

## Indexy a datové předpoklady

Backend bude pravděpodobně potřebovat indexy na:

- `jobs.created_at`
- `jobs.updated_at`
- `jobs.offer_expires_at`
- `jobs.term`
- `jobs.status`
- `job_visits.created_at`
- `job_visits.job_id`
- `applications.created_at`
- `applications.status`
- `applications.job_id`
- `applications.candidate_id`
- `users.created_at`
- `candidate_profiles.updated_at`
- `companies.created_at`
- `feedback.created_at`
- `feedback.rating`
- notification dispatch tabulky: `job_id`, `scheduled_at`, `status`

Pokud některá tabulka dnes nemá timestamp pro požadované období, backend má vracet metriku jako `null` a v odpovědi doplnit:

```json
{
  "isAvailable": false,
  "reason": "missing_source_timestamp"
}
```

To je lepší než vracet lifetime číslo jako údaj za období.

## Frontend Consumption

Admin dashboard by měl pro první obrazovku volat primárně:

```http
GET /admin/kpis/overview?from=<30d>&to=<now>&compare=previous_period
GET /admin/kpis/jobs/performance?from=<30d>&to=<now>&limit=10&sort=risk
```

Detailnější stránky mohou načítat:

```http
GET /admin/kpis/jobs
GET /admin/kpis/traffic
GET /admin/kpis/applications
GET /admin/kpis/candidates
GET /admin/kpis/companies
GET /admin/kpis/feedback
```

Tím se odstraní dnešní potřeba odhadovat KPI z list endpointů a zároveň se zabrání těžkým broad dotazům typu `/v1/candidates?showAll=true`.

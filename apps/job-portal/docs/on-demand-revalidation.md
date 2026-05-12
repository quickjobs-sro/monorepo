# On-demand revalidation pro job portal

Job portal používá ISR a Next Data Cache. Backend má po veřejných změnách zavolat revalidation endpoint, aby se veřejná data aktualizovala hned a nemusela čekat na fallback TTL.

Backend posílá pořád stejné payloady bez ohledu na to, jestli je konkrétní frontend route statická nebo dynamická. Frontend revaliduje tagy i pathy; u dynamických rout je hlavní garance čerstvosti Data Cache tag/TTL, u staticky generovaných rout se navíc invaliduje HTML ve Full Route Cache.

## Endpoint

```http
POST https://jobs.quickjobs.cz/api/revalidate
x-revalidate-secret: <REVALIDATE_SECRET>
content-type: application/json
```

`REVALIDATE_SECRET` musí být stejný server-only secret ve Vercelu pro `job-portal` a v backendu. Neposílat ho v query stringu ani ho nelogovat.

Endpoint je idempotentní. Volejte ho až po úspěšném commitu změny do databáze.

## Payloady

Firma:

```json
{
  "entity": "company",
  "action": "updated",
  "id": 123,
  "slug": "firma-slug",
  "oldSlug": "stary-slug"
}
```

Job:

```json
{
  "entity": "job",
  "action": "published",
  "id": 14413,
  "companyId": 123,
  "companySlug": "firma-slug"
}
```

Přesun jobu mezi firmami:

```json
{
  "entity": "job",
  "action": "updated",
  "id": 14413,
  "companyId": 123,
  "companySlug": "firma-slug",
  "oldCompanyId": 456,
  "oldCompanySlug": "puvodni-firma-slug"
}
```

Připojení uživatele ke company:

```json
{
  "entity": "company-user",
  "action": "connected",
  "companyId": 123,
  "companySlug": "firma-slug"
}
```

## Mapování backend akcí

| Backend akce | Poslat payload | Invaliduje |
| --- | --- | --- |
| Přidání firmy | `entity: "company"`, `action: "created"`, `id`, `slug` | `/companies`, `/companies/:slug`, tagy `companies-list`, `company-${id}` |
| Editace firmy | `entity: "company"`, `action: "updated"`, `id`, `slug`, volitelně `oldSlug` | `/companies`, aktuální a původní detail firmy, tagy `companies-list`, `company-${id}` |
| Publikace firmy | `entity: "company"`, `action: "published"`, `id`, `slug` | `/companies`, `/companies/:slug`, tagy `companies-list`, `company-${id}` |
| Skrytí/smazání firmy | `entity: "company"`, `action: "unpublished"` nebo `"deleted"`, `id`, `slug` | `/companies`, `/companies/:slug`, tagy `companies-list`, `company-${id}` |
| Vydání jobu | `entity: "job"`, `action: "published"`, `id`, `companyId`, `companySlug` | `/jobs`, `/jobs/detail/:id`, detail firmy, tagy `jobs-list`, `job-${id}`, `company-${companyId}` |
| Přidání jobu v draftu, pokud je veřejně vidět | `entity: "job"`, `action: "created"`, `id`, `companyId`, `companySlug` | `/jobs`, `/jobs/detail/:id`, `/companies/:companySlug`, tagy `jobs-list`, `job-${id}`, `company-${companyId}` |
| Editace jobu | `entity: "job"`, `action: "updated"`, `id`, `companyId`, `companySlug`, volitelně `oldCompanyId`, `oldCompanySlug` | `/jobs`, `/jobs/detail/:id`, `/companies/:companySlug`, volitelně `/companies/:oldCompanySlug`, tagy `jobs-list`, `job-${id}`, `company-${companyId}`, volitelně `company-${oldCompanyId}` |
| Stažení nebo smazání jobu | `entity: "job"`, `action: "unpublished"` nebo `"deleted"`, `id`, `companyId`, `companySlug` | `/jobs`, `/jobs/detail/:id`, `/companies/:companySlug`, tagy `jobs-list`, `job-${id}`, `company-${companyId}` |
| Připojení/odpojení usera ke company | `entity: "company-user"`, `action: "connected"` nebo `"disconnected"`, `companyId`, `companySlug` | `/companies/:companySlug`, tag `company-${companyId}` |

`id` a `slug` jsou povinné u company eventů. `companyId` a `companySlug` jsou povinné u job a company-user eventů. Pokud se job přesouvá mezi firmami, pošlete také `oldCompanyId` společně s `oldCompanySlug`.

Neúplná dvojice, například `companySlug` bez `companyId` nebo `oldCompanyId` bez `oldCompanySlug`, vrátí `400`.

Backend nemá řešit, jestli je path aktuálně statická nebo dynamická. Vždy pošlete uvedený payload; frontend podle něj zavolá `revalidateTag` a `revalidatePath`.

## Response

Úspěch:

```json
{
  "revalidated": true,
  "tags": ["jobs-list", "job-14413", "company-123"],
  "paths": ["/jobs", "/jobs/detail/14413", "/companies/firma-slug"],
  "warnings": []
}
```

Chyby:

- `401` - chybí nebo nesedí `x-revalidate-secret`
- `400` - nevalidní JSON nebo payload
- `500` - chyba při revalidaci na job portalu

## Retry pravidla

- Timeout backend requestu nastavte přibližně na `5s`.
- Při `5xx` nebo network chybě retry 2-3x s krátkým backoffem.
- Při `400` nebo `401` neretryovat; je potřeba opravit payload nebo secret.
- DB změnu kvůli revalidation chybě nerollbackovat. Job portal má fallback TTL: company list data 60s, company detail route HTML 60s, company detail data 300s, jobs list route/data 60s, job detail data 300s. `/companies` HTML je v aktuálním buildu dynamické kvůli `searchParams`; job detail HTML je dynamické kvůli auth/application-status části stránky.

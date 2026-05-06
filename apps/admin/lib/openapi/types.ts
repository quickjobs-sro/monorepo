import type { components } from "./generated";

type Primitive = string | number | boolean | bigint | symbol | null | undefined;

type SnakeToCamel<S extends string> = S extends `${infer Head}_${infer Tail}`
  ? `${Head}${Capitalize<SnakeToCamel<Tail>>}`
  : S;

export type CamelizeDeep<T> = T extends Primitive
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

export type AdminPasswordLoginRequest = CamelizeDeep<Schemas["AdminPasswordLoginRequestDto"]>;
export type AdminChangePasswordRequest = CamelizeDeep<Schemas["AdminChangePasswordRequestDto"]>;
export type AdminTokenPairResponse = CamelizeDeep<Schemas["AdminTokenPairResponseDto"]>;
export type AdminMeResponse = CamelizeDeep<Schemas["AdminMeResponseDto"]>;
export type AdminSessionUser = AdminMeResponse["user"];

export type AdminFeedbackResponse = CamelizeDeep<Schemas["AdminFeedbackResponseDto"]>;
export type AdminFeedbackItem = AdminFeedbackResponse["feedback"][number];

export type PublicJobsResponse = CamelizeDeep<Schemas["PublicJobsListResponseDto"]>;
export type PublicJobDetailResponse = CamelizeDeep<Schemas["PublicJobDetailResponseDto"]>;
export type PublicJob = PublicJobsResponse["jobs"][number];
export type PublicJobStats = PublicJobsResponse["stats"][number];

export type CompaniesResponse = CamelizeDeep<Schemas["CompaniesLookupResponseDto"]>;
export type CompanyLookup = CompaniesResponse["companies"][number];
export type CompanyDetailResponse = CamelizeDeep<Schemas["CompanyDetailResponseDto"]>;

export type SchoolsResponse = CamelizeDeep<Schemas["SchoolsLookupResponseDto"]>;
export type SchoolLookup = SchoolsResponse["schools"][number];
export type SchoolDetail = CamelizeDeep<Schemas["SchoolDto"]>;

export type FacultiesResponse = CamelizeDeep<Schemas["FacultiesLookupResponseDto"]>;
export type FacultyDetail = CamelizeDeep<Schemas["FacultyDto"]>;
export type FacultyLookup = FacultiesResponse["faculties"][number];

export type HealthResponse = {
  ok: boolean;
};

export const JOB_TERMS = ["one_time", "long_term", "full_time"] as const;
export type JobTerm = (typeof JOB_TERMS)[number];

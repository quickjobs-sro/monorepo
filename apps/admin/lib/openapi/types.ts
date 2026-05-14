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
            [K in keyof T as K extends string
              ? SnakeToCamel<K>
              : K]: CamelizeDeep<T[K]>;
          }
        : T;

type Schemas = components["schemas"];

export type AdminPasswordLoginRequest = CamelizeDeep<
  Schemas["AdminPasswordLoginRequestDto"]
>;
export type AdminChangePasswordRequest = CamelizeDeep<
  Schemas["AdminChangePasswordRequestDto"]
>;
export type AdminTokenPairResponse = CamelizeDeep<
  Schemas["AdminTokenPairResponseDto"]
>;
export type AdminMeResponse = CamelizeDeep<Schemas["AdminMeResponseDto"]>;
export type AdminSessionUser = AdminMeResponse["user"];

export type AdminFeedbackResponse = CamelizeDeep<
  Schemas["AdminFeedbackResponseDto"]
>;
export type AdminFeedbackItem = AdminFeedbackResponse["feedback"][number];

export type PublicJobsResponse = CamelizeDeep<
  Schemas["PublicJobsListResponseDto"]
>;
export type PublicJobDetailResponse = CamelizeDeep<
  Schemas["PublicJobDetailResponseDto"]
>;
export type PublicJob = PublicJobsResponse["jobs"][number];
export type PublicJobStats = PublicJobsResponse["stats"][number];

export type CanonicalJobsResponse = CamelizeDeep<
  Schemas["CanonicalJobsListResponseDto"]
>;
export type CanonicalJobDetailResponse = CamelizeDeep<
  Schemas["CanonicalJobDetailResponseDto"]
>;
export type CanonicalJob = CanonicalJobsResponse["data"][number];
export type CanonicalJobStats = CanonicalJob["stats"];
export type JobDispatchesResponse = CamelizeDeep<
  Schemas["JobDispatchesResponseDto"]
>;
export type DispatchStatus = JobDispatchesResponse["dispatches"][number];

export type CanonicalExternalJobsResponse = CamelizeDeep<
  Schemas["CanonicalExternalJobsListResponseDto"]
>;
export type CanonicalExternalJobDetailResponse = CamelizeDeep<
  Schemas["CanonicalExternalJobDetailResponseDto"]
>;
export type CanonicalExternalJob =
  CanonicalExternalJobsResponse["data"][number];

export type CandidateSearchResponse = CamelizeDeep<
  Schemas["CandidateSearchResponseDto"]
>;
export type Candidate = CandidateSearchResponse["users"][number];
export type CandidateWatchdog = CamelizeDeep<Schemas["CandidateWatchdogDto"]>;
export type CandidateSearchHistoryResponse = CamelizeDeep<
  Schemas["CandidateSearchHistoryResponseDto"]
>;
export type CandidateSearchHistoryItem =
  CandidateSearchHistoryResponse["items"][number];

export type CompaniesResponse = CamelizeDeep<
  Schemas["CompaniesLookupResponseDto"]
>;
export type CompanyLookup = CompaniesResponse["companies"][number];
export type CompanyDetailResponse = CamelizeDeep<
  Schemas["CompanyDetailResponseDto"]
>;
export type CompanyJobsResponse = CamelizeDeep<
  Schemas["CompanyJobsListResponseDto"]
>;

export type AdminCompaniesResponse = CamelizeDeep<
  Schemas["AdminCompaniesResponseDto"]
>;
export type AdminCompanyListItem = AdminCompaniesResponse["companies"][number];
export type AdminCompanyResponse = CamelizeDeep<
  Schemas["AdminCompanyResponseDto"]
>;
export type AdminCompany = AdminCompanyResponse["data"];
export type CreateAdminCompanyRequest = Schemas["CreateAdminCompanyDto"];
export type UpdateAdminCompanyRequest = Schemas["UpdateAdminCompanyDto"];
export type AdminCompanyUsersResponse = CamelizeDeep<
  Schemas["AdminCompanyUsersResponseDto"]
>;
export type AdminCompanyUser = AdminCompanyUsersResponse["users"][number];
export type AssignAdminCompanyUserRequest =
  Schemas["AssignAdminCompanyUserDto"];
export type AdminCompanyUserResponse = CamelizeDeep<
  Schemas["AdminCompanyUserResponseDto"]
>;
export type AdminCompanyCandidateSearchesResponse = CamelizeDeep<
  Schemas["AdminCompanyCandidateSearchesResponseDto"]
>;
export type AdminCompanyCandidateSearch =
  AdminCompanyCandidateSearchesResponse["candidateSearches"][number];
export type AdminCompanyOfferTypesResponse = CamelizeDeep<
  Schemas["AdminCompanyOfferTypesResponseDto"]
>;
export type AdminCompanyOfferType =
  AdminCompanyOfferTypesResponse["offerTypes"][number];

export type AdminUsersResponse = CamelizeDeep<Schemas["AdminUsersResponseDto"]>;
export type AdminUser = AdminUsersResponse["users"][number];
export type AdminUserResponse = CamelizeDeep<Schemas["AdminUserResponseDto"]>;
export type AdminUserDetailResponse = CamelizeDeep<
  Schemas["AdminUserDetailResponseDto"]
>;
export type AdminUserDetail = AdminUserDetailResponse["data"];
export type AdminUserAssignableRole = "candidate" | "employer";
export type CreateAdminUserRequest = Omit<
  Schemas["CreateAdminUserDto"],
  "roles"
> & {
  roles?: AdminUserAssignableRole[];
};
export type UpdateAdminUserRequest = Omit<
  Schemas["UpdateAdminUserDto"],
  "roles"
> & {
  roles?: AdminUserAssignableRole[];
};
export type AdminUserJobReactionsResponse = CamelizeDeep<
  Schemas["AdminUserJobReactionsResponseDto"]
>;
export type AdminUserJobReaction =
  AdminUserJobReactionsResponse["reactions"][number];
export type AdminUserJobsResponse = CamelizeDeep<
  Schemas["AdminUserJobsResponseDto"]
>;
export type AdminUserJob = AdminUserJobsResponse["jobs"][number];

export type SchoolsResponse = CamelizeDeep<Schemas["SchoolsLookupResponseDto"]>;
export type SchoolLookup = SchoolsResponse["schools"][number];
export type SchoolDetail = CamelizeDeep<Schemas["SchoolDto"]>;

export type FacultiesResponse = CamelizeDeep<
  Schemas["FacultiesLookupResponseDto"]
>;
export type FacultyDetail = CamelizeDeep<Schemas["FacultyDto"]>;
export type FacultyLookup = FacultiesResponse["faculties"][number];

export type HealthResponse = {
  ok: boolean;
};

export const JOB_TERMS = ["one_time", "long_term", "full_time"] as const;
export type JobTerm = (typeof JOB_TERMS)[number];

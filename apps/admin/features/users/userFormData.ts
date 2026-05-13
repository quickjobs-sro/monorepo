import type {
  AdminUser,
  AdminUserAssignableRole,
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
} from "@/lib/openapi/types";
import { getSafeExternalUrl } from "../companies/companyFormData";

export type UserFormValues = {
  givenName: string;
  familyName: string;
  email: string;
  telephone: string;
  gender: "" | "male" | "female";
  birthDate: string;
  companyName: string;
  description: string;
  skills: string;
  skillsLocked: boolean;
  enabled: boolean;
  hideProfile: boolean;
  userSource: string;
  platform: string;
  roles: AdminUserAssignableRole[];
  rolesLocked: boolean;
  companyId: string;
  hubspotLink: string;
};

type UserPayload = CreateAdminUserRequest & UpdateAdminUserRequest;

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function nullableCompanyId(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseSkills(value: string): string[] {
  return value
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
}

function formatSkills(skills: AdminUser["skills"]): string {
  return Array.isArray(skills) ? skills.filter((skill): skill is string => typeof skill === "string").join(", ") : "";
}

function hasStructuredSkills(skills: AdminUser["skills"]): boolean {
  return Boolean(skills) && !Array.isArray(skills);
}

function normalizeRole(role: string): AdminUserAssignableRole | null {
  if (role === "candidate" || role === "brigadier") {
    return "candidate";
  }

  if (role === "employer") {
    return "employer";
  }

  return null;
}

export function createEmptyUserFormValues(): UserFormValues {
  return {
    givenName: "",
    familyName: "",
    email: "",
    telephone: "",
    gender: "",
    birthDate: "",
    companyName: "",
    description: "",
    skills: "",
    skillsLocked: false,
    enabled: true,
    hideProfile: false,
    userSource: "",
    platform: "",
    roles: [],
    rolesLocked: false,
    companyId: "",
    hubspotLink: "",
  };
}

export function userToFormValues(user: AdminUser): UserFormValues {
  const normalizedRoles = Array.from(new Set(user.roles.map(normalizeRole)));

  return {
    givenName: user.givenName ?? "",
    familyName: user.familyName ?? "",
    email: user.email ?? "",
    telephone: user.phone ?? "",
    gender: user.gender ?? "",
    birthDate: user.birthDate ?? "",
    companyName: user.companyName ?? "",
    description: user.description ?? "",
    skills: formatSkills(user.skills),
    skillsLocked: hasStructuredSkills(user.skills),
    enabled: user.enabled,
    hideProfile: user.hideProfile,
    userSource: user.userSource ?? "",
    platform: user.platform ?? "",
    roles: normalizedRoles.filter((role): role is AdminUserAssignableRole => Boolean(role)),
    rolesLocked: normalizedRoles.some((role) => role === null),
    companyId: user.companyId == null ? "" : String(user.companyId),
    hubspotLink: user.hubspotLink ?? "",
  };
}

export function formValuesToUserPayload(values: UserFormValues): UserPayload {
  const payload: UserPayload = {
    givenName: nullableText(values.givenName),
    familyName: nullableText(values.familyName),
    email: nullableText(values.email),
    telephone: nullableText(values.telephone),
    gender: values.gender || null,
    birthDate: nullableText(values.birthDate),
    companyName: nullableText(values.companyName),
    description: nullableText(values.description),
    enabled: values.enabled,
    hideProfile: values.hideProfile,
    userSource: nullableText(values.userSource),
    platform: nullableText(values.platform),
    companyId: nullableCompanyId(values.companyId),
    hubspotLink: getSafeExternalUrl(values.hubspotLink),
  };

  if (!values.rolesLocked) {
    payload.roles = values.roles;
  }

  if (!values.skillsLocked) {
    payload.skills = parseSkills(values.skills);
  }

  return payload;
}

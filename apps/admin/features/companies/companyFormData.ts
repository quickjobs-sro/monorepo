import type {
  AdminCompany,
  CreateAdminCompanyRequest,
  UpdateAdminCompanyRequest,
} from "../../lib/openapi/types";

export type CompanyContactFormValue = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  photo: string;
  description: string;
};

export type CompanyWebsiteFormValue = {
  name: string;
  url: string;
  sortOrder: string;
};

export type CompanyFormValues = {
  name: string;
  ico: string;
  slug: string;
  web: string;
  hubspotLink: string;
  logo: string;
  location: string;
  shortDescription: string;
  paidUntil: string;
  sortOrder: string;
  contacts: CompanyContactFormValue[];
  websites: CompanyWebsiteFormValue[];
  offerTypeIds: number[];
  studentAudienceNotes: string[];
};

export type CompanySortOrderStats = {
  maxSortOrder: number | null;
  nextSortOrder: number;
};

type CompanyPayload = CreateAdminCompanyRequest & UpdateAdminCompanyRequest;

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function getSafeExternalUrl(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? trimmed : null;
  } catch {
    return null;
  }
}

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function optionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getCompanySortOrderHelpText(
  stats?: CompanySortOrderStats | null,
): string | null {
  if (!stats) {
    return null;
  }

  if (stats.maxSortOrder == null) {
    return "Zatím není nastavené žádné sort číslo. Doporučený start je 1.";
  }

  return `Nejvyšší aktuální sort číslo: ${stats.maxSortOrder}. Pro top pozici použij ${stats.nextSortOrder} nebo vyšší.`;
}

export function getCompanySortOrderAutoFillValue({
  autoFillSortOrder,
  currentSortOrder,
  sortOrderTouched,
  stats,
}: {
  autoFillSortOrder: boolean;
  currentSortOrder: string;
  sortOrderTouched: boolean;
  stats?: CompanySortOrderStats | null;
}): string | null {
  if (!autoFillSortOrder || !stats || sortOrderTouched || currentSortOrder.trim()) {
    return null;
  }

  return String(stats.nextSortOrder);
}

export function createEmptyContact(): CompanyContactFormValue {
  return {
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    photo: "",
    description: "",
  };
}

export function createEmptyWebsite(): CompanyWebsiteFormValue {
  return {
    name: "",
    url: "",
    sortOrder: "",
  };
}

export function createEmptyCompanyFormValues(): CompanyFormValues {
  return {
    name: "",
    ico: "",
    slug: "",
    web: "",
    hubspotLink: "",
    logo: "",
    location: "",
    shortDescription: "",
    paidUntil: "",
    sortOrder: "",
    contacts: [],
    websites: [],
    offerTypeIds: [],
    studentAudienceNotes: [],
  };
}

export function companyToFormValues(company: AdminCompany): CompanyFormValues {
  return {
    name: company.name,
    ico: company.ico ?? "",
    slug: company.slug ?? "",
    web: company.web ?? "",
    hubspotLink: company.hubspotLink ?? "",
    logo: company.logo ?? "",
    location: company.location ?? "",
    shortDescription: company.shortDescription ?? "",
    paidUntil: company.paidUntil ?? "",
    sortOrder: company.sortOrder == null ? "" : String(company.sortOrder),
    contacts: company.contacts.map((contact) => ({
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phone ?? "",
      email: contact.email ?? "",
      photo: contact.photo ?? "",
      description: contact.description ?? "",
    })),
    websites: [...company.websites]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((website) => ({
        name: website.name,
        url: website.url,
        sortOrder: String(website.sortOrder),
      })),
    offerTypeIds: company.companyOffers.map((offer) => offer.offerType.id),
    studentAudienceNotes: [...company.studentAudienceNotes]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((note) => note.text),
  };
}

export function formValuesToCompanyPayload(values: CompanyFormValues): CompanyPayload {
  return {
    name: values.name.trim(),
    ico: nullableText(values.ico),
    slug: nullableText(values.slug),
    web: getSafeExternalUrl(values.web),
    hubspot_link: getSafeExternalUrl(values.hubspotLink),
    logo: getSafeExternalUrl(values.logo),
    location: nullableText(values.location),
    short_description: nullableText(values.shortDescription),
    paid_until: nullableText(values.paidUntil),
    sort_order: optionalNumber(values.sortOrder),
    contacts: values.contacts
      .map((contact) => ({
        firstName: contact.firstName.trim(),
        lastName: contact.lastName.trim(),
        phone: nullableText(contact.phone),
        email: nullableText(contact.email),
        photo: getSafeExternalUrl(contact.photo),
        description: nullableText(contact.description),
      }))
      .filter((contact) => contact.firstName.length > 0 && contact.lastName.length > 0),
    websites: values.websites
      .map((website) => ({
        name: website.name.trim(),
        url: getSafeExternalUrl(website.url) ?? "",
        sortOrder: optionalNumber(website.sortOrder) ?? undefined,
      }))
      .filter((website) => website.name.length > 0 && website.url.length > 0),
    offerTypeIds: values.offerTypeIds,
    studentAudienceNotes: values.studentAudienceNotes.map(optionalText).filter((note): note is string => Boolean(note)),
  };
}

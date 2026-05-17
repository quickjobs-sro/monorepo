const assert = require("node:assert/strict");
const {
  companyToFormValues,
  createEmptyCompanyFormValues,
  formValuesToCompanyPayload,
  getCompanySortOrderAutoFillValue,
  getCompanySortOrderHelpText,
  getSafeExternalUrl,
} = require("./companyFormData");

const emptyValues = createEmptyCompanyFormValues();
assert.deepEqual(formValuesToCompanyPayload(emptyValues), {
  name: "",
  ico: null,
  slug: null,
  web: null,
  hubspot_link: null,
  logo: null,
  location: null,
  short_description: null,
  paid_until: null,
  sort_order: null,
  contacts: [],
  websites: [],
  offerTypeIds: [],
  studentAudienceNotes: [],
});

const payload = formValuesToCompanyPayload({
  ...emptyValues,
  name: "  QuickJobs  ",
  ico: " 12345678 ",
  slug: " quickjobs ",
  web: " https://quickjobs.cz ",
  hubspotLink: " https://app.hubspot.com/company/123 ",
  logo: " ",
  location: " Praha ",
  shortDescription: "  Studentské brigády  ",
  paidUntil: "2026-06-30",
  sortOrder: "12",
  contacts: [
    {
      firstName: " Jana ",
      lastName: " Nováková ",
      phone: " 777123456 ",
      email: " jana@example.com ",
      photo: "",
      description: " HR ",
    },
    {
      firstName: "Incomplete",
      lastName: "",
      phone: "",
      email: "",
      photo: "",
      description: "",
    },
  ],
  websites: [
    {
      name: " Kariéra ",
      url: " https://quickjobs.cz/kariera ",
      sortOrder: "2",
    },
    {
      name: "",
      url: "https://ignored.example",
      sortOrder: "",
    },
  ],
  offerTypeIds: [3, 1, 3],
  studentAudienceNotes: [" Studentům VŠ ", "", " Absolventům "],
});

assert.deepEqual(payload, {
  name: "QuickJobs",
  ico: "12345678",
  slug: "quickjobs",
  web: "https://quickjobs.cz",
  hubspot_link: "https://app.hubspot.com/company/123",
  logo: null,
  location: "Praha",
  short_description: "Studentské brigády",
  paid_until: "2026-06-30",
  sort_order: 12,
  contacts: [
    {
      firstName: "Jana",
      lastName: "Nováková",
      phone: "777123456",
      email: "jana@example.com",
      photo: null,
      description: "HR",
    },
  ],
  websites: [
    {
      name: "Kariéra",
      url: "https://quickjobs.cz/kariera",
      sortOrder: 2,
    },
  ],
  offerTypeIds: [3, 1, 3],
  studentAudienceNotes: ["Studentům VŠ", "Absolventům"],
});

const unsafePayload = formValuesToCompanyPayload({
  ...emptyValues,
  name: "Unsafe URLs",
  web: "javascript:alert(1)",
  hubspotLink: "data:text/html,<script>alert(1)</script>",
  logo: "ftp://example.com/logo.png",
  contacts: [
    {
      firstName: "Eva",
      lastName: "Bezpečná",
      phone: "",
      email: "",
      photo: "javascript:alert(1)",
      description: "",
    },
  ],
  websites: [
    {
      name: "Bad",
      url: "javascript:alert(1)",
      sortOrder: "",
    },
  ],
});

assert.equal(unsafePayload.web, null);
assert.equal(unsafePayload.hubspot_link, null);
assert.equal(unsafePayload.logo, null);
assert.equal(unsafePayload.contacts?.[0]?.photo, null);
assert.deepEqual(unsafePayload.websites, []);
assert.equal(getSafeExternalUrl("javascript:alert(1)"), null);
assert.equal(getSafeExternalUrl("https://quickjobs.cz/company"), "https://quickjobs.cz/company");

const formValues = companyToFormValues({
  id: 10,
  name: "QuickJobs",
  ico: "12345678",
  logo: null,
  shortDescription: "Studentské brigády",
  location: "Praha",
  paidUntil: "2026-06-30",
  sortOrder: 12,
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-02T10:00:00.000Z",
  slug: "quickjobs",
  web: "https://quickjobs.cz",
  hubspotLink: "https://app.hubspot.com/company/123",
  contacts: [
    {
      id: 1,
      firstName: "Jana",
      lastName: "Nováková",
      phone: null,
      email: "jana@example.com",
      photo: null,
      description: null,
      createdAt: "2026-05-01T10:00:00.000Z",
      updatedAt: "2026-05-02T10:00:00.000Z",
    },
  ],
  websites: [
    {
      id: 5,
      name: "Kariéra",
      url: "https://quickjobs.cz/kariera",
      sortOrder: 2,
    },
  ],
  companyOffers: [
    {
      id: 8,
      offerType: {
        id: 3,
        name: "Brigády",
      },
    },
  ],
  studentAudienceNotes: [
    {
      id: 2,
      textId: 7,
      text: "Absolventům",
      sortOrder: 2,
    },
    {
      id: 1,
      textId: 6,
      text: "Studentům VŠ",
      sortOrder: 1,
    },
  ],
});

assert.equal(formValues.name, "QuickJobs");
assert.equal(formValues.sortOrder, "12");
assert.equal(formValues.contacts[0]?.phone, "");
assert.deepEqual(formValues.offerTypeIds, [3]);
assert.deepEqual(formValues.studentAudienceNotes, ["Studentům VŠ", "Absolventům"]);

assert.equal(
  getCompanySortOrderHelpText({ maxSortOrder: 12, nextSortOrder: 13 }),
  "Nejvyšší aktuální sort číslo: 12. Pro top pozici použij 13 nebo vyšší.",
);
assert.equal(
  getCompanySortOrderHelpText({ maxSortOrder: null, nextSortOrder: 1 }),
  "Zatím není nastavené žádné sort číslo. Doporučený start je 1.",
);
assert.equal(getCompanySortOrderHelpText(undefined), null);

assert.equal(
  getCompanySortOrderAutoFillValue({
    autoFillSortOrder: true,
    currentSortOrder: "",
    sortOrderTouched: false,
    stats: { maxSortOrder: 12, nextSortOrder: 13 },
  }),
  "13",
);
assert.equal(
  getCompanySortOrderAutoFillValue({
    autoFillSortOrder: true,
    currentSortOrder: "",
    sortOrderTouched: true,
    stats: { maxSortOrder: 12, nextSortOrder: 13 },
  }),
  null,
);
assert.equal(
  getCompanySortOrderAutoFillValue({
    autoFillSortOrder: false,
    currentSortOrder: "",
    sortOrderTouched: false,
    stats: { maxSortOrder: 12, nextSortOrder: 13 },
  }),
  null,
);
assert.equal(
  getCompanySortOrderAutoFillValue({
    autoFillSortOrder: true,
    currentSortOrder: "5",
    sortOrderTouched: false,
    stats: { maxSortOrder: 12, nextSortOrder: 13 },
  }),
  null,
);

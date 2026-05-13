const assert = require("node:assert/strict");
const {
  createEmptyUserFormValues,
  formValuesToUserPayload,
  userToFormValues,
} = require("./userFormData");

const emptyValues = createEmptyUserFormValues();
assert.deepEqual(formValuesToUserPayload(emptyValues), {
  givenName: null,
  familyName: null,
  email: null,
  telephone: null,
  gender: null,
  birthDate: null,
  companyName: null,
  description: null,
  skills: [],
  enabled: true,
  hideProfile: false,
  userSource: null,
  platform: null,
  roles: [],
  companyId: null,
  hubspotLink: null,
});

const payload = formValuesToUserPayload({
  ...emptyValues,
  givenName: "  Jana  ",
  familyName: "  Nováková  ",
  email: " jana@example.com ",
  telephone: " 777123456 ",
  gender: "female",
  birthDate: "2001-03-04",
  companyName: " QuickJobs ",
  description: " HR kontakt ",
  skills: " React, TypeScript, React ",
  enabled: false,
  hideProfile: true,
  userSource: " admin ",
  platform: " web ",
  roles: ["candidate", "employer"],
  companyId: "42",
  hubspotLink: " https://app.hubspot.com/contact/123 ",
});

assert.deepEqual(payload, {
  givenName: "Jana",
  familyName: "Nováková",
  email: "jana@example.com",
  telephone: "777123456",
  gender: "female",
  birthDate: "2001-03-04",
  companyName: "QuickJobs",
  description: "HR kontakt",
  skills: ["React", "TypeScript", "React"],
  enabled: false,
  hideProfile: true,
  userSource: "admin",
  platform: "web",
  roles: ["candidate", "employer"],
  companyId: 42,
  hubspotLink: "https://app.hubspot.com/contact/123",
});

const unsafePayload = formValuesToUserPayload({
  ...emptyValues,
  hubspotLink: "javascript:alert(1)",
  companyId: "not-a-number",
});

assert.equal(unsafePayload.hubspotLink, null);
assert.equal(unsafePayload.companyId, null);

const formValues = userToFormValues({
  id: 10,
  givenName: "Jana",
  familyName: "Nováková",
  email: "jana@example.com",
  phone: "777123456",
  gender: "female",
  birthDate: "2001-03-04",
  companyName: "QuickJobs",
  description: "HR kontakt",
  roles: ["brigadier", "employer"],
  companyId: 42,
  company: {
    id: 42,
    name: "QuickJobs",
    slug: "quickjobs",
    web: "https://quickjobs.cz",
    hubspotLink: null,
  },
  hubspotLink: "https://app.hubspot.com/contact/123",
  enabled: true,
  sendNotification: true,
  hideProfile: false,
  platform: "web",
  userSource: "referral",
  deletedReason: null,
  deletedAt: null,
  candidateAccessTo: null,
  skills: ["React", "TypeScript"],
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-02T10:00:00.000Z",
});

assert.equal(formValues.telephone, "777123456");
assert.equal(formValues.companyId, "42");
assert.deepEqual(formValues.roles, ["candidate", "employer"]);
assert.equal(formValues.rolesLocked, false);
assert.equal(formValues.skills, "React, TypeScript");

const objectSkillsFormValues = userToFormValues({
  id: 12,
  givenName: "Structured",
  familyName: "Skills",
  email: "skills@example.com",
  phone: null,
  gender: null,
  birthDate: null,
  companyName: null,
  description: null,
  roles: ["brigadier", "candidate"],
  companyId: null,
  company: null,
  hubspotLink: null,
  enabled: true,
  sendNotification: true,
  hideProfile: false,
  platform: null,
  userSource: null,
  deletedReason: null,
  deletedAt: null,
  candidateAccessTo: null,
  skills: {
    frontend: ["React"],
  },
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-02T10:00:00.000Z",
});

assert.equal(objectSkillsFormValues.skills, "");
assert.equal(objectSkillsFormValues.skillsLocked, true);
assert.deepEqual(objectSkillsFormValues.roles, ["candidate"]);
assert.equal(Object.hasOwn(formValuesToUserPayload(objectSkillsFormValues), "skills"), false);

const rootFormValues = userToFormValues({
  id: 11,
  givenName: "Root",
  familyName: "User",
  email: "root@example.com",
  phone: null,
  gender: null,
  birthDate: null,
  companyName: null,
  description: null,
  roles: ["root", "employer"],
  companyId: null,
  company: null,
  hubspotLink: null,
  enabled: true,
  sendNotification: true,
  hideProfile: false,
  platform: null,
  userSource: null,
  deletedReason: null,
  deletedAt: null,
  candidateAccessTo: null,
  skills: null,
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-02T10:00:00.000Z",
});

assert.deepEqual(rootFormValues.roles, ["employer"]);
assert.equal(rootFormValues.rolesLocked, true);
assert.equal(Object.hasOwn(formValuesToUserPayload(rootFormValues), "roles"), false);

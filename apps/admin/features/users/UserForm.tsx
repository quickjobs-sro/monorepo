"use client";

/* eslint-disable no-unused-vars */
import { FormEvent, useEffect, useState } from "react";
import { Checkbox } from "@ui/components/core/checkbox";
import { Button } from "@ui/components/core/button";
import { Input } from "@ui/components/core/input";
import { Label } from "@ui/components/core/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/components/core/select";
import { Textarea } from "@ui/components/core/textarea";
import { CompanyPicker, type CompanyPickerSelection } from "../companies/CompanyPicker";
import type { UserFormValues } from "./userFormData";

type UserFormProps = {
  initialCompany: CompanyPickerSelection | null;
  initialValues: UserFormValues;
  isSubmitting?: boolean;
  onCancel?: () => void;
  onSubmit(values: UserFormValues): void;
  submitLabel: string;
};

const ROLE_OPTIONS = [
  { value: "candidate", label: "Candidate" },
  { value: "employer", label: "Employer" },
] as const;

export function UserForm({
  initialCompany,
  initialValues,
  isSubmitting = false,
  onCancel,
  onSubmit,
  submitLabel,
}: UserFormProps) {
  const [values, setValues] = useState(initialValues);
  const [selectedCompany, setSelectedCompany] = useState(initialCompany);

  useEffect(() => {
    setValues(initialValues);
    setSelectedCompany(initialCompany);
  }, [initialCompany, initialValues]);

  function setField<Key extends keyof UserFormValues>(key: Key, value: UserFormValues[Key]) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleCompanySelect(company: CompanyPickerSelection | null) {
    setSelectedCompany(company);
    setField("companyId", company ? String(company.id) : "");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 lg:grid-cols-3">
        <Input value={values.givenName} onChange={(event) => setField("givenName", event.target.value)} placeholder="Jméno" />
        <Input value={values.familyName} onChange={(event) => setField("familyName", event.target.value)} placeholder="Příjmení" />
        <Input value={values.email} onChange={(event) => setField("email", event.target.value)} placeholder="E-mail" type="email" />
        <Input value={values.telephone} onChange={(event) => setField("telephone", event.target.value)} placeholder="Telefon" />
        <Select value={values.gender || "none"} onValueChange={(value) => setField("gender", value === "none" ? "" : (value as UserFormValues["gender"]))}>
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Bez genderu</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="male">Male</SelectItem>
          </SelectContent>
        </Select>
        <Input value={values.birthDate} onChange={(event) => setField("birthDate", event.target.value)} placeholder="Datum narození" type="date" />
        <Input value={values.companyName} onChange={(event) => setField("companyName", event.target.value)} placeholder="Company name" />
        <Input value={values.userSource} onChange={(event) => setField("userSource", event.target.value)} placeholder="User source" />
        <Input value={values.platform} onChange={(event) => setField("platform", event.target.value)} placeholder="Platform" />
        <Input value={values.hubspotLink} onChange={(event) => setField("hubspotLink", event.target.value)} placeholder="HubSpot URL" type="url" />
        <Input
          value={values.skills}
          onChange={(event) => setField("skills", event.target.value)}
          placeholder="Skills CSV"
          disabled={values.skillsLocked}
        />
      </div>

      <CompanyPicker selectedCompany={selectedCompany} onSelect={handleCompanySelect} />

      <Textarea
        value={values.description}
        onChange={(event) => setField("description", event.target.value)}
        placeholder="Popis usera"
        rows={4}
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Label className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
          <Checkbox checked={values.enabled} onCheckedChange={(checked) => setField("enabled", checked === true)} />
          <span>Enabled</span>
        </Label>
        <Label className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
          <Checkbox checked={values.hideProfile} onCheckedChange={(checked) => setField("hideProfile", checked === true)} />
          <span>Hide profile</span>
        </Label>
        {ROLE_OPTIONS.map((role) => {
          const checked = values.roles.includes(role.value);
          return (
            <Label key={role.value} className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
              <Checkbox
                checked={checked}
                disabled={values.rolesLocked}
                onCheckedChange={(nextChecked) => {
                  setField(
                    "roles",
                    nextChecked === true ? [...values.roles, role.value] : values.roles.filter((value) => value !== role.value)
                  );
                }}
              />
              <span>{role.label}</span>
            </Label>
          );
        })}
      </section>
      {values.rolesLocked ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          User má roli, kterou tento endpoint neumí bezpečně přiřazovat. Role se při uložení nezmění.
        </p>
      ) : null}
      {values.skillsLocked ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          User má strukturované skills, které tento formulář neumí bezpečně upravit. Skills se při uložení nezmění.
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-3">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Zrušit
          </Button>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Ukládám..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

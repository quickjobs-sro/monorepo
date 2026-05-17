"use client";

/* eslint-disable no-unused-vars */
import { FormEvent, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@ui/components/core/button";
import { Checkbox } from "@ui/components/core/checkbox";
import { Input } from "@ui/components/core/input";
import { Label } from "@ui/components/core/label";
import { Textarea } from "@ui/components/core/textarea";
import type { AdminCompanyOfferType } from "../../lib/openapi/types";
import {
  type CompanyContactFormValue,
  type CompanyFormValues,
  type CompanySortOrderStats,
  type CompanyWebsiteFormValue,
  createEmptyContact,
  createEmptyWebsite,
  getCompanySortOrderAutoFillValue,
  getCompanySortOrderHelpText,
} from "./companyFormData";

type CompanyFormProps = {
  autoFillSortOrder?: boolean;
  initialValues: CompanyFormValues;
  isSubmitting?: boolean;
  offerTypes: AdminCompanyOfferType[];
  onCancel?: () => void;
  onSubmit(values: CompanyFormValues): void;
  sortOrderStats?: CompanySortOrderStats | null;
  submitLabel: string;
};

function updateAt<T>(items: T[], index: number, nextItem: T): T[] {
  return items.map((item, itemIndex) => (itemIndex === index ? nextItem : item));
}

function removeAt<T>(items: T[], index: number): T[] {
  return items.filter((_, itemIndex) => itemIndex !== index);
}

export function CompanyForm({
  autoFillSortOrder = false,
  initialValues,
  isSubmitting = false,
  offerTypes,
  onCancel,
  onSubmit,
  sortOrderStats,
  submitLabel,
}: CompanyFormProps) {
  const [values, setValues] = useState(initialValues);
  const [sortOrderTouched, setSortOrderTouched] = useState(false);

  useEffect(() => {
    setValues(initialValues);
    setSortOrderTouched(false);
  }, [initialValues]);

  useEffect(() => {
    const nextSortOrder = getCompanySortOrderAutoFillValue({
      autoFillSortOrder,
      currentSortOrder: values.sortOrder,
      sortOrderTouched,
      stats: sortOrderStats,
    });

    if (nextSortOrder == null) {
      return;
    }

    setValues((current) =>
      current.sortOrder.trim()
        ? current
        : {
            ...current,
            sortOrder: nextSortOrder,
          },
    );
  }, [autoFillSortOrder, sortOrderStats, sortOrderTouched, values.sortOrder]);

  function setField<Key extends keyof CompanyFormValues>(key: Key, value: CompanyFormValues[Key]) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function setContact(index: number, patch: Partial<CompanyContactFormValue>) {
    setValues((current) => ({
      ...current,
      contacts: updateAt(current.contacts, index, {
        ...(current.contacts[index] ?? createEmptyContact()),
        ...patch,
      }),
    }));
  }

  function setWebsite(index: number, patch: Partial<CompanyWebsiteFormValue>) {
    setValues((current) => ({
      ...current,
      websites: updateAt(current.websites, index, {
        ...(current.websites[index] ?? createEmptyWebsite()),
        ...patch,
      }),
    }));
  }

  function handleSortOrderChange(value: string) {
    setSortOrderTouched(true);
    setField("sortOrder", value);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(values);
  }

  const sortOrderHelpText = getCompanySortOrderHelpText(sortOrderStats);

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 lg:grid-cols-3">
        <Input
          value={values.name}
          onChange={(event) => setField("name", event.target.value)}
          placeholder="Název firmy"
          required
        />
        <Input value={values.ico} onChange={(event) => setField("ico", event.target.value)} placeholder="IČO" />
        <Input value={values.slug} onChange={(event) => setField("slug", event.target.value)} placeholder="Slug" />
        <Input value={values.web} onChange={(event) => setField("web", event.target.value)} placeholder="Web" type="url" />
        <Input
          value={values.hubspotLink}
          onChange={(event) => setField("hubspotLink", event.target.value)}
          placeholder="HubSpot URL"
          type="url"
        />
        <Input value={values.logo} onChange={(event) => setField("logo", event.target.value)} placeholder="Logo URL" />
        <Input value={values.location} onChange={(event) => setField("location", event.target.value)} placeholder="Lokace" />
        <Input
          value={values.paidUntil}
          onChange={(event) => setField("paidUntil", event.target.value)}
          placeholder="Paid until"
          type="date"
        />
        <div className="space-y-1">
          <Input
            value={values.sortOrder}
            onChange={(event) => handleSortOrderChange(event.target.value)}
            placeholder="Sort order"
            type="number"
          />
          {sortOrderHelpText ? (
            <p className="text-xs leading-5 text-slate-500">
              {sortOrderHelpText}
            </p>
          ) : null}
        </div>
      </div>

      <Textarea
        value={values.shortDescription}
        onChange={(event) => setField("shortDescription", event.target.value)}
        placeholder="Krátký veřejný popis"
        rows={4}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Kontakty</h3>
          <Button type="button" size="sm" variant="outline" onClick={() => setField("contacts", [...values.contacts, createEmptyContact()])}>
            <Plus className="h-4 w-4" />
            Přidat kontakt
          </Button>
        </div>
        {values.contacts.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">Bez kontaktů.</p>
        ) : (
          <div className="space-y-3">
            {values.contacts.map((contact, index) => (
              <div key={index} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 lg:grid-cols-3">
                <Input value={contact.firstName} onChange={(event) => setContact(index, { firstName: event.target.value })} placeholder="Jméno" />
                <Input value={contact.lastName} onChange={(event) => setContact(index, { lastName: event.target.value })} placeholder="Příjmení" />
                <Input value={contact.email} onChange={(event) => setContact(index, { email: event.target.value })} placeholder="E-mail" type="email" />
                <Input value={contact.phone} onChange={(event) => setContact(index, { phone: event.target.value })} placeholder="Telefon" />
                <Input value={contact.photo} onChange={(event) => setContact(index, { photo: event.target.value })} placeholder="Foto URL" />
                <div className="flex gap-2">
                  <Input
                    value={contact.description}
                    onChange={(event) => setContact(index, { description: event.target.value })}
                    placeholder="Popis"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Odebrat kontakt"
                    onClick={() => setField("contacts", removeAt(values.contacts, index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Weby</h3>
          <Button type="button" size="sm" variant="outline" onClick={() => setField("websites", [...values.websites, createEmptyWebsite()])}>
            <Plus className="h-4 w-4" />
            Přidat web
          </Button>
        </div>
        {values.websites.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">Bez dalších webů.</p>
        ) : (
          <div className="space-y-3">
            {values.websites.map((website, index) => (
              <div key={index} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[1fr_1.5fr_140px_auto]">
                <Input value={website.name} onChange={(event) => setWebsite(index, { name: event.target.value })} placeholder="Název" />
                <Input value={website.url} onChange={(event) => setWebsite(index, { url: event.target.value })} placeholder="URL" type="url" />
                <Input
                  value={website.sortOrder}
                  onChange={(event) => setWebsite(index, { sortOrder: event.target.value })}
                  placeholder="Pořadí"
                  type="number"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Odebrat web"
                  onClick={() => setField("websites", removeAt(values.websites, index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Offer typy</h3>
        {offerTypes.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">Offer typy nejsou načtené.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {offerTypes.map((offerType) => {
              const checked = values.offerTypeIds.includes(offerType.id);
              return (
                <Label key={offerType.id} className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(nextChecked) => {
                      setField(
                        "offerTypeIds",
                        nextChecked === true
                          ? [...values.offerTypeIds, offerType.id]
                          : values.offerTypeIds.filter((id) => id !== offerType.id)
                      );
                    }}
                  />
                  <span>{offerType.name}</span>
                </Label>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Audience notes</h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setField("studentAudienceNotes", [...values.studentAudienceNotes, ""])}
          >
            <Plus className="h-4 w-4" />
            Přidat poznámku
          </Button>
        </div>
        {values.studentAudienceNotes.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">Bez poznámek.</p>
        ) : (
          <div className="space-y-3">
            {values.studentAudienceNotes.map((note, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={note}
                  onChange={(event) => setField("studentAudienceNotes", updateAt(values.studentAudienceNotes, index, event.target.value))}
                  placeholder="Text poznámky"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Odebrat poznámku"
                  onClick={() => setField("studentAudienceNotes", removeAt(values.studentAudienceNotes, index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Zrušit
          </Button>
        ) : null}
        <Button type="submit" disabled={isSubmitting || !values.name.trim()}>
          {isSubmitting ? "Ukládám..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

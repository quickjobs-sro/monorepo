"use client";

/* eslint-disable no-unused-vars */
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronsUpDown, Search, UserRound, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@ui/components/core/button";
import { Input } from "@ui/components/core/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ui/components/core/popover";
import { getErrorMessage } from "@/lib/errors";
import { formatName } from "@/lib/formatting";
import type { AdminUser } from "@/lib/openapi/types";
import { fetchUsers, type UsersQueryParams } from "./api";
import { usersListQueryKey } from "./queries";
import {
  buildUserSearchQueryParams,
  canSearchUsers,
  normalizeUserSearchTerm,
  shouldEnableUserSearch,
  USER_SEARCH_DEBOUNCE_MS,
} from "./userSearchRules";

export type UserSearchSelection = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
};

type UserSearchSelectProps = {
  selectedUser: UserSearchSelection | null;
  onSelect(user: UserSearchSelection | null): void;
  placeholder?: string;
};

function toSelection(user: AdminUser): UserSearchSelection {
  const name = formatName([user.givenName, user.familyName]);
  return {
    id: user.id,
    name: name || user.email || `User #${user.id}`,
    email: user.email,
    phone: user.phone,
  };
}

export function UserSearchSelect({
  selectedUser,
  onSelect,
  placeholder = "Vyhledat usera",
}: UserSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(selectedUser?.name ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const keepSearchAfterSelectionClearRef = useRef(false);

  useEffect(() => {
    if (!selectedUser && keepSearchAfterSelectionClearRef.current) {
      keepSearchAfterSelectionClearRef.current = false;
      return;
    }

    setSearch(selectedUser?.name ?? "");
    setDebouncedSearch(selectedUser?.name ?? "");
  }, [selectedUser?.id, selectedUser?.name]);

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setDebouncedSearch(search),
      USER_SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const normalizedSearch = normalizeUserSearchTerm(debouncedSearch);
  const canSearch = canSearchUsers(normalizedSearch);
  const queryParams = useMemo<UsersQueryParams>(
    () => buildUserSearchQueryParams(debouncedSearch),
    [debouncedSearch],
  );
  const usersQuery = useQuery({
    queryKey: usersListQueryKey(queryParams),
    queryFn: () => fetchUsers(queryParams),
    enabled: shouldEnableUserSearch(open, debouncedSearch),
  });
  const users = usersQuery.data?.users ?? [];

  function handleSearchChange(value: string) {
    setSearch(value);

    if (
      selectedUser &&
      normalizeUserSearchTerm(value) !==
        normalizeUserSearchTerm(selectedUser.name)
    ) {
      keepSearchAfterSelectionClearRef.current = true;
      onSelect(null);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between bg-white text-left font-normal"
        >
          <span className="flex min-w-0 items-center gap-2">
            <UserRound className="h-4 w-4 shrink-0 text-emerald-700" />
            <span className="truncate">
              {selectedUser
                ? `${selectedUser.name} (#${selectedUser.id})`
                : placeholder}
            </span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(480px,calc(100vw-2rem))] p-3"
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Zadej aspoň 3 znaky jména, e-mailu nebo telefonu"
              className="pl-9"
            />
          </div>

          {selectedUser ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                keepSearchAfterSelectionClearRef.current = false;
                setSearch("");
                setDebouncedSearch("");
                onSelect(null);
                setOpen(false);
              }}
            >
              <X className="h-4 w-4" />
              Zrušit výběr
            </Button>
          ) : null}

          {!canSearch ? (
            <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
              Nabídka userů se načte po zadání minimálně 3 znaků.
            </p>
          ) : usersQuery.isLoading ? (
            <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
              Načítám usery...
            </p>
          ) : usersQuery.isError ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {getErrorMessage(usersQuery.error)}
            </p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {users.map((user) => {
                const selection = toSelection(user);
                const isSelected = selectedUser?.id === user.id;
                return (
                  <button
                    key={user.id}
                    type="button"
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                      isSelected
                        ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                        : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200"
                    }`}
                    onClick={() => {
                      onSelect(selection);
                      setOpen(false);
                    }}
                  >
                    <span className="block font-medium">{selection.name}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      ID {selection.id} · {selection.email ?? "bez e-mailu"} ·{" "}
                      {selection.phone ?? "bez telefonu"}
                    </span>
                  </button>
                );
              })}
              {users.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500">
                  Žádný user nenalezen.
                </p>
              ) : null}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

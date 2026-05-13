import type { Dispatch, FormEventHandler, SetStateAction } from "react";
import { Search } from "lucide-react";
import { Button } from "@ui/components/core/button";
import { Card, CardContent } from "@ui/components/core/card";
import { Checkbox } from "@ui/components/core/checkbox";
import { Input } from "@ui/components/core/input";
import { Label } from "@ui/components/core/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/components/core/select";
import type { CompanyAnalyticsView, JobAnalyticsView } from "./types";
import type { CompanyFilterDraft, JobFilterDraft } from "./config";

export function CompanyFilters({
  draft,
  onChange,
  onSubmit,
}: {
  draft: CompanyFilterDraft;
  onChange: Dispatch<SetStateAction<CompanyFilterDraft>>;
  onSubmit: FormEventHandler<HTMLFormElement>;
}) {
  function updateDraft<T extends keyof CompanyFilterDraft>(
    key: T,
    value: CompanyFilterDraft[T]
  ) {
    onChange((current) => ({ ...current, [key]: value }));
  }

  return (
    <Card className="border-white/80 bg-white/90">
      <CardContent className="space-y-4 p-6">
        <form className="grid gap-4 xl:grid-cols-[1fr_auto]" onSubmit={onSubmit}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Label className="space-y-2">
              <span>Pohled</span>
              <Select
                value={draft.view}
                onValueChange={(value) =>
                  updateDraft("view", value as CompanyAnalyticsView)
                }
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Vyber pohled" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="at_risk">Kombinované riziko</SelectItem>
                  <SelectItem value="no_recent_jobs">Bez nových jobů</SelectItem>
                  <SelectItem value="low_candidate_searches">
                    Nízké hledání kandidátů
                  </SelectItem>
                  <SelectItem value="no_assigned_users">
                    Bez přiřazeného CS
                  </SelectItem>
                </SelectContent>
              </Select>
            </Label>

            {draft.view === "at_risk" ? (
              <>
                <Label className="space-y-2">
                  <span>Bez jobu dnů</span>
                  <Input
                    min={1}
                    type="number"
                    value={draft.noRecentJobsDays}
                    onChange={(event) =>
                      updateDraft("noRecentJobsDays", event.target.value)
                    }
                  />
                </Label>
                <Label className="space-y-2">
                  <span>Okno hledání dnů</span>
                  <Input
                    min={1}
                    type="number"
                    value={draft.lowCandidateSearchesDays}
                    onChange={(event) =>
                      updateDraft("lowCandidateSearchesDays", event.target.value)
                    }
                  />
                </Label>
                <Label className="space-y-2">
                  <span>Min. hledání</span>
                  <Input
                    min={1}
                    type="number"
                    value={draft.minCandidateSearches}
                    onChange={(event) =>
                      updateDraft("minCandidateSearches", event.target.value)
                    }
                  />
                </Label>
              </>
            ) : null}

            {draft.view === "no_recent_jobs" ||
            draft.view === "low_candidate_searches" ? (
              <Label className="space-y-2">
                <span>Okno dnů</span>
                <Input
                  min={1}
                  type="number"
                  value={draft.days}
                  onChange={(event) => updateDraft("days", event.target.value)}
                />
              </Label>
            ) : null}

            {draft.view === "low_candidate_searches" ? (
              <Label className="space-y-2">
                <span>Min. hledání</span>
                  <Input
                    min={1}
                    type="number"
                  value={draft.minSearches}
                  onChange={(event) =>
                    updateDraft("minSearches", event.target.value)
                  }
                />
              </Label>
            ) : null}

            <Label className="space-y-2">
              <span>Limit</span>
              <Input
                max={100}
                min={1}
                type="number"
                value={draft.limit}
                onChange={(event) => updateDraft("limit", event.target.value)}
              />
            </Label>

            {draft.view === "at_risk" ? (
              <Label className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
                <Checkbox
                  checked={draft.noAssignedUsers}
                  onCheckedChange={(checked) =>
                    updateDraft("noAssignedUsers", checked === true)
                  }
                />
                <span>Vyžadovat firmu bez přiřazeného CS</span>
              </Label>
            ) : null}
          </div>

          <div className="flex items-end">
            <Button type="submit" className="w-full xl:w-auto">
              <Search className="h-4 w-4" />
              Použít filtry
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function JobFilters({
  draft,
  onChange,
  onSubmit,
}: {
  draft: JobFilterDraft;
  onChange: Dispatch<SetStateAction<JobFilterDraft>>;
  onSubmit: FormEventHandler<HTMLFormElement>;
}) {
  function updateDraft<T extends keyof JobFilterDraft>(
    key: T,
    value: JobFilterDraft[T]
  ) {
    onChange((current) => ({ ...current, [key]: value }));
  }

  return (
    <Card className="border-white/80 bg-white/90">
      <CardContent className="space-y-4 p-6">
        <form className="grid gap-4 xl:grid-cols-[1fr_auto]" onSubmit={onSubmit}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Label className="space-y-2">
              <span>Pohled</span>
              <Select
                value={draft.view}
                onValueChange={(value) =>
                  updateDraft("view", value as JobAnalyticsView)
                }
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Vyber pohled" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="underperforming">
                    Kombinovaně slabé
                  </SelectItem>
                  <SelectItem value="low_applications">Málo reakcí</SelectItem>
                  <SelectItem value="old_job">Staré aktivní joby</SelectItem>
                  <SelectItem value="low_detail_visits">
                    Nízké návštěvy detailu
                  </SelectItem>
                </SelectContent>
              </Select>
            </Label>

            {draft.view === "underperforming" ||
            draft.view === "low_applications" ? (
              <Label className="space-y-2">
                <span>Max. reakcí</span>
                <Input
                  min={1}
                  type="number"
                  value={draft.maxApplied}
                  onChange={(event) =>
                    updateDraft("maxApplied", event.target.value)
                  }
                />
              </Label>
            ) : null}

            {draft.view === "underperforming" || draft.view === "old_job" ? (
              <Label className="space-y-2">
                <span>Min. stáří dnů</span>
                <Input
                  min={1}
                  type="number"
                  value={draft.minAgeDays}
                  onChange={(event) =>
                    updateDraft("minAgeDays", event.target.value)
                  }
                />
              </Label>
            ) : null}

            {draft.view === "underperforming" ||
            draft.view === "low_detail_visits" ? (
              <Label className="space-y-2">
                <span>Max. detail visits</span>
                <Input
                  min={1}
                  type="number"
                  value={draft.maxDetailVisits}
                  onChange={(event) =>
                    updateDraft("maxDetailVisits", event.target.value)
                  }
                />
              </Label>
            ) : null}

            <Label className="space-y-2">
              <span>Limit</span>
              <Input
                max={100}
                min={1}
                type="number"
                value={draft.limit}
                onChange={(event) => updateDraft("limit", event.target.value)}
              />
            </Label>
          </div>

          <div className="flex items-end">
            <Button type="submit" className="w-full xl:w-auto">
              <Search className="h-4 w-4" />
              Použít filtry
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/crm/AppShell";
import { LeadDrawer } from "@/components/crm/LeadDrawer";
import { LeadFormDialog } from "@/components/crm/LeadFormDialog";
import { StageChip } from "@/components/crm/StageChip";
import { EmptyState, ErrorBanner, LoadingRows } from "@/components/crm/States";
import { formatDate, formatINR, isOverdue } from "@/lib/crm/format";
import { useCrm, useLookups } from "@/lib/crm/store";
import { LEAD_STAGES, type Lead } from "@/lib/crm/types";

export const Route = createFileRoute("/leads")({
  head: () => ({
    meta: [
      { title: "Leads — Harborview Real Estate CRM" },
      {
        name: "description",
        content: "Create, search, filter and assign property leads across every sales stage with notes and follow-ups.",
      },
      { property: "og:title", content: "Leads — Harborview Real Estate CRM" },
      {
        property: "og:description",
        content: "Search, filter and manage real estate leads by stage, owner and follow-up date.",
      },
    ],
  }),
  component: LeadsPage,
});

const PAGE_SIZE = 8;

function LeadsPage() {
  const { data, loading, error, reload } = useCrm();
  const { users, unitLabel } = useLookups();

  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("all");
  const [assignee, setAssignee] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [formLead, setFormLead] = useState<Lead | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.leads ?? []).filter((l) => {
      const matchesQuery =
        !q ||
        l.name.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q);
      const matchesStage = stage === "all" || l.stage === stage;
      const matchesAssignee = assignee === "all" || l.assigneeId === assignee;
      return matchesQuery && matchesStage && matchesAssignee;
    });
  }, [data, query, stage, assignee]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const selectedLead = (data?.leads ?? []).find((l) => l.id === selected) ?? null;

  return (
    <AppShell
      eyebrow="Leads"
      title="All leads"
      actions={
        <button
          onClick={() => {
            setFormLead(null);
            setFormOpen(true);
          }}
          className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          New lead
        </button>
      }
    >
      {error && <ErrorBanner message={error} onRetry={reload} />}

      <section className="glass animate-rise rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <input
            className="field max-w-xs"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, phone or email…"
            aria-label="Search leads"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-lg border border-border bg-surface/70 px-2.5 py-1.5 text-[12px] text-muted"
              value={stage}
              onChange={(e) => {
                setStage(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by stage"
            >
              <option value="all">All stages</option>
              {LEAD_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border border-border bg-surface/70 px-2.5 py-1.5 text-[12px] text-muted"
              value={assignee}
              onChange={(e) => {
                setAssignee(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by assignee"
            >
              <option value="all">All assignees</option>
              {(data?.users ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <LoadingRows rows={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No leads match these filters"
            hint="Try clearing the search or picking a different stage."
            action={
              <button
                onClick={() => {
                  setQuery("");
                  setStage("all");
                  setAssignee("all");
                }}
                className="rounded-lg border border-border-strong px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-foreground/5"
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[13px]">
              <thead>
                <tr className="font-mono text-[10px] uppercase tracking-wide text-faint">
                  <th className="border-b border-border py-2 pr-3 font-medium">Lead</th>
                  <th className="border-b border-border px-2 py-2 font-medium">Property</th>
                  <th className="border-b border-border px-2 py-2 font-medium">Budget</th>
                  <th className="border-b border-border px-2 py-2 font-medium">Stage</th>
                  <th className="border-b border-border px-2 py-2 font-medium">Assignee</th>
                  <th className="border-b border-border py-2 pl-2 text-right font-medium">Follow-up</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() => setSelected(l.id)}
                    className="cursor-pointer transition-colors hover:bg-primary/5"
                  >
                    <td className="border-b border-border/60 py-3 pr-3">
                      <div className="font-medium">{l.name}</div>
                      <div className="font-mono text-[11px] text-faint">{l.phone}</div>
                    </td>
                    <td className="border-b border-border/60 px-2 py-3 text-muted">
                      {unitLabel(l.interestedUnitId)?.text ?? "—"}
                    </td>
                    <td className="border-b border-border/60 px-2 py-3 font-mono text-[12px]">
                      {formatINR(l.budget)}
                    </td>
                    <td className="border-b border-border/60 px-2 py-3">
                      <StageChip stage={l.stage} />
                    </td>
                    <td className="border-b border-border/60 px-2 py-3 text-muted">
                      {users.get(l.assigneeId)?.name}
                    </td>
                    <td
                      className={`border-b border-border/60 py-3 pl-2 text-right font-mono text-[11px] ${
                        isOverdue(l.followUpDate) ? "text-danger" : "text-muted"
                      }`}
                    >
                      {isOverdue(l.followUpDate) ? "overdue" : formatDate(l.followUpDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between pt-3 font-mono text-[11px] text-faint">
            <span>
              Showing {rows.length} of {filtered.length}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border border-border px-2 py-1 transition-colors hover:bg-foreground/5"
              >
                ‹
              </button>
              {Array.from({ length: pages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={
                    current === i + 1
                      ? "rounded bg-foreground/5 px-2 py-1 text-foreground"
                      : "rounded border border-border px-2 py-1 transition-colors hover:bg-foreground/5"
                  }
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                className="rounded border border-border px-2 py-1 transition-colors hover:bg-foreground/5"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </section>

      {selectedLead && (
        <LeadDrawer
          lead={selectedLead}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setFormLead(selectedLead);
            setFormOpen(true);
            setSelected(null);
          }}
        />
      )}

      {formOpen && <LeadFormDialog lead={formLead ?? undefined} onClose={() => setFormOpen(false)} />}
    </AppShell>
  );
}

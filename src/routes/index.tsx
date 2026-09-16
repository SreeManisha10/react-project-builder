import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/crm/AppShell";
import { StageChip } from "@/components/crm/StageChip";
import { EmptyState, ErrorBanner, LoadingRows } from "@/components/crm/States";
import { formatDate, formatINR, isOverdue, isToday } from "@/lib/crm/format";
import { useCrm, useLookups } from "@/lib/crm/store";
import { LEAD_STAGES } from "@/lib/crm/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sales Dashboard — Harborview Real Estate CRM" },
      {
        name: "description",
        content:
          "Track leads by stage, today's follow-ups, unit availability and monthly bookings in one real estate sales workspace.",
      },
      { property: "og:title", content: "Sales Dashboard — Harborview Real Estate CRM" },
      {
        property: "og:description",
        content: "Leads, follow-ups, property units and bookings for a real estate sales team.",
      },
    ],
  }),
  component: Dashboard,
});

const STAGE_BAR: Record<string, string> = {
  New: "bg-primary",
  Contacted: "bg-primary/60",
  "Site Visit": "bg-violet",
  Interested: "bg-violet/60",
  Negotiation: "bg-warn",
  Booked: "bg-success",
  Lost: "bg-foreground/20",
};

function Dashboard() {
  const { data, loading, error, reload, user } = useCrm();
  const { users, unitLabel } = useLookups();

  const stats = useMemo(() => {
    const leads = data?.leads ?? [];
    const byStage = LEAD_STAGES.map((stage) => ({
      stage,
      count: leads.filter((l) => l.stage === stage).length,
    }));
    const followUps = leads
      .filter((l) => isToday(l.followUpDate) || isOverdue(l.followUpDate))
      .sort((a, b) => (a.followUpDate ?? "").localeCompare(b.followUpDate ?? ""));
    const bookings = data?.bookings ?? [];
    const bookedValue = bookings.reduce((sum, b) => sum + b.amount, 0);
    const closed = leads.filter((l) => l.stage === "Booked").length;
    const conversion = leads.length ? Math.round((closed / leads.length) * 100) : 0;
    const available = (data?.units ?? []).filter((u) => u.status === "Available").length;
    return { leads, byStage, followUps, bookings, bookedValue, conversion, available };
  }, [data]);

  return (
    <AppShell
      eyebrow="Dashboard"
      title={user ? `Welcome back, ${user.name.split(" ")[0]}` : "Dashboard"}
      actions={
        <Link
          to="/leads"
          className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Go to leads
        </Link>
      }
    >
      {error && <ErrorBanner message={error} onRetry={reload} />}

      {loading ? (
        <div className="glass rounded-2xl p-4">
          <LoadingRows rows={6} />
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="glass animate-rise rounded-2xl p-4">
              <div className="font-mono text-[10px] uppercase tracking-wide text-muted">Leads by stage</div>
              <div className="mt-2 text-3xl font-bold tracking-tight">{stats.leads.length}</div>
              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-foreground/5">
                {stats.byStage.map(
                  (s) =>
                    s.count > 0 && (
                      <div
                        key={s.stage}
                        className={STAGE_BAR[s.stage]}
                        style={{ width: `${(s.count / stats.leads.length) * 100}%` }}
                      />
                    ),
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-muted">
                {stats.byStage
                  .filter((s) => s.count > 0)
                  .map((s) => (
                    <span key={s.stage}>
                      {s.count} {s.stage.toLowerCase()}
                    </span>
                  ))}
              </div>
            </div>

            <div className="glass animate-rise rounded-2xl p-4 [animation-delay:60ms]">
              <div className="font-mono text-[10px] uppercase tracking-wide text-muted">Follow-ups due</div>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-3xl font-bold tracking-tight">{stats.followUps.length}</span>
                <span className="mb-1 font-mono text-[11px] text-danger">
                  {stats.followUps.filter((l) => isOverdue(l.followUpDate)).length} overdue
                </span>
              </div>
              <div className="mt-3 space-y-1.5 text-[12px]">
                {stats.followUps.slice(0, 3).map((l) => (
                  <div
                    key={l.id}
                    className={isOverdue(l.followUpDate) ? "flex justify-between text-danger" : "flex justify-between"}
                  >
                    <span className="truncate">{l.name}</span>
                    <span className="font-mono text-faint">
                      {isOverdue(l.followUpDate) ? "overdue" : "today"}
                    </span>
                  </div>
                ))}
                {stats.followUps.length === 0 && (
                  <p className="text-[12px] text-muted">Nothing due today. Nice work.</p>
                )}
              </div>
            </div>

            <div className="glass animate-rise rounded-2xl p-4 [animation-delay:120ms]">
              <div className="font-mono text-[10px] uppercase tracking-wide text-muted">Booked value</div>
              <div className="mt-2 text-3xl font-bold tracking-tight">{formatINR(stats.bookedValue)}</div>
              <div className="mt-2 font-mono text-[11px] text-success">{stats.bookings.length} units closed</div>
              <Link to="/bookings" className="mt-3 block font-mono text-[11px] text-primary hover:underline">
                View bookings →
              </Link>
            </div>

            <div className="glass animate-rise rounded-2xl p-4 [animation-delay:180ms]">
              <div className="font-mono text-[10px] uppercase tracking-wide text-muted">Conversion</div>
              <div className="mt-2 text-3xl font-bold tracking-tight">{stats.conversion}%</div>
              <div className="mt-2 text-[12px] text-muted">{stats.available} units still available</div>
              <Link to="/properties" className="mt-3 block font-mono text-[11px] text-primary hover:underline">
                View inventory →
              </Link>
            </div>
          </section>

          <section className="glass animate-rise mt-4 rounded-2xl p-4 [animation-delay:240ms]">
            <div className="flex items-center justify-between pb-3">
              <div className="text-[14px] font-semibold tracking-tight">Stage pipeline</div>
              <div className="font-mono text-[11px] text-muted">
                {formatINR(stats.leads.filter((l) => l.stage !== "Lost").reduce((s, l) => s + l.budget, 0))} in play
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {LEAD_STAGES.filter((s) => s !== "Contacted" && s !== "Interested").map((stage) => {
                const items = stats.leads.filter((l) => l.stage === stage);
                return (
                  <div key={stage} className="rounded-xl bg-foreground/[0.03] p-3 ring-1 ring-border">
                    <div className="flex items-center justify-between">
                      <StageChip stage={stage} />
                      <span className="font-mono text-[11px] text-faint">{items.length}</span>
                    </div>
                    <div className="mt-2 space-y-2">
                      {items.slice(0, 3).map((l) => (
                        <div key={l.id} className="rounded-lg bg-surface/80 p-2.5 ring-1 ring-border">
                          <div className="text-[12px] font-medium">{l.name}</div>
                          <div className="font-mono text-[10px] text-faint">
                            {unitLabel(l.interestedUnitId)?.text ?? formatINR(l.budget)}
                          </div>
                        </div>
                      ))}
                      {items.length === 0 && <p className="text-[11px] text-faint">No leads</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="glass animate-rise mt-4 rounded-2xl p-4 [animation-delay:300ms]">
            <div className="pb-3 text-[14px] font-semibold tracking-tight">Today &amp; overdue follow-ups</div>
            {stats.followUps.length === 0 ? (
              <EmptyState title="Inbox zero" hint="No follow-ups are due today." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="font-mono text-[10px] uppercase tracking-wide text-faint">
                      <th className="border-b border-border py-2 pr-3 font-medium">Lead</th>
                      <th className="border-b border-border px-2 py-2 font-medium">Stage</th>
                      <th className="border-b border-border px-2 py-2 font-medium">Owner</th>
                      <th className="border-b border-border py-2 pl-2 text-right font-medium">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.followUps.map((l) => (
                      <tr key={l.id} className="transition-colors hover:bg-primary/5">
                        <td className="border-b border-border/60 py-3 pr-3">
                          <div className="font-medium">{l.name}</div>
                          <div className="font-mono text-[11px] text-faint">{l.phone}</div>
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
          </section>
        </>
      )}
    </AppShell>
  );
}

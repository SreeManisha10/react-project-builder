import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/crm/AppShell";
import { StatusChip } from "@/components/crm/StageChip";
import { EmptyState, ErrorBanner, LoadingRows } from "@/components/crm/States";
import { formatINR } from "@/lib/crm/format";
import { useCrm } from "@/lib/crm/store";

export const Route = createFileRoute("/properties")({
  head: () => ({
    meta: [
      { title: "Properties & Units — Harborview Real Estate CRM" },
      {
        name: "description",
        content: "Browse projects, buildings and units with live price, configuration and availability for the sales team.",
      },
      { property: "og:title", content: "Properties & Units — Harborview Real Estate CRM" },
      {
        property: "og:description",
        content: "Project, building and unit inventory with availability status and pricing.",
      },
    ],
  }),
  component: PropertiesPage,
});

const CELL: Record<string, string> = {
  Available: "bg-success/20 text-success",
  Reserved: "bg-warn/20 text-warn",
  Sold: "bg-danger/20 text-danger",
};

function PropertiesPage() {
  const { data, loading, error, reload } = useCrm();
  const [projectId, setProjectId] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const projects = (data?.projects ?? []).filter((p) => projectId === "all" || p.id === projectId);
    return projects.map((project) => {
      const buildings = (data?.buildings ?? []).filter((b) => b.projectId === project.id);
      const units = (data?.units ?? []).filter(
        (u) =>
          buildings.some((b) => b.id === u.buildingId) &&
          (status === "all" || u.status === status) &&
          (!query.trim() || u.code.toLowerCase().includes(query.trim().toLowerCase())),
      );
      const total = (data?.units ?? []).filter((u) => buildings.some((b) => b.id === u.buildingId));
      return { project, buildings, units, available: total.filter((u) => u.status === "Available").length, total };
    });
  }, [data, projectId, status, query]);

  const visibleUnits = groups.reduce((n, g) => n + g.units.length, 0);

  return (
    <AppShell eyebrow="Properties" title="Projects, buildings & units">
      {error && <ErrorBanner message={error} onRetry={reload} />}

      <section className="glass animate-rise rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <input
            className="field max-w-xs"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search unit code…"
            aria-label="Search units"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-lg border border-border bg-surface/70 px-2.5 py-1.5 text-[12px] text-muted"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              aria-label="Filter by project"
            >
              <option value="all">All projects</option>
              {(data?.projects ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border border-border bg-surface/70 px-2.5 py-1.5 text-[12px] text-muted"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="all">Any status</option>
              <option>Available</option>
              <option>Reserved</option>
              <option>Sold</option>
            </select>
            <div className="flex items-center gap-3 font-mono text-[10px] text-muted">
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-success" />
                Available
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-warn" />
                Reserved
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-danger" />
                Sold
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingRows rows={5} />
        ) : visibleUnits === 0 ? (
          <EmptyState title="No units match these filters" hint="Try another project or status." />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {groups.map(({ project, units, available, total }) => (
              <div key={project.id} className="rounded-xl bg-foreground/[0.03] p-3.5 ring-1 ring-border">
                <div className="flex items-center justify-between">
                  <div className="text-[13px] font-semibold">{project.name}</div>
                  <span className="font-mono text-[10px] text-muted">{project.location}</span>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                  {units.map((u) => (
                    <span
                      key={u.id}
                      title={`${u.code} · ${u.type} · ${formatINR(u.price)} · ${u.status}`}
                      className={`grid h-6 place-items-center rounded font-mono text-[8px] ${CELL[u.status]}`}
                    >
                      {u.code}
                    </span>
                  ))}
                </div>
                <div className="mt-3 font-mono text-[10px] text-faint">
                  {available} of {total.length} available
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="glass animate-rise mt-4 rounded-2xl p-4 [animation-delay:120ms]">
        <div className="pb-3 text-[14px] font-semibold tracking-tight">Unit inventory</div>
        {loading ? (
          <LoadingRows rows={5} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead>
                <tr className="font-mono text-[10px] uppercase tracking-wide text-faint">
                  <th className="border-b border-border py-2 pr-3 font-medium">Unit</th>
                  <th className="border-b border-border px-2 py-2 font-medium">Project</th>
                  <th className="border-b border-border px-2 py-2 font-medium">Building</th>
                  <th className="border-b border-border px-2 py-2 font-medium">Type</th>
                  <th className="border-b border-border px-2 py-2 font-medium">Area</th>
                  <th className="border-b border-border px-2 py-2 font-medium">Price</th>
                  <th className="border-b border-border py-2 pl-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {groups.flatMap(({ project, buildings, units }) =>
                  units.map((u) => (
                    <tr key={u.id} className="transition-colors hover:bg-primary/5">
                      <td className="border-b border-border/60 py-3 pr-3 font-mono text-[12px]">{u.code}</td>
                      <td className="border-b border-border/60 px-2 py-3 text-muted">{project.name}</td>
                      <td className="border-b border-border/60 px-2 py-3 text-muted">
                        {buildings.find((b) => b.id === u.buildingId)?.name}
                      </td>
                      <td className="border-b border-border/60 px-2 py-3">{u.type}</td>
                      <td className="border-b border-border/60 px-2 py-3 font-mono text-[12px]">
                        {u.areaSqft} sqft
                      </td>
                      <td className="border-b border-border/60 px-2 py-3 font-mono text-[12px]">
                        {formatINR(u.price)}
                      </td>
                      <td className="border-b border-border/60 py-3 pl-2 text-right">
                        <StatusChip status={u.status} />
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}

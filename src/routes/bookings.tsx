import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/crm/AppShell";
import { EmptyState, ErrorBanner, LoadingRows } from "@/components/crm/States";
import { formatDate, formatINR } from "@/lib/crm/format";
import { useCrm, useLookups } from "@/lib/crm/store";

export const Route = createFileRoute("/bookings")({
  head: () => ({
    meta: [
      { title: "Bookings — Harborview Real Estate CRM" },
      {
        name: "description",
        content: "Every confirmed unit booking with customer, agent and value, protected against double booking.",
      },
      { property: "og:title", content: "Bookings — Harborview Real Estate CRM" },
      {
        property: "og:description",
        content: "Confirmed property bookings linking customers to units, with cancellation control.",
      },
    ],
  }),
  component: BookingsPage,
});

function BookingsPage() {
  const { data, loading, error, reload, user, cancelBooking, createBooking, resetDemoData } = useCrm();
  const { users, unitLabel } = useLookups();
  const [leadId, setLeadId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [busy, setBusy] = useState(false);

  const bookings = data?.bookings ?? [];
  const bookableLeads = (data?.leads ?? []).filter((l) => l.stage !== "Booked" && l.stage !== "Lost");
  const availableUnits = (data?.units ?? []).filter((u) => u.status === "Available");
  const isAdmin = user?.role === "Admin";

  async function book() {
    setBusy(true);
    try {
      await createBooking(leadId, unitId);
      setLeadId("");
      setUnitId("");
    } catch {
      /* error surfaces in the banner */
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      eyebrow="Bookings"
      title="Confirmed bookings"
      actions={
        <button
          onClick={() => resetDemoData()}
          className="rounded-lg border border-border-strong px-3 py-2 text-[12px] font-medium text-muted transition-colors hover:bg-foreground/5"
        >
          Reset demo data
        </button>
      }
    >
      {error && <ErrorBanner message={error} onRetry={reload} />}

      <section className="glass animate-rise rounded-2xl p-4">
        <div className="text-[14px] font-semibold tracking-tight">New booking</div>
        <p className="mt-1 text-[12px] text-muted">
          A unit can only be booked once — the second attempt on the same unit is rejected.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            className="field max-w-xs"
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
            aria-label="Select lead"
          >
            <option value="">Select a lead</option>
            {bookableLeads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} · {l.stage}
              </option>
            ))}
          </select>
          <select
            className="field max-w-xs"
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            aria-label="Select unit"
          >
            <option value="">Select an available unit</option>
            {availableUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.code} · {u.type} · {formatINR(u.price)}
              </option>
            ))}
          </select>
          <button
            disabled={!leadId || !unitId || busy}
            onClick={book}
            className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            {busy ? "Booking…" : "Confirm booking"}
          </button>
        </div>
      </section>

      <section className="glass animate-rise mt-4 rounded-2xl p-4 [animation-delay:120ms]">
        <div className="flex items-center justify-between pb-3">
          <div className="text-[14px] font-semibold tracking-tight">All bookings</div>
          <div className="font-mono text-[11px] text-muted">
            {formatINR(bookings.reduce((s, b) => s + b.amount, 0))} total
          </div>
        </div>

        {loading ? (
          <LoadingRows rows={4} />
        ) : bookings.length === 0 ? (
          <EmptyState title="No bookings yet" hint="Confirm a booking above to see it here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead>
                <tr className="font-mono text-[10px] uppercase tracking-wide text-faint">
                  <th className="border-b border-border py-2 pr-3 font-medium">Customer</th>
                  <th className="border-b border-border px-2 py-2 font-medium">Unit</th>
                  <th className="border-b border-border px-2 py-2 font-medium">Agent</th>
                  <th className="border-b border-border px-2 py-2 font-medium">Booked on</th>
                  <th className="border-b border-border px-2 py-2 font-medium">Value</th>
                  <th className="border-b border-border py-2 pl-2 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const lead = (data?.leads ?? []).find((l) => l.id === b.leadId);
                  return (
                    <tr key={b.id} className="transition-colors hover:bg-primary/5">
                      <td className="border-b border-border/60 py-3 pr-3">
                        <div className="font-medium">{lead?.name ?? "Unknown"}</div>
                        <div className="font-mono text-[11px] text-faint">{lead?.phone}</div>
                      </td>
                      <td className="border-b border-border/60 px-2 py-3 text-muted">
                        {unitLabel(b.unitId)?.text ?? "—"}
                      </td>
                      <td className="border-b border-border/60 px-2 py-3 text-muted">
                        {users.get(b.agentId)?.name}
                      </td>
                      <td className="border-b border-border/60 px-2 py-3 font-mono text-[12px]">
                        {formatDate(b.createdAt.slice(0, 10))}
                      </td>
                      <td className="border-b border-border/60 px-2 py-3 font-mono text-[12px]">
                        {formatINR(b.amount)}
                      </td>
                      <td className="border-b border-border/60 py-3 pl-2 text-right">
                        <button
                          disabled={!isAdmin}
                          onClick={() => cancelBooking(b.id)}
                          title={isAdmin ? "Cancel booking" : "Only an admin can cancel"}
                          className="rounded-lg border border-border px-2.5 py-1 font-mono text-[11px] text-muted transition-colors hover:bg-foreground/5 disabled:opacity-40"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}

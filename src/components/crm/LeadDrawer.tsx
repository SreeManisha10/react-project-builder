import { useMemo, useState } from "react";
import { StageChip } from "./StageChip";
import { EmptyState } from "./States";
import { formatDate, formatINR, isOverdue } from "@/lib/crm/format";
import { useCrm, useLookups } from "@/lib/crm/store";
import { LEAD_STAGES, type Lead } from "@/lib/crm/types";

export function LeadDrawer({
  lead,
  onClose,
  onEdit,
}: {
  lead: Lead;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { data, user, addNote, updateLead, createBooking } = useCrm();
  const { users, unitLabel } = useLookups();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [unitId, setUnitId] = useState(lead.interestedUnitId ?? "");

  const notes = useMemo(
    () => (data?.notes ?? []).filter((n) => n.leadId === lead.id),
    [data, lead.id],
  );
  const unit = unitLabel(lead.interestedUnitId);
  const availableUnits = (data?.units ?? []).filter((u) => u.status === "Available");
  const canEdit = user?.role === "Admin" || user?.id === lead.assigneeId;

  async function guard(fn: () => Promise<void>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="glass absolute right-0 top-0 flex h-full w-full max-w-[400px] animate-slide flex-col overflow-y-auto rounded-l-2xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wide text-muted">Lead detail</div>
            <div className="mt-1 text-lg font-bold tracking-tight">{lead.name}</div>
            <div className="font-mono text-[11px] text-faint">
              {lead.phone}
              {unit ? ` · ${unit.text}` : ""}
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid size-7 place-items-center rounded-lg border border-border text-muted transition-colors hover:bg-foreground/5"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StageChip stage={lead.stage} />
          <span className="text-[12px] text-muted">
            {formatINR(lead.budget)} budget · {lead.source} · {users.get(lead.assigneeId)?.name}
          </span>
        </div>

        {err && (
          <p className="mt-3 rounded-lg bg-danger/10 p-2.5 text-[12px] text-danger ring-1 ring-danger/20">{err}</p>
        )}

        {!canEdit && (
          <p className="mt-3 rounded-lg bg-foreground/5 p-2.5 text-[12px] text-muted">
            Read-only — this lead belongs to {users.get(lead.assigneeId)?.name}.
          </p>
        )}

        <div className="mt-5">
          <div className="font-mono text-[10px] uppercase tracking-wide text-faint">Stage</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {LEAD_STAGES.filter((s) => s !== "Booked").map((s) => (
              <button
                key={s}
                disabled={!canEdit || busy || lead.stage === s || lead.stage === "Booked"}
                onClick={() => guard(() => updateLead(lead.id, { stage: s }))}
                className={
                  lead.stage === s
                    ? "rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-medium"
                    : "rounded-lg border border-border px-2.5 py-1 text-[11px] text-muted transition-colors hover:bg-foreground/5 disabled:opacity-40"
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <div className="font-mono text-[10px] uppercase tracking-wide text-faint">Follow-up</div>
          {lead.followUpDate ? (
            <div
              className={
                isOverdue(lead.followUpDate)
                  ? "mt-2 flex items-center justify-between rounded-xl bg-danger/10 p-3 ring-1 ring-danger/20"
                  : "mt-2 flex items-center justify-between rounded-xl bg-foreground/5 p-3 ring-1 ring-border"
              }
            >
              <div>
                <div className="text-[13px] font-medium">
                  {isOverdue(lead.followUpDate) ? "Overdue follow-up" : "Next follow-up"}
                </div>
                <div className="font-mono text-[10px] text-muted">due {formatDate(lead.followUpDate)}</div>
              </div>
              <input
                type="date"
                disabled={!canEdit}
                value={lead.followUpDate}
                onChange={(e) => guard(() => updateLead(lead.id, { followUpDate: e.target.value }))}
                className="rounded-lg border border-border bg-surface/70 px-2 py-1 font-mono text-[11px]"
              />
            </div>
          ) : (
            <input
              type="date"
              disabled={!canEdit}
              onChange={(e) => guard(() => updateLead(lead.id, { followUpDate: e.target.value }))}
              className="field mt-2"
            />
          )}
        </div>

        {lead.stage !== "Booked" && (
          <div className="mt-5">
            <div className="font-mono text-[10px] uppercase tracking-wide text-faint">Booking</div>
            <div className="mt-2 flex gap-2">
              <select
                className="field"
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                disabled={!canEdit}
              >
                <option value="">Select an available unit</option>
                {availableUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.code} · {u.type} · {formatINR(u.price)}
                  </option>
                ))}
              </select>
              <button
                disabled={!canEdit || !unitId || busy}
                onClick={() => guard(() => createBooking(lead.id, unitId))}
                className="shrink-0 rounded-lg bg-primary px-3 py-2 text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
              >
                Book
              </button>
            </div>
          </div>
        )}

        <div className="mt-5">
          <div className="font-mono text-[10px] uppercase tracking-wide text-faint">Notes</div>
          <div className="mt-2 space-y-2.5">
            {notes.length === 0 && <EmptyState title="No notes yet" hint="Log every call or site visit here." />}
            {notes.map((n) => (
              <div key={n.id} className="rounded-xl bg-surface/70 p-3 text-[12px] ring-1 ring-border">
                <div className="flex justify-between font-mono text-[10px] text-faint">
                  <span>{users.get(n.authorId)?.name ?? "Unknown"}</span>
                  <span>{formatDate(n.createdAt.slice(0, 10))}</span>
                </div>
                <p className="mt-1 text-pretty text-foreground/90">{n.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              className="field"
              value={note}
              disabled={!canEdit}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note…"
            />
            <button
              disabled={!canEdit || busy || !note.trim()}
              onClick={() =>
                guard(async () => {
                  await addNote(lead.id, note);
                  setNote("");
                })
              }
              className="shrink-0 rounded-lg bg-primary px-3 py-2 text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>

        <div className="mt-auto flex gap-2 pt-5">
          <button
            disabled={!canEdit || busy || lead.stage === "Lost" || lead.stage === "Booked"}
            onClick={() => guard(() => updateLead(lead.id, { stage: "Lost", followUpDate: null }))}
            className="flex-1 rounded-lg border border-border-strong py-2 text-[12px] font-medium text-muted transition-colors hover:bg-foreground/5 disabled:opacity-40"
          >
            Move to Lost
          </button>
          <button
            disabled={!canEdit}
            onClick={onEdit}
            className="flex-1 rounded-lg bg-primary py-2 text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            Edit lead
          </button>
        </div>
      </aside>
    </div>
  );
}

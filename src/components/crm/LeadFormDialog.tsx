import { useState } from "react";
import { LEAD_STAGES, type Lead } from "@/lib/crm/types";
import { useCrm } from "@/lib/crm/store";

const SOURCES = ["Website", "Walk-in", "Referral", "Portal", "Campaign"];

export function LeadFormDialog({ lead, onClose }: { lead?: Lead; onClose: () => void }) {
  const { data, user, createLead, updateLead } = useCrm();
  const isEdit = !!lead;
  const isAdmin = user?.role === "Admin";

  const [form, setForm] = useState({
    name: lead?.name ?? "",
    phone: lead?.phone ?? "",
    email: lead?.email ?? "",
    source: lead?.source ?? "Website",
    budget: lead ? String(lead.budget) : "",
    stage: lead?.stage ?? "New",
    assigneeId: lead?.assigneeId ?? user?.id ?? "u1",
    interestedUnitId: lead?.interestedUnitId ?? "",
    followUpDate: lead?.followUpDate ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function validate() {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Enter the lead's full name.";
    if (!/^[+\d][\d\s-]{7,}$/.test(form.phone.trim())) e.phone = "Enter a valid phone number.";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "Enter a valid email.";
    if (!form.budget || Number(form.budget) <= 0) e.budget = "Budget must be greater than 0.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setServerError(null);
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      source: form.source,
      budget: Number(form.budget),
      stage: form.stage as Lead["stage"],
      assigneeId: form.assigneeId,
      interestedUnitId: form.interestedUnitId || null,
      followUpDate: form.followUpDate || null,
    };
    try {
      if (isEdit && lead) await updateLead(lead.id, payload);
      else await createLead(payload);
      onClose();
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Could not save the lead.");
    } finally {
      setBusy(false);
    }
  }

  const availableUnits = (data?.units ?? []).filter(
    (u) => u.status !== "Sold" || u.id === lead?.interestedUnitId,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]" onClick={onClose} />
      <form
        onSubmit={submit}
        className="glass relative max-h-[90vh] w-full max-w-lg animate-rise overflow-y-auto rounded-2xl p-5"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wide text-muted">
              {isEdit ? "Edit lead" : "New lead"}
            </div>
            <div className="mt-1 text-lg font-bold tracking-tight">
              {isEdit ? lead!.name : "Capture an enquiry"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-7 place-items-center rounded-lg border border-border text-muted transition-colors hover:bg-foreground/5"
          >
            ✕
          </button>
        </div>

        {serverError && (
          <p className="mt-3 rounded-lg bg-danger/10 p-2.5 text-[12px] text-danger ring-1 ring-danger/20">
            {serverError}
          </p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Full name" error={errors.name}>
            <input className="field" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Phone" error={errors.phone}>
            <input
              className="field"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+91 98200 41233"
            />
          </Field>
          <Field label="Email" error={errors.email}>
            <input className="field" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Budget (₹)" error={errors.budget}>
            <input
              className="field"
              inputMode="numeric"
              value={form.budget}
              onChange={(e) => set("budget", e.target.value.replace(/[^\d]/g, ""))}
              placeholder="18500000"
            />
          </Field>
          <Field label="Source">
            <select className="field" value={form.source} onChange={(e) => set("source", e.target.value)}>
              {SOURCES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Stage">
            <select className="field" value={form.stage} onChange={(e) => set("stage", e.target.value)}>
              {LEAD_STAGES.filter((s) => s !== "Booked").map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Assigned to" hint={isAdmin ? undefined : "Admins can reassign"}>
            <select
              className="field"
              disabled={!isAdmin}
              value={form.assigneeId}
              onChange={(e) => set("assigneeId", e.target.value)}
            >
              {(data?.users ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Follow-up date">
            <input
              type="date"
              className="field"
              value={form.followUpDate}
              onChange={(e) => set("followUpDate", e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Interested unit">
              <select
                className="field"
                value={form.interestedUnitId}
                onChange={(e) => set("interestedUnitId", e.target.value)}
              >
                <option value="">No unit selected</option>
                {availableUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.code} · {u.type} · {u.status}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border-strong px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:bg-foreground/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "Saving…" : isEdit ? "Save changes" : "Create lead"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-wide text-faint">{label}</span>
      <div className="mt-1.5">{children}</div>
      {error && <span className="mt-1 block text-[11px] text-danger">{error}</span>}
      {!error && hint && <span className="mt-1 block text-[11px] text-faint">{hint}</span>}
    </label>
  );
}

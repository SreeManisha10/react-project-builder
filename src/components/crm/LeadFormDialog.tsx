import { useState } from "react";
import { Button, FormField, Input, Modal, Select } from "@/components/kit";
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
    <Modal
      as="form"
      onSubmit={submit}
      eyebrow={isEdit ? "Edit lead" : "New lead"}
      title={isEdit ? lead!.name : "Capture an enquiry"}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : isEdit ? "Save changes" : "Create lead"}
          </Button>
        </>
      }
    >
      {serverError && (
        <p className="mt-3 rounded-lg bg-danger/10 p-2.5 text-[12px] text-danger ring-1 ring-danger/20">
          {serverError}
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Full name" error={errors.name}>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
        </FormField>
        <FormField label="Phone" error={errors.phone}>
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98200 41233" />
        </FormField>
        <FormField label="Email" error={errors.email}>
          <Input value={form.email} onChange={(e) => set("email", e.target.value)} />
        </FormField>
        <FormField label="Budget (₹)" error={errors.budget}>
          <Input
            inputMode="numeric"
            value={form.budget}
            onChange={(e) => set("budget", e.target.value.replace(/[^\d]/g, ""))}
            placeholder="18500000"
          />
        </FormField>
        <FormField label="Source">
          <Select value={form.source} onChange={(e) => set("source", e.target.value)}>
            {SOURCES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Stage">
          <Select value={form.stage} onChange={(e) => set("stage", e.target.value)}>
            {LEAD_STAGES.filter((s) => s !== "Booked").map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Assigned to" hint={isAdmin ? undefined : "Only an admin can reassign"}>
          <Select disabled={!isAdmin} value={form.assigneeId} onChange={(e) => set("assigneeId", e.target.value)}>
            {(data?.users ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Follow-up date">
          <Input type="date" value={form.followUpDate} onChange={(e) => set("followUpDate", e.target.value)} />
        </FormField>
        <FormField label="Interested unit" className="sm:col-span-2">
          <Select value={form.interestedUnitId} onChange={(e) => set("interestedUnitId", e.target.value)}>
            <option value="">No unit selected</option>
            {availableUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.code} · {u.type} · {u.status}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
    </Modal>
  );
}

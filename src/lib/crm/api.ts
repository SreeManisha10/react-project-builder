/**
 * Mock API layer (frontend-only phase).
 *
 * Every function here returns a Promise and is the ONLY place that knows where
 * data comes from. When the backend is ready, replace the bodies with
 * `fetch("/api/leads")` etc. — components and hooks stay untouched.
 */
import { seed } from "./seed";
import type { Booking, CrmData, Lead, LeadStage, Note, User } from "./types";

const STORAGE_KEY = "harborview-crm-v1";
const LATENCY = 350;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY));
}

function read(): CrmData {
  if (typeof window === "undefined") return structuredClone(seed);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CrmData;
  } catch {
    /* corrupted storage — fall back to seed */
  }
  const fresh = structuredClone(seed);
  write(fresh);
  return fresh;
}

function write(data: CrmData): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

export class ApiError extends Error {}

export async function fetchAll(): Promise<CrmData> {
  return delay(read());
}

export async function resetData(): Promise<CrmData> {
  const fresh = structuredClone(seed);
  write(fresh);
  return delay(fresh);
}

export type LeadInput = Omit<Lead, "id" | "createdAt">;

export async function createLead(input: LeadInput): Promise<CrmData> {
  const data = read();
  const duplicate = data.leads.find((l) => l.phone.replace(/\s/g, "") === input.phone.replace(/\s/g, ""));
  if (duplicate) throw new ApiError(`A lead with this phone already exists (${duplicate.name}).`);
  data.leads.unshift({ ...input, id: uid("l"), createdAt: new Date().toISOString() });
  write(data);
  return delay(data);
}

export async function updateLead(id: string, patch: Partial<Lead>): Promise<CrmData> {
  const data = read();
  const lead = data.leads.find((l) => l.id === id);
  if (!lead) throw new ApiError("Lead not found.");
  if (patch.stage === "Booked" && !data.bookings.some((b) => b.leadId === id)) {
    throw new ApiError("Create a booking to move this lead to Booked.");
  }
  Object.assign(lead, patch);
  write(data);
  return delay(data);
}

export async function addNote(leadId: string, authorId: string, body: string): Promise<CrmData> {
  const trimmed = body.trim();
  if (!trimmed) throw new ApiError("Note cannot be empty.");
  const data = read();
  const note: Note = { id: uid("n"), leadId, authorId, body: trimmed, createdAt: new Date().toISOString() };
  data.notes.unshift(note);
  write(data);
  return delay(data);
}

/**
 * Booking flow. The unit availability check happens against freshly read
 * storage, which is the frontend stand-in for the DB unique constraint +
 * transaction that will prevent two users booking the same unit.
 */
export async function createBooking(leadId: string, unitId: string, agentId: string): Promise<CrmData> {
  const data = read();
  const unit = data.units.find((u) => u.id === unitId);
  const lead = data.leads.find((l) => l.id === leadId);
  if (!unit || !lead) throw new ApiError("Lead or unit not found.");
  if (unit.status === "Sold" || data.bookings.some((b) => b.unitId === unitId)) {
    throw new ApiError(`Unit ${unit.code} is already booked by another agent.`);
  }
  if (lead.stage === "Lost") throw new ApiError("A lost lead cannot be booked. Reopen it first.");

  const booking: Booking = {
    id: uid("bk"),
    leadId,
    unitId,
    agentId,
    amount: unit.price,
    createdAt: new Date().toISOString(),
  };
  data.bookings.unshift(booking);
  unit.status = "Sold";
  lead.stage = "Booked";
  lead.interestedUnitId = unitId;
  lead.followUpDate = null;
  write(data);
  return delay(data);
}

export async function cancelBooking(bookingId: string, stage: LeadStage = "Negotiation"): Promise<CrmData> {
  const data = read();
  const idx = data.bookings.findIndex((b) => b.id === bookingId);
  if (idx === -1) throw new ApiError("Booking not found.");
  const [booking] = data.bookings.splice(idx, 1);
  const unit = data.units.find((u) => u.id === booking.unitId);
  if (unit) unit.status = "Available";
  const lead = data.leads.find((l) => l.id === booking.leadId);
  if (lead) lead.stage = stage;
  write(data);
  return delay(data);
}

export async function login(email: string): Promise<User> {
  const data = read();
  const user = data.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) throw new ApiError("No account found for that email.");
  return delay(user);
}

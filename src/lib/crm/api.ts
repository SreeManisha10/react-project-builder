/**
 * API layer — the ONLY place in the app that knows about HTTP.
 *
 * Every function below is a thin, typed wrapper around one REST endpoint,
 * called with axios (src/lib/crm/http.ts) against the routes declared in
 * src/lib/crm/endpoints.ts. Components and hooks never import axios.
 *
 * Mutations return a fresh snapshot so the UI always renders server truth
 * rather than a locally patched guess.
 */
import { endpoints } from "./endpoints";
import { http, setAuthToken } from "./http";
import type { Booking, Building, CrmData, Lead, LeadStage, Note, Project, Unit, UnitStatus, User } from "./types";

export { ApiError } from "./http";

interface ListResponse<T> {
  items: T[];
}
interface PagedResponse<T> extends ListResponse<T> {
  page: number;
  pageSize: number;
  total: number;
}

/* ---------------------------------- auth ---------------------------------- */

/** POST /auth/login  →  { token, user } */
export async function login(email: string): Promise<User> {
  const { data } = await http.post<{ token: string; user: User }>(endpoints.auth.login(), { email });
  setAuthToken(data.token);
  return data.user;
}

/** GET /auth/me  →  User */
export async function me(): Promise<User> {
  const { data } = await http.get<User>(endpoints.auth.me());
  return data;
}

/** POST /auth/logout */
export async function logout(): Promise<void> {
  try {
    await http.post(endpoints.auth.logout());
  } finally {
    setAuthToken(null);
  }
}

/* -------------------------------- bootstrap -------------------------------- */

/** GET /crm/snapshot  →  everything the workspace needs in one round trip. */
export async function fetchAll(): Promise<CrmData> {
  const { data } = await http.get<CrmData>(endpoints.snapshot());
  return data;
}

/** GET /dashboard/summary  →  aggregated KPI counters. */
export async function fetchDashboard() {
  const { data } = await http.get(endpoints.dashboard.summary());
  return data;
}

/* ---------------------------------- leads --------------------------------- */

export type LeadInput = Omit<Lead, "id" | "createdAt">;

export interface LeadQuery {
  query?: string;
  stage?: LeadStage | "all";
  assigneeId?: string | "all";
  page?: number;
  pageSize?: number;
}

/** GET /leads?query=&stage=&assigneeId=&page=&pageSize= */
export async function listLeads(params: LeadQuery = {}): Promise<PagedResponse<Lead>> {
  const { data } = await http.get<PagedResponse<Lead>>(endpoints.leads.list(), { params });
  return data;
}

/** GET /leads/:id  →  lead with its notes */
export async function getLead(id: string): Promise<Lead & { notes: Note[] }> {
  const { data } = await http.get<Lead & { notes: Note[] }>(endpoints.leads.detail(id));
  return data;
}

/** POST /leads  →  created lead, then a fresh snapshot */
export async function createLead(input: LeadInput): Promise<CrmData> {
  await http.post<Lead>(endpoints.leads.create(), input);
  return fetchAll();
}

/** PATCH /leads/:id */
export async function updateLead(id: string, patch: Partial<Lead>): Promise<CrmData> {
  await http.patch<Lead>(endpoints.leads.update(id), patch);
  return fetchAll();
}

/** DELETE /leads/:id (Admin only) */
export async function deleteLead(id: string): Promise<CrmData> {
  await http.delete(endpoints.leads.remove(id));
  return fetchAll();
}

/** POST /leads/:id/notes */
export async function addNote(leadId: string, _authorId: string, body: string): Promise<CrmData> {
  await http.post<Note>(endpoints.leads.notes(leadId), { body });
  return fetchAll();
}

/* -------------------------------- properties ------------------------------- */

/** GET /projects */
export async function listProjects(): Promise<Project[]> {
  const { data } = await http.get<ListResponse<Project>>(endpoints.properties.projects());
  return data.items;
}

/** GET /buildings?projectId= */
export async function listBuildings(projectId?: string): Promise<Building[]> {
  const { data } = await http.get<ListResponse<Building>>(endpoints.properties.buildings(), {
    params: projectId ? { projectId } : undefined,
  });
  return data.items;
}

/** GET /units?status=&buildingId= */
export async function listUnits(params: { status?: UnitStatus | "all"; buildingId?: string } = {}): Promise<Unit[]> {
  const { data } = await http.get<ListResponse<Unit>>(endpoints.properties.units(), { params });
  return data.items;
}

/* --------------------------------- bookings -------------------------------- */

/** GET /bookings */
export async function listBookings(): Promise<Booking[]> {
  const { data } = await http.get<ListResponse<Booking>>(endpoints.bookings.list());
  return data.items;
}

/**
 * POST /bookings — the double-booking guard lives on the server; a second
 * attempt on the same unit comes back as 409 conflict.
 */
export async function createBooking(leadId: string, unitId: string, _agentId: string): Promise<CrmData> {
  await http.post<Booking>(endpoints.bookings.create(), { leadId, unitId });
  return fetchAll();
}

/** DELETE /bookings/:id (Admin only) — releases the unit back to Available. */
export async function cancelBooking(bookingId: string, stage: LeadStage = "Negotiation"): Promise<CrmData> {
  await http.delete(endpoints.bookings.cancel(bookingId), { data: { stage } });
  return fetchAll();
}

/* ----------------------------------- demo ---------------------------------- */

/** POST /demo/reset */
export async function resetData(): Promise<CrmData> {
  const { data } = await http.post<CrmData>(endpoints.demo.reset());
  return data;
}

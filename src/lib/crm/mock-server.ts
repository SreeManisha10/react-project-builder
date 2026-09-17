/**
 * In-browser stand-in for the REST API.
 *
 * It is wired into axios as an adapter, so the app makes genuine axios calls
 * with real verbs, routes, query strings and JSON bodies — this file just
 * answers them from localStorage instead of a server. Delete it (and set
 * VITE_API_URL) once the backend is deployed; nothing else changes.
 *
 * Business rules enforced here are exactly the rules the backend must enforce:
 *  - a phone number may exist on only one lead
 *  - a lead can only reach "Booked" through a real booking
 *  - a unit can be booked once and once only (double-booking guard)
 *  - a lost lead cannot be booked
 *  - only an Admin may cancel a booking or reassign a lead
 */
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { seed } from "./seed";
import type { Booking, CrmData, Lead, LeadStage, Note, User } from "./types";

const STORAGE_KEY = "manju-crm-db-v1";
const LATENCY = 260;

/* ------------------------------- tiny database ------------------------------ */

function db(): CrmData {
  if (typeof window === "undefined") return structuredClone(seed);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CrmData;
  } catch {
    /* corrupted storage — fall through to a fresh seed */
  }
  const fresh = structuredClone(seed);
  save(fresh);
  return fresh;
}

function save(data: CrmData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
const wait = () => new Promise((r) => setTimeout(r, LATENCY));

/* --------------------------------- helpers --------------------------------- */

class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const bad = (message: string) => new HttpError(422, "validation_failed", message);
const notFound = (message: string) => new HttpError(404, "not_found", message);
const conflict = (message: string) => new HttpError(409, "conflict", message);
const forbidden = (message: string) => new HttpError(403, "forbidden", message);

function currentUser(config: InternalAxiosRequestConfig, data: CrmData): User | null {
  const header = String(config.headers?.get?.("Authorization") ?? "");
  const id = header.replace("Bearer ", "").replace("token_", "");
  return data.users.find((u) => u.id === id) ?? null;
}

function body<T>(config: InternalAxiosRequestConfig): T {
  if (!config.data) return {} as T;
  return (typeof config.data === "string" ? JSON.parse(config.data) : config.data) as T;
}

/* ------------------------------ route handling ------------------------------ */

type Handler = (ctx: {
  config: InternalAxiosRequestConfig;
  params: string[];
  query: URLSearchParams;
  data: CrmData;
  me: User | null;
}) => unknown;

const routes: Array<{ method: string; pattern: RegExp; handler: Handler }> = [
  /* ------------------------------ auth ------------------------------ */
  {
    method: "POST",
    pattern: /^\/auth\/login$/,
    handler: ({ config, data }) => {
      const { email } = body<{ email?: string }>(config);
      if (!email?.trim()) throw bad("Email is required.");
      const user = data.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!user) throw new HttpError(401, "invalid_credentials", "No account found for that email.");
      return { token: `token_${user.id}`, user };
    },
  },
  {
    method: "GET",
    pattern: /^\/auth\/me$/,
    handler: ({ me }) => {
      if (!me) throw new HttpError(401, "unauthenticated", "Sign in to continue.");
      return me;
    },
  },
  { method: "POST", pattern: /^\/auth\/logout$/, handler: () => ({ success: true }) },

  /* ---------------------------- reference --------------------------- */
  { method: "GET", pattern: /^\/users$/, handler: ({ data }) => ({ items: data.users }) },
  { method: "GET", pattern: /^\/crm\/snapshot$/, handler: ({ data }) => data },

  /* ---------------------------- dashboard --------------------------- */
  {
    method: "GET",
    pattern: /^\/dashboard\/summary$/,
    handler: ({ data }) => {
      const today = new Date().toISOString().slice(0, 10);
      return {
        totalLeads: data.leads.length,
        byStage: Object.fromEntries(
          data.leads.reduce((m, l) => m.set(l.stage, (m.get(l.stage) ?? 0) + 1), new Map<string, number>()),
        ),
        followUpsDue: data.leads.filter((l) => l.followUpDate && l.followUpDate <= today).length,
        bookings: data.bookings.length,
        bookedValue: data.bookings.reduce((s, b) => s + b.amount, 0),
        unitsAvailable: data.units.filter((u) => u.status === "Available").length,
      };
    },
  },

  /* ------------------------------ leads ----------------------------- */
  {
    method: "GET",
    pattern: /^\/leads$/,
    handler: ({ data, query }) => {
      const q = (query.get("query") ?? "").toLowerCase();
      const stage = query.get("stage");
      const assigneeId = query.get("assigneeId");
      const page = Number(query.get("page") ?? 1);
      const pageSize = Number(query.get("pageSize") ?? 20);
      const items = data.leads.filter(
        (l) =>
          (!q || l.name.toLowerCase().includes(q) || l.phone.includes(q) || l.email.toLowerCase().includes(q)) &&
          (!stage || stage === "all" || l.stage === stage) &&
          (!assigneeId || assigneeId === "all" || l.assigneeId === assigneeId),
      );
      return { items: items.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: items.length };
    },
  },
  {
    method: "POST",
    pattern: /^\/leads$/,
    handler: ({ config, data }) => {
      const input = body<Omit<Lead, "id" | "createdAt">>(config);
      if (!input.name || input.name.trim().length < 2) throw bad("Lead name is required.");
      if (!/^[+\d][\d\s-]{7,}$/.test(String(input.phone ?? "").trim())) throw bad("A valid phone number is required.");
      if (!(Number(input.budget) > 0)) throw bad("Budget must be greater than 0.");
      const duplicate = data.leads.find((l) => l.phone.replace(/\s/g, "") === String(input.phone).replace(/\s/g, ""));
      if (duplicate) throw conflict(`A lead with this phone already exists (${duplicate.name}).`);
      const lead: Lead = { ...input, id: uid("l"), createdAt: new Date().toISOString() };
      data.leads.unshift(lead);
      save(data);
      return lead;
    },
  },
  {
    method: "GET",
    pattern: /^\/leads\/([^/]+)$/,
    handler: ({ params, data }) => {
      const lead = data.leads.find((l) => l.id === params[0]);
      if (!lead) throw notFound("Lead not found.");
      return { ...lead, notes: data.notes.filter((n) => n.leadId === lead.id) };
    },
  },
  {
    method: "PATCH",
    pattern: /^\/leads\/([^/]+)$/,
    handler: ({ config, params, data, me }) => {
      const lead = data.leads.find((l) => l.id === params[0]);
      if (!lead) throw notFound("Lead not found.");
      const patch = body<Partial<Lead>>(config);
      if (patch.assigneeId && patch.assigneeId !== lead.assigneeId && me && me.role !== "Admin") {
        throw forbidden("Only an admin can reassign a lead.");
      }
      if (patch.stage === "Booked" && !data.bookings.some((b) => b.leadId === lead.id)) {
        throw conflict("Create a booking to move this lead to Booked.");
      }
      Object.assign(lead, patch);
      save(data);
      return lead;
    },
  },
  {
    method: "DELETE",
    pattern: /^\/leads\/([^/]+)$/,
    handler: ({ params, data, me }) => {
      if (me && me.role !== "Admin") throw forbidden("Only an admin can delete a lead.");
      const idx = data.leads.findIndex((l) => l.id === params[0]);
      if (idx === -1) throw notFound("Lead not found.");
      data.leads.splice(idx, 1);
      save(data);
      return { success: true };
    },
  },
  {
    method: "GET",
    pattern: /^\/leads\/([^/]+)\/notes$/,
    handler: ({ params, data }) => ({ items: data.notes.filter((n) => n.leadId === params[0]) }),
  },
  {
    method: "POST",
    pattern: /^\/leads\/([^/]+)\/notes$/,
    handler: ({ config, params, data, me }) => {
      const { body: text } = body<{ body?: string }>(config);
      if (!text?.trim()) throw bad("Note cannot be empty.");
      if (!data.leads.some((l) => l.id === params[0])) throw notFound("Lead not found.");
      const note: Note = {
        id: uid("n"),
        leadId: params[0],
        authorId: me?.id ?? "u1",
        body: text.trim(),
        createdAt: new Date().toISOString(),
      };
      data.notes.unshift(note);
      save(data);
      return note;
    },
  },

  /* ---------------------------- properties -------------------------- */
  { method: "GET", pattern: /^\/projects$/, handler: ({ data }) => ({ items: data.projects }) },
  {
    method: "GET",
    pattern: /^\/buildings$/,
    handler: ({ data, query }) => {
      const projectId = query.get("projectId");
      return { items: data.buildings.filter((b) => !projectId || b.projectId === projectId) };
    },
  },
  {
    method: "GET",
    pattern: /^\/units$/,
    handler: ({ data, query }) => {
      const status = query.get("status");
      const buildingId = query.get("buildingId");
      return {
        items: data.units.filter(
          (u) => (!status || status === "all" || u.status === status) && (!buildingId || u.buildingId === buildingId),
        ),
      };
    },
  },
  {
    method: "GET",
    pattern: /^\/units\/([^/]+)$/,
    handler: ({ params, data }) => {
      const unit = data.units.find((u) => u.id === params[0]);
      if (!unit) throw notFound("Unit not found.");
      return unit;
    },
  },

  /* ----------------------------- bookings --------------------------- */
  { method: "GET", pattern: /^\/bookings$/, handler: ({ data }) => ({ items: data.bookings }) },
  {
    method: "POST",
    pattern: /^\/bookings$/,
    handler: ({ config, data, me }) => {
      const { leadId, unitId } = body<{ leadId?: string; unitId?: string }>(config);
      const lead = data.leads.find((l) => l.id === leadId);
      const unit = data.units.find((u) => u.id === unitId);
      if (!lead || !unit) throw notFound("Lead or unit not found.");
      if (lead.stage === "Lost") throw conflict("A lost lead cannot be booked. Reopen it first.");
      // Double-booking guard — the DB equivalent is UNIQUE(unit_id) on bookings.
      if (unit.status === "Sold" || data.bookings.some((b) => b.unitId === unit.id)) {
        throw conflict(`Unit ${unit.code} is already booked by another agent.`);
      }
      const booking: Booking = {
        id: uid("bk"),
        leadId: lead.id,
        unitId: unit.id,
        agentId: me?.id ?? lead.assigneeId,
        amount: unit.price,
        createdAt: new Date().toISOString(),
      };
      data.bookings.unshift(booking);
      unit.status = "Sold";
      lead.stage = "Booked";
      lead.interestedUnitId = unit.id;
      lead.followUpDate = null;
      save(data);
      return booking;
    },
  },
  {
    method: "DELETE",
    pattern: /^\/bookings\/([^/]+)$/,
    handler: ({ config, params, data, me }) => {
      if (me && me.role !== "Admin") throw forbidden("Only an admin can cancel a booking.");
      const idx = data.bookings.findIndex((b) => b.id === params[0]);
      if (idx === -1) throw notFound("Booking not found.");
      const [booking] = data.bookings.splice(idx, 1);
      const unit = data.units.find((u) => u.id === booking.unitId);
      if (unit) unit.status = "Available";
      const lead = data.leads.find((l) => l.id === booking.leadId);
      const stage = (body<{ stage?: LeadStage }>(config).stage ?? "Negotiation") as LeadStage;
      if (lead) lead.stage = stage;
      save(data);
      return { success: true, releasedUnitId: booking.unitId };
    },
  },

  /* ------------------------------- demo ----------------------------- */
  {
    method: "POST",
    pattern: /^\/demo\/reset$/,
    handler: () => {
      const fresh = structuredClone(seed);
      save(fresh);
      return fresh;
    },
  },
];

/* --------------------------------- adapter -------------------------------- */

export const mockAdapter: AxiosAdapter = async (config) => {
  await wait();
  const method = (config.method ?? "get").toUpperCase();
  const url = new URL(config.url ?? "/", "http://mock.local");
  const path = url.pathname.replace(/^\/api/, "");
  const data = db();
  const me = currentUser(config, data);

  const match = routes
    .map((r) => ({ r, m: r.method === method ? r.pattern.exec(path) : null }))
    .find((x) => x.m !== null);

  const respond = (status: number, payload: unknown): AxiosResponse => ({
    data: payload,
    status,
    statusText: status === 201 ? "Created" : "OK",
    headers: {},
    config,
  });

  if (!match?.m) {
    return Promise.reject({
      config,
      response: respond(404, { error: { code: "route_not_found", message: `No route for ${method} ${path}` } }),
    });
  }

  try {
    const payload = match.r.handler({ config, params: match.m.slice(1), query: url.searchParams, data, me });
    return respond(method === "POST" && path !== "/auth/login" ? 201 : 200, payload);
  } catch (e) {
    const err = e instanceof HttpError ? e : new HttpError(500, "server_error", "Something went wrong.");
    return Promise.reject({
      config,
      response: respond(err.status, { error: { code: err.code, message: err.message } }),
    });
  }
};

/**
 * Single source of truth for every REST route the CRM talks to.
 * Components never hardcode a URL — they go through api.ts, which goes
 * through these builders, which go through the axios client in http.ts.
 */
export const endpoints = {
  auth: {
    login: () => "/auth/login",
    me: () => "/auth/me",
    logout: () => "/auth/logout",
  },
  users: {
    list: () => "/users",
  },
  snapshot: () => "/crm/snapshot",
  dashboard: {
    summary: () => "/dashboard/summary",
  },
  leads: {
    list: () => "/leads",
    create: () => "/leads",
    detail: (id: string) => `/leads/${id}`,
    update: (id: string) => `/leads/${id}`,
    remove: (id: string) => `/leads/${id}`,
    notes: (id: string) => `/leads/${id}/notes`,
    stage: (id: string) => `/leads/${id}/stage`,
  },
  properties: {
    projects: () => "/projects",
    buildings: () => "/buildings",
    units: () => "/units",
    unit: (id: string) => `/units/${id}`,
  },
  bookings: {
    list: () => "/bookings",
    create: () => "/bookings",
    cancel: (id: string) => `/bookings/${id}`,
  },
  demo: {
    reset: () => "/demo/reset",
  },
} as const;

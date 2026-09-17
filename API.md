# Manju Groups CRM — API reference

Base URL: `VITE_API_URL` (falls back to `/api`).
All requests and responses are `application/json`.
Auth: `Authorization: Bearer <token>` on every call except `POST /auth/login`.

Until the backend is deployed, an axios adapter (`src/lib/crm/mock-server.ts`)
answers these exact routes from the browser, so the frontend already speaks the
final contract.

Error shape (every non-2xx):

```json
{ "error": { "code": "conflict", "message": "Unit T-702 is already booked by another agent." } }
```

| Code | Used for |
| --- | --- |
| 401 `invalid_credentials` / `unauthenticated` | bad login, missing token |
| 403 `forbidden` | role not allowed (reassign, cancel, delete) |
| 404 `not_found` | unknown lead / unit / booking |
| 409 `conflict` | duplicate phone, double booking, illegal stage jump |
| 422 `validation_failed` | bad field values |

---

## 1. Authentication

### POST /auth/login

```json
{ "email": "arjun@manjugroups.in" }
```

**200**

```json
{
  "token": "token_u1",
  "user": { "id": "u1", "name": "Arjun Rao", "email": "arjun@manjugroups.in", "role": "Admin" }
}
```

### GET /auth/me

**200** `{ "id": "u1", "name": "Arjun Rao", "email": "arjun@manjugroups.in", "role": "Admin" }`

### POST /auth/logout → `{ "success": true }`

---

## 2. Workspace bootstrap

### GET /crm/snapshot

Everything the workspace needs in one round trip (used after every mutation).

**200**

```json
{
  "users": [{ "id": "u1", "name": "Arjun Rao", "email": "arjun@manjugroups.in", "role": "Admin" }],
  "leads": [],
  "notes": [],
  "projects": [{ "id": "p1", "name": "Skyline Residency", "location": "Bandra West" }],
  "buildings": [{ "id": "b1", "projectId": "p1", "name": "Tower A" }],
  "units": [],
  "bookings": []
}
```

### GET /dashboard/summary

**200**

```json
{
  "totalLeads": 9,
  "byStage": { "New": 2, "Contacted": 1, "Site Visit": 2, "Negotiation": 2, "Booked": 2 },
  "followUpsDue": 3,
  "bookings": 2,
  "bookedValue": 43500000,
  "unitsAvailable": 7
}
```

---

## 3. Leads

### GET /leads?query=meera&stage=New&assigneeId=u2&page=1&pageSize=8

**200**

```json
{
  "items": [
    {
      "id": "l_8f2a1b",
      "name": "Rohit Sharma",
      "phone": "+91 98200 41233",
      "email": "rohit@example.com",
      "source": "Website",
      "budget": 18500000,
      "stage": "New",
      "assigneeId": "u2",
      "interestedUnitId": null,
      "followUpDate": "2026-09-19",
      "createdAt": "2026-09-17T10:12:04.001Z"
    }
  ],
  "page": 1,
  "pageSize": 8,
  "total": 1
}
```

### POST /leads  — create lead (step 1 of the flow)

```json
{
  "name": "Rohit Sharma",
  "phone": "+91 98200 41233",
  "email": "rohit@example.com",
  "source": "Website",
  "budget": 18500000,
  "stage": "New",
  "assigneeId": "u2",
  "interestedUnitId": null,
  "followUpDate": "2026-09-19"
}
```

**201** → the created lead object (as above).
**409** if the phone already belongs to another lead.

### GET /leads/:id

**200** the lead plus its notes:

```json
{ "id": "l_8f2a1b", "name": "Rohit Sharma", "stage": "Contacted", "notes": [
  { "id": "n_1", "leadId": "l_8f2a1b", "authorId": "u2", "body": "Called, wants a sea view.", "createdAt": "2026-09-17T11:02:00.000Z" }
] }
```

### PATCH /leads/:id — move the stage / edit / reassign (steps 2–5)

```json
{ "stage": "Site Visit", "followUpDate": "2026-09-22" }
```

**200** the updated lead.
**403** if a Sales Employee tries to change `assigneeId`.
**409** if `stage` is set to `Booked` without an existing booking.

### POST /leads/:id/notes

```json
{ "body": "Site visit done at Tower A, liked T-702." }
```

**201**

```json
{ "id": "n_a91", "leadId": "l_8f2a1b", "authorId": "u2", "body": "Site visit done at Tower A, liked T-702.", "createdAt": "2026-09-18T06:20:11.000Z" }
```

### GET /leads/:id/notes → `{ "items": [ ...notes ] }`

### DELETE /leads/:id (Admin) → `{ "success": true }`

---

## 4. Properties

### GET /projects → `{ "items": [ { "id": "p1", "name": "Skyline Residency", "location": "Bandra West" } ] }`

### GET /buildings?projectId=p1 → `{ "items": [ { "id": "b1", "projectId": "p1", "name": "Tower A" } ] }`

### GET /units?status=Available&buildingId=b1

```json
{
  "items": [
    { "id": "un_7", "buildingId": "b1", "code": "T-702", "type": "3BHK", "areaSqft": 1450, "price": 21500000, "status": "Available" }
  ]
}
```

### GET /units/:id → one unit object.

---

## 5. Bookings (end of the flow)

### POST /bookings — book the unit for the lead

```json
{ "leadId": "l_8f2a1b", "unitId": "un_7" }
```

**201**

```json
{
  "id": "bk_44c1",
  "leadId": "l_8f2a1b",
  "unitId": "un_7",
  "agentId": "u2",
  "amount": 21500000,
  "createdAt": "2026-09-18T07:01:33.000Z"
}
```

Side effects (single transaction on the server): unit → `Sold`, lead → `Booked`,
`followUpDate` cleared.

**409** `Unit T-702 is already booked by another agent.` — enforced by
`UNIQUE(unit_id)` on the bookings table, so two agents racing on the same unit
can never both succeed.
**409** `A lost lead cannot be booked. Reopen it first.`

### GET /bookings → `{ "items": [ ...bookings ] }`

### DELETE /bookings/:id (Admin) — cancel and release the unit

```json
{ "stage": "Negotiation" }
```

**200** `{ "success": true, "releasedUnitId": "un_7" }`

---

## 6. Demo

### POST /demo/reset → a fresh `/crm/snapshot` payload.

---

## Full happy path

```
POST /auth/login                → token
GET  /crm/snapshot              → workspace data
POST /leads                     → New
POST /leads/:id/notes           → call logged
PATCH /leads/:id {stage:"Contacted"}
PATCH /leads/:id {stage:"Site Visit", followUpDate:"..."}
GET  /units?status=Available    → pick a unit
PATCH /leads/:id {stage:"Negotiation", interestedUnitId:"un_7"}
POST /bookings {leadId, unitId} → 201, lead becomes Booked, unit becomes Sold
GET  /bookings                  → confirmed list
DELETE /bookings/:id            → (Admin) cancel, unit back to Available
```

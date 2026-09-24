# Umugano Bar & Guest House

Hospitality management system for **Umugano Bar & Guest House** in Byumba, Rwanda. The application includes a mobile-first bar and kitchen POS, running table tabs, guest-house room management, inventory, thermal receipts, and Neon PostgreSQL persistence.

## Features

- Mobile POS for table orders, instant payments, and room folios
- Open/pay-later table tabs with multiple incremental rounds
- BAR and KITCHEN_MUCOMA production-station routing
- Dispatch tickets with table, waiter, round, notes, and item quantities
- Proforma bill printing before final settlement
- Cash change calculator, MoMo/Airtel Money, card, and room-folio settlement
- Thermal receipts with RWF totals and MoMo merchant details
- Room check-in, availability, cleaning, and active booking dashboard
- Orders ledger, stock ledger, low-stock indicators, and seeded catalog
- Owner-created staff accounts with hiring, activation/deactivation, password resets, and role-based access

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- Lucide React
- Prisma 6
- Neon PostgreSQL

## Getting started

Install dependencies:

```bash
npm install
```

Configure the environment. For Neon, use the linked branch environment variables:

```env
DATABASE_URL="your-pooled-neon-url"
DATABASE_URL_UNPOOLED="your-direct-neon-url"
```

Do not commit `.env` or `.env.neon`.

Initialize or refresh the database:

```bash
npm run setup
```

Or run the steps separately:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Order workflow

1. Select a table, bar tab, or active room folio.
2. Add menu items to the cart. Bar items route to `BAR`; food items route to `KITCHEN_MUCOMA`.
3. Use **Open Tab / Save Order** to keep an unpaid tab open.
4. Use **Send Round to Mucoma/Bar** to dispatch pending items, decrement stock, and create station tickets.
5. Use **Print Bill / Fagitire** for a customer proforma before payment.
6. Use **Pay Now · Instant** or **Settle Bill** to capture Cash, MoMo/Airtel Money, Card, or Room Folio payment.
7. Use the **Active tabs** selector to load a running table, add another round, or settle the existing bill.

## API routes

- `POST /api/orders` — create or append orders; optionally dispatch or instantly settle
- `POST /api/orders/:id/dispatch` — dispatch pending rounds and return station ticket payloads
- `POST /api/orders/:id/settle` — settle an order and return the final receipt payload
- `POST /api/bookings` — check a guest into a room
- `GET/POST /api/users` — list or hire worker accounts
- `PATCH/DELETE /api/users/:id` — update, reset, deactivate, or reactivate an account
- `GET/POST /api/access/grants` — review or grant capabilities
- `GET /api/audit` — review the append-only activity history

## Authentication and roles

The system uses three roles:

- `OWNER`: full access, access management, and audit
- `FRONT_DESK`: full operational access for waiter/receptionist duties
- `MUCOMA`: kitchen queue and kitchen status updates only

Each worker signs in with their own email and password. The Owner can grant temporary or permanent capabilities from `/access`. Grants are recorded, can expire, and can be revoked immediately.

Seed owner variables:

```env
OWNER_EMAIL=...
OWNER_NAME=...
OWNER_PASSWORD=...
```

The seed creates only this bootstrap Owner. The development fallback password is `ChangeMe123!`; change it before deployment. To update the Owner password without resetting business data, set `OWNER_EMAIL` and `OWNER_PASSWORD`, then run `npm run db:passwords`. Passwords are never committed.

## Team and hiring

The seed creates only one bootstrap Owner. The Owner creates all other worker accounts from `/team`; no worker emails or IDs are hardcoded into the application. New accounts receive a temporary password shown once to the Owner. The Owner can deactivate/reactivate accounts and reset passwords. Every account action is audited.

## Audit and stock movements

The activity log at `/activity` is append-only. Product changes, stock movements, logins, access grants/revocations, dispatches, and settlements are recorded with actor and timestamp.

Inventory supports:

- Product CRUD and safe archival
- Refill
- Adjustment
- Waste/spoilage
- Physical stocktake

Kitchen dispatch items can move through `Received → Preparing → Ready → Served` at `/kitchen`.

## Validation

```bash
npm run lint
npm run build
```

## Neon configuration

The project is configured through `neon.ts` and linked to the Neon project/branch in `.neon`. The checked-in `neon.ts` intentionally uses an empty service policy:

```ts
import { defineConfig } from "@neon/config/v1";

export default defineConfig({});
```

Run `neon deploy` after changing the Neon infrastructure policy.

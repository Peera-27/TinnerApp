# TinnerApp — API (Bun + Elysia + PostgreSQL)

Data layer runs on **PostgreSQL** through **Drizzle ORM**, using Bun's built-in
Postgres client (`Bun.SQL`) — the app never loads `pg`; it is a devDependency
because drizzle-kit's CLI needs a driver of its own.

## Setup

1. Create a project on [Supabase](https://supabase.com) (free tier is enough).
2. `cp .env.example .env` and fill in `DATABASE_URL` from **Connect > Session
   pooler** (port 5432). Not the Transaction pooler (6543), which drops session
   state, and not the direct connection, which is IPv6-only.
3. Create the tables:

```bash
bun install
bun run db:migrate     # applies drizzle/*.sql
```

4. Start it:

```bash
bun run dev
```

## Scripts

| script | what it does |
|---|---|
| `bun run dev` | watch-mode server |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run db:generate` | diff `src/db/schema.ts` → new SQL file in `drizzle/` |
| `bun run db:migrate` | apply pending migrations |
| `bun run db:push` | push the schema straight to the DB (dev only, skips migration files) |
| `bun run db:studio` | browse the data in Drizzle Studio |
| `bun run db:import` | one-shot copy of the old MongoDB data (see below) |

## Importing the old MongoDB data

```bash
MONGO_URI="mongodb+srv://..." bun run db:import
```

Mongo ObjectIds are replaced by real uuids, so **every user has to log in again**
— existing JWTs carry the old id. The script refuses to run if `users` already
has rows.

## Layout

```
src/
├─ db/
│  ├─ schema.ts     # tables + relations — the single source of truth
│  ├─ index.ts      # Bun.SQL client + drizzle instance
│  └─ queries.ts    # shared user lookups (photos / follow ids)
├─ helper/
│  ├─ mapper.helper.ts   # row -> API DTO
│  └─ query.helper.ts    # shared WHERE builder for the user lists
├─ services/       # business logic
└─ controllers/    # Elysia routes
```

`followers` / `following` used to be ObjectId arrays on the user document; they
are now rows in the `follows` table (`follower_id` follows `following_id`).

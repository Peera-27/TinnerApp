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

## Deploying

The whole app ships as **one container on one origin**: the Angular build is
copied into the image and served by this same process, so there is no CORS and
the chat websocket connects back to the host the page came from — which is what
the production `environment.ts` expects.

```
docker build -t tinnerapp .        # from the repo root, not sever/
docker run -p 8000:8000 --env-file sever/.env tinnerapp
```

On Render, `render.yaml` describes the service; point a Blueprint at the repo and
fill in the values marked `sync: false`. Migrations run from the container's start
command, so a bad migration fails the deploy instead of booting on a stale schema.

### One instance. Not two.

Chat rooms, hub sockets and presence all live in this process's memory
(`message.controller.ts`, `hub.service.ts`, `presence.service.ts`). A second
instance does not share any of it, so users would be split into halves that
cannot see each other's messages — and the failure only shows up under load.
Moving that state into Postgres or Redis is a prerequisite for scaling out.

### Environment in production

| variable | notes |
|---|---|
| `DATABASE_URL` | Supabase **Session pooler** string (port 5432) |
| `JWT_SECRET` | no fallback — the server refuses to boot without it |
| `APP_URL` | public base URL, used in password-reset mail |
| `CLOUDINARY_*` | name, api key, api secret |
| `PORT` | set by the platform |
| `CLIENT_DIST` | where the Angular build was copied; the image sets it |

Leave **`MODE`** unset: `tls.config.ts` then falls back to `production` and skips
the local dev certificates, letting the platform terminate TLS. Leave
**`MAIL_PROVIDER`** unset until a sender is implemented — `mailer.service.ts`
prints mail to the log instead of failing.

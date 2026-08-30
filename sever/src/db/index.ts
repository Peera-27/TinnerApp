import { SQL } from "bun"
import { drizzle } from "drizzle-orm/bun-sql"
import * as schema from "./schema"

const url = Bun.env.DATABASE_URL
if (!url)
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.")

/**
 * Bun 1.2+ ships a native Postgres client, so there is no `pg` dependency here
 * (`pg` is a devDependency only — drizzle-kit's CLI needs its own driver).
 *
 * Connect through Supabase's *session* pooler (port 5432), not the transaction
 * pooler (6543): session mode behaves like a plain connection, so prepared
 * statements and `db.transaction()` keep working untouched. Supabase's direct
 * endpoint is IPv6-only and unreachable from most networks, so it is not used.
 *
 * This is one long-running process holding its own pool of `max` connections;
 * idle ones are dropped after 30s to hand slots back to the pooler.
 */
export const sql = new SQL({
    url,
    max: Number(Bun.env.DB_POOL_MAX ?? 10),
    idleTimeout: 30,
    connectionTimeout: 30,
})

export const db = drizzle({ client: sql, schema })

export { schema }
export type DB = typeof db

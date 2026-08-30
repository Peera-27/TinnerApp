import { SQL, eq, gte, ilike, lte, sql } from "drizzle-orm"
import type { PgColumn } from "drizzle-orm/pg-core"
import { blocks, users } from "../db/schema"
import { userPaginatoin } from "../types/user.type"

/** Escapes the LIKE wildcards so a username containing % or _ is matched literally. */
function escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

/** Subtracts `years` from today — used to turn an age bound into a date_of_birth bound.
 *  Pinned to UTC midnight: drizzle sends dates as a full ISO string, so a local
 *  time-of-day would land on the previous day once converted to UTC. */
function birthDateForAge(years: number): Date {
    const now = new Date()
    return new Date(Date.UTC(now.getFullYear() - years, now.getMonth(), now.getDate()))
}

/**
 * A block hides both people from each other, whichever side wrote the row, so
 * the filter is the union of both directions rather than only the ids I blocked.
 *
 * The inner columns are written as bare identifiers on purpose. Drizzle's
 * relational query builder rewrites every `${table.column}` in a where clause to
 * the root table's alias, which would turn `blocks.blocker_id` into
 * `users.blocker_id` and break the query.
 */
export function notBlockedWith(user_id: string, column: PgColumn | SQL): SQL {
    return sql`${column} not in (
        select blocked_id from blocks where blocker_id = ${user_id}::uuid
        union
        select blocker_id from blocks where blocked_id = ${user_id}::uuid
    )`
}

export const QueryHelper = {
    /**
     * Builds the WHERE conditions shared by the member list and the
     * followers/following lists. Returns [] when nothing is filtered.
     *
     * `viewer_id` is who is looking: pass it and anyone on either side of a
     * block with them drops out of the result.
     */
    parseUserQuery: function (query: userPaginatoin, viewer_id?: string): SQL[] {
        const filter: SQL[] = []

        // 'all' means "don't filter by gender" — same as the old regex branch
        if (query.gender && query.gender !== "all")
            filter.push(eq(users.gender, query.gender))

        if (query.username)
            filter.push(ilike(users.username, `%${escapeLike(query.username.trim())}%`))

        if (query.looking_for)
            filter.push(eq(users.looking_for, query.looking_for))

        // older than min_age  ->  born on or before (today - min_age years)
        if (query.min_age)
            filter.push(lte(users.date_of_birth, birthDateForAge(query.min_age)))

        // younger than max_age ->  born on or after (today - max_age years)
        if (query.max_age)
            filter.push(gte(users.date_of_birth, birthDateForAge(query.max_age)))

        if (query.location)
            filter.push(ilike(users.location, `%${escapeLike(query.location.trim())}%`))

        if (query.interest)
            filter.push(ilike(users.interest, `%${escapeLike(query.interest.trim())}%`))

        if (viewer_id)
            filter.push(notBlockedWith(viewer_id, users.id))

        return filter
    },
}

/** Postgres sorts NULLs first on DESC; mongo sorted them last. `NULLS LAST` keeps
 *  never-active users at the bottom of the list like before. */
export const byLastActive = sql`${users.last_active} desc nulls last`

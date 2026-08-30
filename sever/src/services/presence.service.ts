import { eq } from "drizzle-orm"
import { db } from "../db"
import { users } from "../db/schema"

/** How long a written `last_active` stays fresh before the next write. */
const THROTTLE_MS = 5 * 60_000

/** user_id -> when its `last_active` was last written by this process. */
const lastWrite = new Map<string, number>()

export const PresenceService = {
    /**
     * Records that a user is around. Called on every authenticated request, so
     * it is throttled to one write per user per few minutes and never awaited —
     * presence must not add latency to the request that triggered it, and a
     * failed write is simply corrected by the next one.
     */
    touch: function (user_id: string): void {
        const now = Date.now()
        const previous = lastWrite.get(user_id)
        if (previous && now - previous < THROTTLE_MS) return
        lastWrite.set(user_id, now)

        db.update(users)
            .set({ last_active: new Date(now) })
            .where(eq(users.id, user_id))
            .execute()
            .catch(error => console.error("last_active update failed", error))
    },

    /** Writes the timestamp straight away — used at login, where it is part of
     *  the response the caller gets back. */
    set: async function (user_id: string, at: Date = new Date()): Promise<Date> {
        lastWrite.set(user_id, at.getTime())
        await db.update(users)
            .set({ last_active: at })
            .where(eq(users.id, user_id))
        return at
    },
}

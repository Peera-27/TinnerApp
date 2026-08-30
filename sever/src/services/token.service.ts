import { and, eq, isNull, lt, or } from "drizzle-orm"
import { db } from "../db"
import { refresh_tokens } from "../db/schema"

/** How long a signed-out-of-sight session stays valid. */
const REFRESH_TTL_MS = 30 * 24 * 60 * 60_000

/**
 * Only the hash is ever stored. A dump of the table is therefore not a set of
 * working sessions, the same reason passwords are not stored in the clear.
 */
function hashToken(token: string): string {
    return new Bun.CryptoHasher("sha256").update(token).digest("hex")
}

function newToken(): string {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    return Buffer.from(bytes).toString("base64url")
}

export const TokenService = {
    /** Starts a session and returns the token the client keeps. */
    issue: async function (user_id: string): Promise<string> {
        const token = newToken()
        await db.insert(refresh_tokens).values({
            user_id,
            token_hash: hashToken(token),
            expires_at: new Date(Date.now() + REFRESH_TTL_MS),
        })
        return token
    },

    /**
     * Trades a refresh token for a fresh pair. The old one is revoked in the
     * same step, so a token that is replayed after use is already dead.
     */
    rotate: async function (token: string): Promise<{ user_id: string, refresh_token: string } | null> {
        const row = await db.query.refresh_tokens.findFirst({
            where: eq(refresh_tokens.token_hash, hashToken(token)),
        })
        if (!row) return null
        if (row.revoked_at || row.expires_at.getTime() <= Date.now()) return null

        await db.update(refresh_tokens)
            .set({ revoked_at: new Date() })
            .where(eq(refresh_tokens.id, row.id))

        return { user_id: row.user_id, refresh_token: await TokenService.issue(row.user_id) }
    },

    /** Signing out. Unknown tokens are ignored — there is nothing to report. */
    revoke: async function (token: string): Promise<void> {
        await db.update(refresh_tokens)
            .set({ revoked_at: new Date() })
            .where(and(
                eq(refresh_tokens.token_hash, hashToken(token)),
                isNull(refresh_tokens.revoked_at),
            ))
    },

    /** Ends every session a user has — used when the password changes. */
    revokeAll: async function (user_id: string): Promise<void> {
        await db.update(refresh_tokens)
            .set({ revoked_at: new Date() })
            .where(and(
                eq(refresh_tokens.user_id, user_id),
                isNull(refresh_tokens.revoked_at),
            ))
    },

    /** Housekeeping: drops rows that can never be used again. */
    prune: async function (): Promise<void> {
        await db.delete(refresh_tokens).where(or(
            lt(refresh_tokens.expires_at, new Date()),
            lt(refresh_tokens.revoked_at, new Date(Date.now() - REFRESH_TTL_MS)),
        ))
    },
}

export { hashToken, newToken }

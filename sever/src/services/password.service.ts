import { and, eq, isNull } from "drizzle-orm"
import { db } from "../db"
import { password_resets, users } from "../db/schema"
import { isValidPassword, PASSWORD_REQUIREMENTS } from "../helper/validation.helper"
import { MailerService } from "./mailer.service"
import { TokenService, hashToken, newToken } from "./token.service"

/** A reset link is meant to be used within the hour it was asked for. */
const RESET_TTL_MS = 60 * 60_000

function resetLink(token: string): string {
    const base = Bun.env.APP_URL ?? "http://localhost:4200"
    return `${base.replace(/\/$/, "")}/reset-password?token=${token}`
}

export const PasswordService = {
    /**
     * Starts a reset. Answers the same way whether or not the address belongs to
     * an account — otherwise the endpoint would tell a stranger which emails are
     * registered here.
     */
    requestReset: async function (email: string): Promise<void> {
        const user = await db.query.users.findFirst({
            where: eq(users.email, email.trim().toLowerCase()),
            columns: { id: true, email: true, display_name: true },
        })
        if (!user?.email) return

        // any earlier link is spent the moment a new one is asked for
        await db.update(password_resets)
            .set({ used_at: new Date() })
            .where(and(eq(password_resets.user_id, user.id), isNull(password_resets.used_at)))

        const token = newToken()
        await db.insert(password_resets).values({
            user_id: user.id,
            token_hash: hashToken(token),
            expires_at: new Date(Date.now() + RESET_TTL_MS),
        })

        // A provider that is down, or a key that is wrong, must not change the
        // answer this endpoint gives. Letting the error out would turn an
        // unregistered address into a 204 and a registered one into a 500 —
        // exactly the difference the uniform reply is here to hide. The row is
        // already written, so the link itself stays valid; what was lost is the
        // delivery, and that is the operator's to see in the log.
        try {
            await MailerService.send(
                user.email,
                "Reset your Tinner password",
                [
                    `Hi ${user.display_name ?? "there"},`,
                    "",
                    "Someone asked to reset the password on your Tinner account.",
                    "If that was you, open the link below within the next hour:",
                    "",
                    resetLink(token),
                    "",
                    "If it was not you, you can ignore this message — nothing has changed.",
                ].join("\n"),
            )
        } catch (error) {
            console.error("password reset mail failed to send", error)
        }
    },

    /** Spends a reset link. Every existing session is ended along with it. */
    reset: async function (token: string, password: string): Promise<void> {
        if (!isValidPassword(password))
            throw new Error(PASSWORD_REQUIREMENTS)

        const row = await db.query.password_resets.findFirst({
            where: eq(password_resets.token_hash, hashToken(token)),
        })
        if (!row || row.used_at || row.expires_at.getTime() <= Date.now())
            throw new Error("This reset link is no longer valid")

        await db.update(users)
            .set({ password_hash: await Bun.password.hash(password) })
            .where(eq(users.id, row.user_id))

        await db.update(password_resets)
            .set({ used_at: new Date() })
            .where(eq(password_resets.id, row.id))

        // whoever forced the reset should not keep a session they already had
        await TokenService.revokeAll(row.user_id)
    },

    /** Changing the password while signed in — the current one is required. */
    change: async function (user_id: string, current: string, next: string): Promise<void> {
        if (!isValidPassword(next))
            throw new Error(PASSWORD_REQUIREMENTS)

        const user = await db.query.users.findFirst({
            where: eq(users.id, user_id),
            columns: { id: true, password_hash: true },
        })
        if (!user) throw new Error("User Does not exist")

        if (!await Bun.password.verify(current, user.password_hash))
            throw new Error("Current password is incorrect")

        await db.update(users)
            .set({ password_hash: await Bun.password.hash(next) })
            .where(eq(users.id, user_id))

        await TokenService.revokeAll(user_id)
    },
}

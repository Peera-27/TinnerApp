import { eq } from "drizzle-orm"
import { db } from "../db"
import { findUserWithFollows } from "../db/queries"
import { users } from "../db/schema"
import { toSelfUser } from "../helper/mapper.helper"
import { normalizeEmail } from "../helper/validation.helper"
import { login, register } from "../types/account.types"
import { user } from "../types/user.type"
import { PresenceService } from "./presence.service"

export const AccountService = {
    login: async function (loginData: login): Promise<user> {
        const found = await findUserWithFollows({ username: loginData.username })
        if (!found)
            throw new Error("User Does not exist")

        const verifyPassword = await Bun.password.verify(loginData.password, found.password_hash)
        if (!verifyPassword)
            throw new Error("Password is incorrect")

        // signing in is the strongest sign of life there is, so it is written
        // immediately and handed back with the user
        const last_active = await PresenceService.set(found.id)

        return toSelfUser({ ...found, last_active })
    },

    createNewUser: async function (registerData: register): Promise<user> {
        const existing = await db.query.users.findFirst({
            where: (u, { eq }) => eq(u.username, registerData.username),
            columns: { id: true },
        })
        if (existing)
            throw new Error(`${registerData.username} already exists`)

        const email = normalizeEmail(registerData.email)
        if (email) {
            const taken = await db.query.users.findFirst({
                where: eq(users.email, email),
                columns: { id: true },
            })
            if (taken) throw new Error("That email is already in use")
        }

        const now = new Date()
        const [newUser] = await db.insert(users).values({
            username: registerData.username,
            email,
            password_hash: await Bun.password.hash(registerData.password),
            display_name: registerData.display_name,
            date_of_birth: registerData.date_of_birth,
            looking_for: registerData.looking_for,
            gender: registerData.gender,
            last_active: now,
        }).returning()

        return toSelfUser({ ...newUser, photos: [], following: [], followers: [] })
    },

    /** The signed-in user's own record, including the fields only they see. */
    me: async function (user_id: string): Promise<user> {
        const found = await findUserWithFollows({ id: user_id })
        if (!found) throw new Error("User Does not exist")
        return toSelfUser(found)
    },
}

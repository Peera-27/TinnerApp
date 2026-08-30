import { and, count, eq, ne, sql } from "drizzle-orm"
import { db } from "../db"
import { findUserWithPhotos } from "../db/queries"
import { follows, passes, users } from "../db/schema"
import { toSelfUser, toUser } from "../helper/mapper.helper"
import { QueryHelper, byLastActive, notBlockedWith } from "../helper/query.helper"
import { normalizeEmail } from "../helper/validation.helper"
import { updateProfile, user, userPaginatoin, userPaginator } from "../types/user.type"


export const UserService = {
    get: async function (pagination: userPaginatoin, user_id: string): Promise<userPaginator> {
        // everyone except me and anyone I am blocked with, plus the filters
        const where = and(ne(users.id, user_id), ...QueryHelper.parseUserQuery(pagination, user_id))
        const offset = pagination.pageSize * (pagination.currentPage - 1)

        const [docs, total] = await Promise.all([
            db.query.users.findMany({
                where,
                with: { photos: true },
                orderBy: byLastActive,
                limit: pagination.pageSize,
                offset,
            }),
            db.select({ value: count() }).from(users).where(where),
        ])

        pagination.length = total[0].value
        return {
            pagination: pagination,
            items: docs.map(toUser),
        }
    },

    /**
     * The swipe deck: the member list minus everyone already decided on, so a
     * face never comes back after it has been hearted or passed.
     */
    getDeck: async function (pagination: userPaginatoin, user_id: string): Promise<userPaginator> {
        const where = and(
            ne(users.id, user_id),
            ...QueryHelper.parseUserQuery(pagination, user_id),
            // bare identifiers inside the subqueries — see the note on
            // `notBlockedWith`: drizzle would re-point `follows.follower_id` at
            // the root table and the query would stop making sense
            sql`${users.id} not in (select following_id from follows where follower_id = ${user_id}::uuid)`,
            sql`${users.id} not in (select target_id from passes where user_id = ${user_id}::uuid)`,
        )
        const offset = pagination.pageSize * (pagination.currentPage - 1)

        const [docs, total] = await Promise.all([
            db.query.users.findMany({
                where,
                with: { photos: true },
                orderBy: byLastActive,
                limit: pagination.pageSize,
                offset,
            }),
            db.select({ value: count() }).from(users).where(where),
        ])

        pagination.length = total[0].value
        return { pagination, items: docs.map(toUser) }
    },

    getByuserName: async function (username: string, viewer_id?: string): Promise<user> {
        const found = await findUserWithPhotos({ username })
        if (!found)
            throw new Error(`"Username: "${username}"not found!!!`)

        // a blocked profile answers exactly like a missing one, so neither side
        // can tell a block apart from a deleted account
        if (viewer_id && found.id !== viewer_id) {
            const [visible] = await db.select({ id: users.id })
                .from(users)
                .where(and(eq(users.id, found.id), notBlockedWith(viewer_id, users.id)))
            if (!visible)
                throw new Error(`"Username: "${username}"not found!!!`)
        }

        return toUser(found)
    },

    updateProfile: async function (newProfile: updateProfile, user_id: string): Promise<user> {
        const email = normalizeEmail(newProfile.email)
        if (email) {
            const taken = await db.query.users.findFirst({
                where: and(eq(users.email, email), ne(users.id, user_id)),
                columns: { id: true },
            })
            if (taken) throw new Error("That email is already in use")
        }

        // set the profile columns explicitly — the DTO also carries `photos`,
        // which is a separate table and must never be written from here
        const [updated] = await db.update(users)
            .set({
                display_name: newProfile.display_name,
                date_of_birth: newProfile.date_of_birth,
                introduction: newProfile.introduction,
                interest: newProfile.interest,
                looking_for: newProfile.looking_for,
                location: newProfile.location,
                gender: newProfile.gender,
                email,
            })
            .where(eq(users.id, user_id))
            .returning()

        if (updated)
            return toSelfUser(updated)
        throw new Error("Something went wrong , try again later")
    },

    /** "Not for me" from the deck. Idempotent so a double swipe is harmless. */
    pass: async function (user_id: string, target_id: string): Promise<void> {
        if (user_id === target_id) throw new Error("Invalid target_id")

        const target = await db.query.users.findFirst({
            where: eq(users.id, target_id),
            columns: { id: true },
        })
        if (!target) throw new Error("Invalid target_id")

        await db.insert(passes)
            .values({ user_id, target_id })
            .onConflictDoNothing()
    },

    /** Undo — puts one passed person back into the deck. */
    unpass: async function (user_id: string, target_id: string): Promise<void> {
        await db.delete(passes).where(and(
            eq(passes.user_id, user_id),
            eq(passes.target_id, target_id),
        ))
    },
}

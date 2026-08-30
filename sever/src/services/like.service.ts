import { SQLWrapper, and, count, eq, inArray } from "drizzle-orm"
import { db } from "../db"
import { follows, users } from "../db/schema"
import { isUuid } from "../helper/id.helper"
import { toUser } from "../helper/mapper.helper"
import { QueryHelper, byLastActive } from "../helper/query.helper"
import { userPaginatoin, userPaginator } from "../types/user.type"
import { BlockService } from "./block.service"
import { NotificationService } from "./notification.service"

/** What a like turned into: whether it is now on, and whether it completed a pair. */
export type likeResult = { liked: boolean, matched: boolean }

/** Runs the shared user list query against a subset of user ids. */
async function listUsers(idSource: SQLWrapper, pagination: userPaginatoin, viewer_id: string): Promise<userPaginator> {
    const where = and(inArray(users.id, idSource), ...QueryHelper.parseUserQuery(pagination, viewer_id))
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
}

export const LikeService = {
    /**
     * One row in `follows` replaces the two-sided `$addToSet` / `$pull` the mongo
     * version had to keep in sync by hand, so a like can no longer end up written
     * on one side only.
     */
    toggleLike: async function (user_id: string, target_id: string): Promise<likeResult> {
        if (!isUuid(target_id))
            throw new Error("Invalid target_id")
        if (user_id === target_id)
            throw new Error("Invalid target_id")

        const target = await db.query.users.findFirst({
            where: eq(users.id, target_id),
            columns: { id: true },
        })
        if (!target)
            throw new Error("Invalid target_id")

        if (await BlockService.isBlocked(user_id, target_id))
            throw new Error("Invalid target_id")

        const link = and(eq(follows.follower_id, user_id), eq(follows.following_id, target_id))
        const existing = await db.query.follows.findFirst({ where: link })

        if (existing)
            await db.delete(follows).where(link)
        else
            await db.insert(follows)
                .values({ follower_id: user_id, following_id: target_id })
                .onConflictDoNothing()

        const liked = !existing
        if (!liked)
            return { liked, matched: false }

        // a like that lands on someone who already liked you is a match — the
        // client uses this to celebrate instead of silently ticking a heart
        const back = await db.query.follows.findFirst({
            where: and(eq(follows.follower_id, target_id), eq(follows.following_id, user_id)),
        })
        const matched = back !== undefined

        // both sides hear about a match; only the receiver hears about a like
        if (matched) {
            await NotificationService.create(target_id, user_id, "match")
            await NotificationService.create(user_id, target_id, "match")
        } else {
            await NotificationService.create(target_id, user_id, "like")
        }

        return { liked, matched }
    },

    /** Users who follow me. */
    getFollowers: function (user_id: string, pagination: userPaginatoin): Promise<userPaginator> {
        const followerIds = db.select({ id: follows.follower_id })
            .from(follows)
            .where(eq(follows.following_id, user_id))
        return listUsers(followerIds, pagination, user_id)
    },

    /** Users I follow. */
    getFollowing: function (user_id: string, pagination: userPaginatoin): Promise<userPaginator> {
        const followingIds = db.select({ id: follows.following_id })
            .from(follows)
            .where(eq(follows.follower_id, user_id))
        return listUsers(followingIds, pagination, user_id)
    },

    /** Mutual likes: people I follow who follow me back. */
    getMatches: function (user_id: string, pagination: userPaginatoin): Promise<userPaginator> {
        const iFollow = db.select({ id: follows.following_id })
            .from(follows)
            .where(eq(follows.follower_id, user_id))

        const mutualIds = db.select({ id: follows.follower_id })
            .from(follows)
            .where(and(eq(follows.following_id, user_id), inArray(follows.follower_id, iFollow)))

        return listUsers(mutualIds, pagination, user_id)
    },
}

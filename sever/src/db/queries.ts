import { eq } from "drizzle-orm"
import { UserRowWithRelations } from "../helper/mapper.helper"
import { db } from "."
import { users } from "./schema"

/** `with` clause reproducing the old `.populate("photos"/"following"/"followers")`.
 *  Drizzle resolves these in a single round trip. */
const withRelations = {
    photos: true,
    following: { columns: { following_id: true } },
    followers: { columns: { follower_id: true } },
} as const

type FollowsRow = { following: { following_id: string }[]; followers: { follower_id: string }[] }

function flatten<T extends FollowsRow>(row: T): UserRowWithRelations {
    const { following, followers, ...rest } = row
    return {
        ...(rest as unknown as UserRowWithRelations),
        following: following.map(f => f.following_id),
        followers: followers.map(f => f.follower_id),
    }
}

const whereUser = (by: { id: string } | { username: string }) =>
    "id" in by ? eq(users.id, by.id) : eq(users.username, by.username)

/** User + photos + the ids they follow / are followed by. Used by login & register. */
export async function findUserWithFollows(by: { id: string } | { username: string }) {
    const row = await db.query.users.findFirst({ where: whereUser(by), with: withRelations })
    if (!row) return undefined
    return flatten(row) as UserRowWithRelations & { password_hash: string }
}

/** User + photos only. Used where the follow ids are not part of the response. */
export async function findUserWithPhotos(by: { id: string } | { username: string }) {
    return db.query.users.findFirst({ where: whereUser(by), with: { photos: true } })
}

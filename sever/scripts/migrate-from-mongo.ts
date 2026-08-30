/**
 * One-shot copy of the existing Atlas data into Postgres.
 *
 *   MONGO_URI="mongodb+srv://..." DATABASE_URL="postgres://..." bun run db:import
 *
 * Mongo ObjectIds are replaced by real uuids, so every id is remapped through
 * `idMap` before it is written as a foreign key. Existing JWTs embed the old
 * ObjectId and stop resolving — everyone has to log in once after the switch.
 *
 * Safe to re-run: it refuses to start unless the target tables are empty.
 */
import { count } from "drizzle-orm"
import mongoose from "mongoose"
import { db, sql } from "../src/db"
import { follows, messages, photos, users } from "../src/db/schema"

const MONGO_URI = Bun.env.MONGO_URI
if (!MONGO_URI) throw new Error("MONGO_URI is not set")

const CHUNK = 500
const idMap = new Map<string, string>()

const uuidFor = (objectId: unknown): string => {
    const key = String(objectId)
    let id = idMap.get(key)
    if (!id) {
        id = crypto.randomUUID()
        idMap.set(key, id)
    }
    return id
}

async function insertChunked<T>(table: any, rows: T[], label: string) {
    for (let i = 0; i < rows.length; i += CHUNK)
        await db.insert(table).values(rows.slice(i, i + CHUNK))
    console.log(`  ${label}: ${rows.length}`)
}

async function main() {
    const [{ value: existing }] = await db.select({ value: count() }).from(users)
    if (existing > 0)
        throw new Error(`refusing to run: "users" already has ${existing} rows`)

    await mongoose.connect(MONGO_URI!)
    const mongo = mongoose.connection.db!
    console.log("connected to mongo, reading collections...")

    const userDocs = await mongo.collection("users").find().toArray()
    const photoDocs = await mongo.collection("photos").find().toArray()
    const messageDocs = await mongo.collection("messages").find().toArray()

    // pre-seed the map so foreign keys resolve regardless of insert order
    for (const doc of userDocs) uuidFor(doc._id)

    console.log("writing to postgres...")

    await insertChunked(users, userDocs.map(doc => ({
        id: uuidFor(doc._id),
        username: doc.username,
        password_hash: doc.password_hash,
        display_name: doc.display_name ?? null,
        date_of_birth: doc.date_of_birth ?? null,
        last_active: doc.last_active ?? null,
        introduction: doc.introduction ?? null,
        interest: doc.interest ?? null,
        looking_for: doc.looking_for ?? "all",
        location: doc.location ?? null,
        gender: doc.gender ?? null,
        created_at: doc.create_at ?? new Date(),
        updated_at: doc.updated_at ?? new Date(),
    })), "users")

    const knownUsers = new Set(userDocs.map(doc => String(doc._id)))

    await insertChunked(photos, photoDocs
        .filter(doc => knownUsers.has(String(doc.user)))
        .map(doc => ({
            id: uuidFor(doc._id),
            user_id: uuidFor(doc.user),
            public_id: doc.public_id,
            url: doc.url,
            is_avatar: doc.is_avatar ?? false,
            created_at: doc.created_at ?? new Date(),
        })), "photos")

    // `following` is the source of truth; the mirrored `followers` array is
    // derived from it, so reading both would just produce duplicate rows
    const followRows = new Map<string, { follower_id: string, following_id: string }>()
    for (const doc of userDocs) {
        for (const target of (doc.following ?? [])) {
            if (!knownUsers.has(String(target))) continue
            if (String(target) === String(doc._id)) continue
            const row = { follower_id: uuidFor(doc._id), following_id: uuidFor(target) }
            followRows.set(`${row.follower_id}:${row.following_id}`, row)
        }
    }
    await insertChunked(follows, [...followRows.values()], "follows")

    await insertChunked(messages, messageDocs
        .filter(doc => knownUsers.has(String(doc.sender)) && knownUsers.has(String(doc.receiver)))
        .map(doc => ({
            id: uuidFor(doc._id),
            sender_id: uuidFor(doc.sender),
            receiver_id: uuidFor(doc.receiver),
            content: doc.content,
            read_at: doc.read_at ?? null,
            sender_delete: doc.sender_delete ?? false,
            receiver_delete: doc.receiver_delete ?? false,
            created_at: doc.created_at ?? new Date(),
        })), "messages")

    console.log("done ✅  everyone needs to log in again (user ids changed)")
}

await main()
    .catch(err => { console.error(err); process.exitCode = 1 })
    .finally(async () => {
        await mongoose.disconnect().catch(() => { })
        await sql.close().catch(() => { })
    })

import { relations } from "drizzle-orm"
import {
    boolean,
    date,
    index,
    pgTable,
    primaryKey,
    text,
    timestamp,
    uniqueIndex,
    uuid,
    varchar,
} from "drizzle-orm/pg-core"

export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    username: varchar("username", { length: 50 }).notNull(),
    /** Optional on purpose: accounts created before this column existed have
     *  none, and password recovery is the only thing that needs it. */
    email: varchar("email", { length: 255 }),
    password_hash: text("password_hash").notNull(),
    display_name: varchar("display_name", { length: 100 }),
    date_of_birth: date("date_of_birth", { mode: "date" }),
    last_active: timestamp("last_active", { withTimezone: true }),
    introduction: text("introduction"),
    interest: text("interest"),
    looking_for: varchar("looking_for", { length: 10 }).default("all"),
    location: varchar("location", { length: 100 }),
    gender: varchar("gender", { length: 10 }),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
    uniqueIndex("users_username_unique_idx").on(table.username),
    // postgres lets a unique index hold any number of NULLs, so accounts
    // without an email do not collide with each other
    uniqueIndex("users_email_unique_idx").on(table.email),
    index("users_last_active_idx").on(table.last_active),
])

export const photos = pgTable("photos", {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    public_id: text("public_id").notNull(),
    url: text("url").notNull(),
    is_avatar: boolean("is_avatar").notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index("photos_user_id_idx").on(table.user_id),
])

/**
 * Replaces the `following` / `followers` ObjectId arrays that used to live on the
 * user document. One row = "follower_id follows following_id", so a like can no
 * longer end up half-written on one side.
 */
export const follows = pgTable("follows", {
    follower_id: uuid("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    following_id: uuid("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    primaryKey({ columns: [table.follower_id, table.following_id] }),
    index("follows_following_id_idx").on(table.following_id),
])

export const messages = pgTable("messages", {
    id: uuid("id").primaryKey().defaultRandom(),
    sender_id: uuid("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    receiver_id: uuid("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    read_at: timestamp("read_at", { withTimezone: true }),
    sender_delete: boolean("sender_delete").notNull().default(false),
    receiver_delete: boolean("receiver_delete").notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    // mirrors the two compound indexes from the old mongoose schema
    index("messages_thread_idx").on(table.sender_id, table.receiver_id, table.created_at),
    index("messages_unread_idx").on(table.receiver_id, table.sender_id, table.read_at),
])

/**
 * Things that happened to you while you were not looking: someone liked you,
 * a like turned into a match, or a message arrived outside an open chat.
 */
export const notifications = pgTable("notifications", {
    id: uuid("id").primaryKey().defaultRandom(),
    /** who receives it */
    user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** who caused it */
    actor_id: uuid("actor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 20 }).notNull(),
    message_id: uuid("message_id").references(() => messages.id, { onDelete: "cascade" }),
    read_at: timestamp("read_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index("notifications_inbox_idx").on(table.user_id, table.created_at),
    index("notifications_unread_idx").on(table.user_id, table.read_at),
])

/**
 * A block is one-directional as written but enforced both ways: neither side
 * sees or can reach the other once a row exists.
 */
export const blocks = pgTable("blocks", {
    blocker_id: uuid("blocker_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    blocked_id: uuid("blocked_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    primaryKey({ columns: [table.blocker_id, table.blocked_id] }),
    index("blocks_blocked_id_idx").on(table.blocked_id),
])

export const reports = pgTable("reports", {
    id: uuid("id").primaryKey().defaultRandom(),
    reporter_id: uuid("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    reported_id: uuid("reported_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    reason: varchar("reason", { length: 40 }).notNull(),
    detail: text("detail"),
    status: varchar("status", { length: 20 }).notNull().default("open"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index("reports_status_idx").on(table.status, table.created_at),
    index("reports_reported_id_idx").on(table.reported_id),
])

/** "Not for me" from the swipe deck — keeps the same face from coming back. */
export const passes = pgTable("passes", {
    user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    target_id: uuid("target_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    primaryKey({ columns: [table.user_id, table.target_id] }),
])

/**
 * Long-lived sessions. Only the hash is stored, so a leaked table cannot be
 * replayed, and `revoked_at` makes signing out actually end the session.
 */
export const refresh_tokens = pgTable("refresh_tokens", {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    token_hash: text("token_hash").notNull(),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    revoked_at: timestamp("revoked_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    uniqueIndex("refresh_tokens_hash_unique_idx").on(table.token_hash),
    index("refresh_tokens_user_id_idx").on(table.user_id),
])

/** One-shot password reset links. Same rule: the plain token never lands here. */
export const password_resets = pgTable("password_resets", {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    token_hash: text("token_hash").notNull(),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    used_at: timestamp("used_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    uniqueIndex("password_resets_hash_unique_idx").on(table.token_hash),
    index("password_resets_user_id_idx").on(table.user_id),
])

//#region relations
export const usersRelations = relations(users, ({ many }) => ({
    photos: many(photos),
    following: many(follows, { relationName: "follower" }),
    followers: many(follows, { relationName: "following" }),
    sent_messages: many(messages, { relationName: "sender" }),
    received_messages: many(messages, { relationName: "receiver" }),
    notifications: many(notifications, { relationName: "notified" }),
    caused_notifications: many(notifications, { relationName: "actor" }),
    blocking: many(blocks, { relationName: "blocker" }),
    blocked_by: many(blocks, { relationName: "blocked" }),
}))

export const photosRelations = relations(photos, ({ one }) => ({
    user: one(users, { fields: [photos.user_id], references: [users.id] }),
}))

export const followsRelations = relations(follows, ({ one }) => ({
    follower: one(users, { fields: [follows.follower_id], references: [users.id], relationName: "follower" }),
    following: one(users, { fields: [follows.following_id], references: [users.id], relationName: "following" }),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
    sender: one(users, { fields: [messages.sender_id], references: [users.id], relationName: "sender" }),
    receiver: one(users, { fields: [messages.receiver_id], references: [users.id], relationName: "receiver" }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
    user: one(users, { fields: [notifications.user_id], references: [users.id], relationName: "notified" }),
    actor: one(users, { fields: [notifications.actor_id], references: [users.id], relationName: "actor" }),
    message: one(messages, { fields: [notifications.message_id], references: [messages.id] }),
}))

export const blocksRelations = relations(blocks, ({ one }) => ({
    blocker: one(users, { fields: [blocks.blocker_id], references: [users.id], relationName: "blocker" }),
    blocked: one(users, { fields: [blocks.blocked_id], references: [users.id], relationName: "blocked" }),
}))
//#endregion

export type UserRow = typeof users.$inferSelect
export type PhotoRow = typeof photos.$inferSelect
export type MessageRow = typeof messages.$inferSelect
export type NotificationRow = typeof notifications.$inferSelect
export type ReportRow = typeof reports.$inferSelect

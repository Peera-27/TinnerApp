const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Postgres raises a cast error (a 500) when a non-uuid string reaches a uuid
 * column, so any id coming from the request is checked here first and turned
 * into the same "not found / invalid" error the mongo version returned.
 */
export function isUuid(value: unknown): value is string {
    return typeof value === "string" && UUID_RE.test(value)
}

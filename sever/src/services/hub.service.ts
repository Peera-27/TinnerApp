/**
 * The per-user socket registry behind presence and live notifications.
 *
 * The chat socket in `message.controller` is per-conversation and only exists
 * while a chat pane is open. The hub is the opposite: one socket per signed-in
 * tab, open for as long as the app is, which is what makes "who is online" and
 * "you got a like while you were reading something else" possible.
 */

/** The slice of an Elysia websocket the hub actually uses. */
export type Socket = { send(data: unknown): unknown }

export type HubEvent =
    | { type: "notification", payload: unknown }
    | { type: "presence", user_id: string, online: boolean }
    | { type: "hello", online: string[] }

const sockets = new Map<string, Set<Socket>>()

export const HubService = {
    /** Registers a socket and reports whether this user just came online. */
    join: function (user_id: string, socket: Socket): boolean {
        let owned = sockets.get(user_id)
        const wasOffline = owned === undefined || owned.size === 0
        if (!owned) {
            owned = new Set()
            sockets.set(user_id, owned)
        }
        owned.add(socket)
        return wasOffline
    },

    /** Drops a socket and reports whether that was the user's last one. */
    leave: function (user_id: string, socket: Socket): boolean {
        const owned = sockets.get(user_id)
        if (!owned) return false
        owned.delete(socket)
        if (owned.size > 0) return false
        sockets.delete(user_id)
        return true
    },

    isOnline: function (user_id: string): boolean {
        return (sockets.get(user_id)?.size ?? 0) > 0
    },

    onlineIds: function (): string[] {
        return Array.from(sockets.keys())
    },

    /** Sends an event to every tab one person has open. Silent when they are away. */
    send: function (user_id: string, event: HubEvent): void {
        const owned = sockets.get(user_id)
        if (!owned) return
        for (const socket of owned) {
            try { socket.send(event) } catch { /* a socket closing mid-send is normal */ }
        }
    },

    /** Sends an event to everyone connected — used for presence changes. */
    broadcast: function (event: HubEvent, except?: string): void {
        for (const [user_id, owned] of sockets) {
            if (user_id === except) continue
            for (const socket of owned) {
                try { socket.send(event) } catch { /* ditto */ }
            }
        }
    },
}

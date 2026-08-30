import { t } from "elysia"

export const _register = t.Object({
    username: t.String(),
    password: t.String(),
    /** Optional. Only ever sent back on your own account — a listing maps
     *  through `toUser`, which never fills it in. */
    email: t.Optional(t.String({ maxLength: 255 })),
    display_name: t.String({ maxLength: 100 }),
    date_of_birth: t.Optional(t.Date()),
    looking_for: t.Union([t.Literal('male'), t.Literal('female'), t.Literal('all')]),
    gender: t.Optional(t.Union([t.Literal('male'), t.Literal('female'), t.Literal('all')])),
})
import Elysia, { t, Static } from "elysia"
import { _register } from "./register.types"
import { _user } from "./user.type"

export const _login = t.Object({

    username: t.String(),
    password: t.String()
})



export const _userAndToken = t.Object({
    user: _user,
    token: t.String(),
    /** Long-lived; trades for a new pair at /api/account/refresh. */
    refresh_token: t.String(),
})

/** What a refresh gives back — no user payload, just the new pair. */
export const _tokenPair = t.Object({
    token: t.String(),
    refresh_token: t.String(),
})

export const _refreshRequest = t.Object({ refresh_token: t.String() })
export const _forgotPassword = t.Object({ email: t.String({ maxLength: 255 }) })
export const _resetPassword = t.Object({ token: t.String(), password: t.String() })
export const _changePassword = t.Object({
    current_password: t.String(),
    new_password: t.String(),
})

export const AccountDto = new Elysia().model({
    //request
    register: _register,
    login: _login,
    refresh_request: _refreshRequest,
    forgot_password: _forgotPassword,
    reset_password: _resetPassword,
    change_password: _changePassword,
    //response
    user_and_token: _userAndToken,
    token_pair: _tokenPair,
    me: _user,
})


export type register = Static<typeof _register>
export type login = Static<typeof _login>

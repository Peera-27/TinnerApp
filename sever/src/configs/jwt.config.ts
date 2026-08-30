import jwt from "@elysiajs/jwt"

// No fallback on purpose: a default committed to git would let anyone who can
// read the repo sign a token for any user id. Fail at boot instead.
const secret = Bun.env.JWT_SECRET
if (!secret)
    throw new Error("JWT_SECRET is not set. Generate one, e.g. `openssl rand -base64 48`.")

export const jwtConfig = jwt({
    name: 'jwt',
    secret,
    exp: '1d'
})
import swagger from "@elysiajs/swagger"
import Elysia from "elysia"

/**
 * `MODE` unset means production — the same fallback `tls.config.ts` makes, and
 * the reason neither `render.yaml` nor the Dockerfile sets it. Reading it the
 * other way round (`MODE !== 'production'`) would leave the docs open on every
 * deploy, which is exactly the mistake this guard exists to prevent.
 */
const mode = Bun.env.MODE || "production"

/**
 * The docs map every route, its parameters and its response shape. That is
 * useful while building and worth showing on purpose, but leaving it open on a
 * public deploy hands a stranger the whole surface for nothing in return.
 *
 * So: on by default in development, off in production, and openable there
 * without touching the code — set ENABLE_API_DOC=true in the dashboard and
 * restart. Turning it back off is deleting the variable.
 */
const enabled = mode !== "production" || Bun.env.ENABLE_API_DOC === "true"

/** A plugin either way, so `index.ts` keeps its one unconditional `.use()`. */
export const swaggerConfig = enabled
    ? swagger({
        path: '/api-doc',
        documentation: {
            info: {
                title: "Tinner App API",
                version: "1.0.1"

            }
        }
    })
    // an empty plugin, not a missing one: nothing is mounted, so /api-doc falls
    // through to the catch-all and answers 404 like any other unknown /api path
    : new Elysia({ name: "swagger.disabled" })

if (!enabled)
    console.log("📕 /api-doc is off (set ENABLE_API_DOC=true to open it)")

import cors from "@elysiajs/cors"
import staticPlugin from "@elysiajs/static"
import Elysia from "elysia"
import { existsSync } from "node:fs"
import { brotliCompressSync, constants, gzipSync } from "node:zlib"
import { jwtConfig } from "./configs/jwt.config"
import { swaggerConfig } from "./configs/swagger.config"
import { tlsConfig } from "./configs/tls.config"
import { AccountController } from "./controllers/account.controller"
import { HubController } from "./controllers/hub.controller"
import { LikeController } from "./controllers/like.controller"
import { NotificationController } from "./controllers/notification.controller"
import { PhotoController } from "./controllers/photo.controller"
import { SafetyController } from "./controllers/safety.controller"
import { UserController } from "./controllers/user.controller"
import { postgres } from "./configs/database.config"
import { ErrorController } from "./controllers/error.controller"
import { MessageController } from "./controllers/message.controller"
import { TokenService } from "./services/token.service"

postgres.connect()

// spent and expired refresh tokens are only rows taking up space — clear them
// on boot and once a day after that
TokenService.prune().catch(error => console.error("token prune failed", error))
setInterval(() => {
  TokenService.prune().catch(error => console.error("token prune failed", error))
}, 24 * 60 * 60_000)

/**
 * Single-origin deployment: this process also serves the built Angular app, so
 * the client and the API share a domain — no CORS, and the chat websocket dials
 * back to the same host, which is exactly what the production `environment.ts`
 * assumes. When the build is absent (a plain `bun run dev`) nothing is mounted.
 */
const clientDist = Bun.env.CLIENT_DIST || "../client/dist/client/browser"
const indexHtml = `${clientDist}/index.html`
const hasClient = existsSync(indexHtml)

const app = new Elysia()
  .get("/health", () => ({ status: "ok", uptime: Math.round(process.uptime()) }), {
    detail: { summary: "Health check" },
  })
  .use(swaggerConfig)
  //.use(example)
  .use(cors())
  .use(jwtConfig)
  .use(AccountController)
  .use(ErrorController)
  .use(UserController)
  .use(LikeController)
  .use(PhotoController)
  .use(MessageController)
  .use(NotificationController)
  .use(SafetyController)
  .use(HubController)

  .use(staticPlugin({
    assets: "public/uploads",
    prefix: "img"
  }))

/** Text assets shrink by roughly three quarters; images and fonts are already
 *  compressed and only get bigger if we try. */
const COMPRESSIBLE = /\.(js|css|html|json|svg|txt|map|webmanifest)$/i
/** The build cannot change while the process lives, so each file is compressed
 *  once and the bytes are reused for every later request. */
const compressedCache = new Map<string, Uint8Array<ArrayBuffer>>()

const pickEncoding = (accept: string): "br" | "gzip" | null =>
  accept.includes("br") ? "br" : accept.includes("gzip") ? "gzip" : null

const serveClient = async (
  { path, set, headers }: {
    path: string
    set: { status?: number | string, headers: Record<string, string> }
    headers: Record<string, string | undefined>
  }
) => {
  // an unmatched /api path is a missing endpoint, not an Angular route
  if (path.startsWith("/api")) {
    set.status = 404
    return { message: "Not Found" }
  }

  const assetPath = `${clientDist}${path}`
  const isAsset = path !== "/" && !path.includes("..") && await Bun.file(assetPath).exists()
  // anything that is not a real file is a client-side route — hand back the shell
  const filePath = isAsset ? assetPath : indexHtml
  const file = Bun.file(filePath)
  const cacheControl = isAsset ? "public, max-age=3600" : "no-cache"

  const encoding = COMPRESSIBLE.test(filePath)
    ? pickEncoding(headers["accept-encoding"] ?? "")
    : null

  if (!encoding) {
    set.headers["cache-control"] = cacheControl
    return file
  }

  const key = `${filePath}:${encoding}`
  let body = compressedCache.get(key)
  if (!body) {
    const raw = new Uint8Array(await file.arrayBuffer())
    // quality 5 rather than brotli's default 11: a fraction of the CPU for
    // nearly the same size, which matters because the first request for each
    // asset pays this cost
    // node:zlib hands back a Buffer; copy it into a plain Uint8Array once so the
    // cached value is a valid Response body
    body = Uint8Array.from(encoding === "br"
      ? brotliCompressSync(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } })
      : gzipSync(raw))
    compressedCache.set(key, body)
  }

  return new Response(body, {
    headers: {
      "content-type": file.type,
      "content-encoding": encoding,
      "cache-control": cacheControl,
      "vary": "accept-encoding",
    },
  })
}

if (hasClient)
  // registered last so every real route above still wins the match
  app.get("/*", serveClient)
     .head("/*", serveClient)

app.listen({
  port: Bun.env.PORT || 8000,
  tls: tlsConfig
})

let protocol = 'http'
if ('cert' in tlsConfig)
  protocol = 'https'
console.log(`😱💀 Elysia is running at ${protocol}://${app.server?.hostname}:${app.server?.port} 💀😱`)
console.log(hasClient
  ? `📦 serving the client build from ${clientDist}`
  : `📦 no client build at ${clientDist} — API only`)

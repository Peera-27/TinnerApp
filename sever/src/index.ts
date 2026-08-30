import cors from "@elysiajs/cors"
import staticPlugin from "@elysiajs/static"
import Elysia from "elysia"
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

const app = new Elysia()
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

  .listen({
    port: Bun.env.PORT || 8000,
    tls: tlsConfig
  })

let protocol = 'http'
if ('cert' in tlsConfig)
  protocol = 'https'
console.log(`😱💀 Elysia is running at ${protocol}://${app.server?.hostname}:${app.server?.port} 💀😱`)

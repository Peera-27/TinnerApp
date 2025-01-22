import cors from "@elysiajs/cors"
import staticPlugin from "@elysiajs/static"
import Elysia from "elysia"
import { jwtConfig } from "./configs/jwt.config"
import { swaggerConfig } from "./configs/swagger.config"
import { tlsConfig } from "./configs/tls.config"
import { AccountController } from "./controllers/account.controller"
import { LikeController } from "./controllers/like.controller"
import { PhotoController } from "./controllers/photo.controller"
import { UserController } from "./controllers/user.controller"
import { mongodb } from "./configs/database.config"
import { ErrorController } from "./controllers/error.controller"

mongodb.connect()



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
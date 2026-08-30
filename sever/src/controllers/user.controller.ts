import Elysia, { error, t } from "elysia"
import { isUuid } from "../helper/id.helper"
import { AuthMiddleWare, AuthPayload } from "../middlewares/auth.middleware"
import { UserService } from "../services/user.service"
import { UserDto } from "../types/user.type"

export const UserController = new Elysia({
    prefix: "/api/user",
    tags: ['User']
})
    .use(UserDto)
    .use(AuthMiddleWare)

    // static segments are declared before `/:username` so none of them can be
    // read as somebody's name
    .get('/deck', ({ query, Auth }) => {
        const user_id = (Auth.payload as AuthPayload).id
        return UserService.getDeck(query, user_id)
    }, {
        detail: { summary: "Swipe deck — everyone not yet liked or passed" },
        query: "pagination",
        response: "users",
        isSignIn: true,
    })

    .post('/pass', async ({ body: { target_id }, set, Auth }) => {
        if (!isUuid(target_id)) throw error(400)

        const user_id = (Auth.payload as AuthPayload).id
        try {
            await UserService.pass(user_id, target_id)
            set.status = "No Content"
        } catch (err) {
            set.status = "Bad Request"
            throw err
        }
    }, {
        detail: { summary: "Pass on someone from the deck" },
        body: "target_id",
        isSignIn: true,
    })

    .delete('/pass/:target_id', async ({ params: { target_id }, set, Auth }) => {
        if (!isUuid(target_id)) throw error(400)

        const user_id = (Auth.payload as AuthPayload).id
        await UserService.unpass(user_id, target_id)
        set.status = "No Content"
    }, {
        detail: { summary: "Undo a pass" },
        params: t.Object({ target_id: t.String() }),
        isSignIn: true,
    })

    .get('/:username', async ({ params: { username }, Auth }) => {
        const user_id = (Auth.payload as AuthPayload).id
        try {
            return await UserService.getByuserName(username, user_id)
        } catch {
            // a name nobody has and a name hidden behind a block answer alike,
            // and both are a 404 rather than the 500 a raw throw used to give
            throw error(404)
        }
    }, {
        detail: { summary: "Get User By Username" },
        response: "user",
        isSignIn: true

    })
    .get('/all', () => {
        return {
            user: [
                { id: '1212', name: 'x1' },
                { id: '1322', name: 'x2' },
            ]
        }
    }, {

    })
    .get('/', ({ query, Auth }) => {
        const user_id = (Auth.payload as AuthPayload).id
        return UserService.get(query, user_id)
    }, {
        detail: { summary: "Get User" },
        query: "pagination",
        response: "users",
        isSignIn: true,
    })

    .patch('/', async ({ body, set, Auth }) => {
        try {
            const user_id = (Auth.payload as AuthPayload).id
            await UserService.updateProfile(body, user_id)
            set.status = "No Content"
        } catch (error) {
            set.status = "Bad Request"
            if (error instanceof Error)
                throw new Error(error.message)
            set.status = 500
            throw new Error("Something went wrong , try again later")

        }
    }, {
        detail: { summary: "Update Profile" },
        body: "updateProfile",
        // response: "user",
        isSignIn: true
    })

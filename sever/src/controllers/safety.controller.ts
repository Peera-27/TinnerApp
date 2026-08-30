import Elysia, { error, t } from "elysia"
import { isUuid } from "../helper/id.helper"
import { createRateLimiter } from "../helper/rate-limit.helper"
import { AuthMiddleWare, AuthPayload } from "../middlewares/auth.middleware"
import { BlockService } from "../services/block.service"
import { REPORT_REASONS, ReportService } from "../services/report.service"
import { UserDto } from "../types/user.type"

/** Reporting is free, but not unlimited — a flood of reports is its own abuse. */
const reportLimiter = createRateLimiter(10, 60 * 60_000)

export const SafetyController = new Elysia({
    prefix: "api/safety",
    tags: ['Safety']
})
    .use(AuthMiddleWare)
    .use(UserDto)

    .get('/blocks', async ({ Auth, query }) => {
        if (!query.pageSize || !query.currentPage) throw error(400)

        const user_id = (Auth.payload as AuthPayload).id
        return BlockService.list(user_id, query)
    }, {
        detail: { summary: "People I blocked" },
        isSignIn: true,
        query: "pagination",
        response: "users",
    })

    .put('/blocks', async ({ Auth, body: { target_id }, set }) => {
        const user_id = (Auth.payload as AuthPayload).id
        try {
            await BlockService.block(user_id, target_id)
            set.status = "No Content"
        } catch (err) {
            set.status = "Bad Request"
            throw err
        }
    }, {
        detail: { summary: "Block someone — hides you both from each other" },
        isSignIn: true,
        body: "target_id",
    })

    .delete('/blocks/:target_id', async ({ Auth, params: { target_id }, set }) => {
        if (!isUuid(target_id)) throw error(400)

        const user_id = (Auth.payload as AuthPayload).id
        await BlockService.unblock(user_id, target_id)
        set.status = "No Content"
    }, {
        detail: { summary: "Unblock someone" },
        isSignIn: true,
        params: t.Object({ target_id: t.String() }),
    })

    .post('/reports', async ({ Auth, body, set }) => {
        const user_id = (Auth.payload as AuthPayload).id

        const limit = reportLimiter.check(user_id)
        if (!limit.allowed) {
            set.status = "Too Many Requests"
            throw new Error(`รายงานถี่เกินไป รอ ${limit.retry_after} วินาทีแล้วลองใหม่`)
        }

        try {
            await ReportService.create(user_id, body.reported_id, body.reason, body.detail)
            set.status = "No Content"
        } catch (err) {
            set.status = "Bad Request"
            throw err
        }
    }, {
        detail: { summary: "Report a profile" },
        isSignIn: true,
        body: t.Object({
            reported_id: t.String(),
            reason: t.Union(REPORT_REASONS.map(reason => t.Literal(reason))),
            detail: t.Optional(t.String({ maxLength: 1000 })),
        }),
    })

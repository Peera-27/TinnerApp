import { and, eq, isNull, or } from "drizzle-orm"
import { db } from "../db"
import { reports, users } from "../db/schema"
import { isUuid } from "../helper/id.helper"

/** The reasons the client offers. Stored as text so the list can grow freely. */
export const REPORT_REASONS = [
    "spam",
    "harassment",
    "fake_profile",
    "inappropriate_photos",
    "underage",
    "other",
] as const

export type reportReason = typeof REPORT_REASONS[number]

export const ReportService = {
    /**
     * Files a report. A second report of the same person while the first is
     * still open updates it rather than piling up duplicates for whoever
     * reviews them.
     */
    create: async function (reporter_id: string, reported_id: string, reason: string, detail?: string): Promise<void> {
        if (!isUuid(reported_id) || reporter_id === reported_id)
            throw new Error("Invalid reported_id")

        if (!REPORT_REASONS.includes(reason as reportReason))
            throw new Error("Invalid reason")

        const target = await db.query.users.findFirst({
            where: eq(users.id, reported_id),
            columns: { id: true },
        })
        if (!target) throw new Error("Invalid reported_id")

        const existing = await db.query.reports.findFirst({
            where: and(
                eq(reports.reporter_id, reporter_id),
                eq(reports.reported_id, reported_id),
                eq(reports.status, "open"),
            ),
            columns: { id: true },
        })

        if (existing) {
            await db.update(reports)
                .set({ reason, detail: detail ?? null, created_at: new Date() })
                .where(eq(reports.id, existing.id))
            return
        }

        await db.insert(reports).values({
            reporter_id,
            reported_id,
            reason,
            detail: detail ?? null,
        })
    },

    /** Everything still waiting to be looked at — for whoever moderates. */
    listOpen: async function () {
        return db.query.reports.findMany({
            where: or(eq(reports.status, "open"), isNull(reports.status)),
            orderBy: (table, { desc }) => desc(table.created_at),
            limit: 200,
        })
    },
}

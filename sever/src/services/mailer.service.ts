/**
 * Mail delivery, with no provider wired up yet.
 *
 * Everything that needs to send mail goes through `send`, so plugging in a real
 * provider later is a change to this one function and nothing else. Until then
 * the message is printed to the server log, which is enough to follow a reset
 * link in development.
 */
export const MailerService = {
    send: async function (to: string, subject: string, body: string): Promise<void> {
        const provider = Bun.env.MAIL_PROVIDER
        if (!provider) {
            console.log([
                "",
                "──────── ✉️  outgoing mail (no MAIL_PROVIDER set) ────────",
                `to:      ${to}`,
                `subject: ${subject}`,
                "",
                body,
                "──────────────────────────────────────────────────────────",
                "",
            ].join("\n"))
            return
        }

        // A provider was named but nothing implements it yet. Failing loudly
        // beats pretending the mail went out.
        throw new Error(`MAIL_PROVIDER "${provider}" is set but no sender is implemented for it`)
    },
}

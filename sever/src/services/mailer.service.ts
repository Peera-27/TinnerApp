/**
 * Mail delivery.
 *
 * Everything that needs to send mail goes through `send`, so adding a second
 * provider later is a change to this one file and nothing else.
 *
 * `MAIL_PROVIDER` picks the sender:
 *   unset      the message is printed to the server log. This is what
 *              development runs on — enough to follow a reset link — and it is
 *              deliberately not a silent no-op.
 *   "resend"   posts to Resend's HTTP API. No SDK: it is one JSON request, and
 *              Render's free plan blocks outbound SMTP anyway, so an HTTP
 *              provider is the only kind that works there.
 *
 * Anything else is a typo in the environment, and saying so beats quietly
 * dropping every mail the app tries to send.
 */

/** A provider that hangs must not hold the request open with it. */
const SEND_TIMEOUT_MS = 10_000

/** Thrown when the environment names a provider but does not configure it. */
class MailConfigError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "MailConfigError"
    }
}

function required(name: string): string {
    const value = Bun.env[name]
    if (!value)
        throw new MailConfigError(`MAIL_PROVIDER is set but ${name} is missing`)
    return value
}

async function sendWithResend(to: string, subject: string, body: string): Promise<void> {
    const apiKey = required("RESEND_API_KEY")
    // Resend will only accept a domain you have verified; the sandbox sender
    // onboarding@resend.dev works but can only be delivered to your own address
    const from = required("MAIL_FROM")

    let response: Response
    try {
        response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                authorization: `Bearer ${apiKey}`,
                "content-type": "application/json",
            },
            // plain text only: the body is prose with one link in it, which every
            // client auto-links, and there is no markup to get the escaping wrong
            body: JSON.stringify({ from, to, subject, text: body }),
            signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
        })
    } catch (error) {
        // a timeout or a DNS/network fault — the message never left
        throw new Error(`mail transport failed: ${error instanceof Error ? error.message : String(error)}`)
    }

    if (!response.ok) {
        // Resend answers with { message, name } on failure; keep the text either
        // way so a bad key or an unverified sender is named in the log
        const detail = await response.text().catch(() => "")
        throw new Error(`Resend rejected the message (${response.status}): ${detail.slice(0, 500)}`)
    }
}

export const MailerService = {
    send: async function (to: string, subject: string, body: string): Promise<void> {
        const provider = Bun.env.MAIL_PROVIDER?.trim().toLowerCase()

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

        if (provider === "resend")
            return sendWithResend(to, subject, body)

        throw new MailConfigError(`MAIL_PROVIDER "${provider}" is not a provider this app knows how to send with`)
    },
}

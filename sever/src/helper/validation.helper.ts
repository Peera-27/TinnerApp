/**
 * The account rules, in one place. They used to live inline in the register
 * handler, which meant a password set through a reset link could be weaker than
 * one set at sign-up.
 */
export const USERNAME_RE = /^[A-Za-z][A-Za-z\d]{3,9}$/
export const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,16}$/
/** Deliberately loose: the confirmation mail is the real check. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function isValidUsername(value: string): boolean {
    return USERNAME_RE.test(value)
}

export function isValidPassword(value: string): boolean {
    return PASSWORD_RE.test(value)
}

export function isValidEmail(value: string): boolean {
    return EMAIL_RE.test(value) && value.length <= 255
}

/**
 * Emails are compared case-insensitively, so they are stored that way too.
 * Returns null for "no email given", which is what the nullable column wants.
 */
export function normalizeEmail(email?: string | null): string | null {
    if (!email) return null
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return null
    if (!isValidEmail(trimmed)) throw new Error("Invalid email")
    return trimmed
}

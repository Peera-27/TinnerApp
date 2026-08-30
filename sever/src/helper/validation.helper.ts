/**
 * The account rules, in one place. They used to live inline in the register
 * handler, which meant a password set through a reset link could be weaker than
 * one set at sign-up.
 *
 * These are mirrored on the client in
 * `client/src/app/_validator/account.rules.ts` so a form can explain what is
 * wrong before it posts. This file stays the authority — change one side and
 * you must change the other, or sign-up starts failing with a 400 on input the
 * form said was fine.
 */

/** 3–20 characters, opens with a letter, then letters, digits or underscore.
 *  Usernames end up in profile URLs, so the set stays URL-safe. */
export const USERNAME_RE = /^[A-Za-z][A-Za-z\d_]{2,19}$/

/**
 * 8–16 characters with a lowercase letter, an uppercase letter, a digit and a
 * symbol. Any character is accepted — the rule says what a password must
 * *contain*, never what it may not. An allow-list used to sit here and it threw
 * out perfectly strong passwords whose only symbol was `-` or `_`.
 * A space is allowed but does not count as the symbol.
 */
export const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s]).{8,16}$/

/** Deliberately loose: the confirmation mail is the real check. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Wording shared by every rejection, so the client never has to guess. */
export const USERNAME_REQUIREMENTS =
    "Username must be 3–20 characters, start with a letter, and use only letters, numbers or _"
export const PASSWORD_REQUIREMENTS =
    "Password must be 8–16 characters and include a lowercase letter, an uppercase letter, a number and a symbol"

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
    return trimmed.length > 0 ? trimmed : null
}

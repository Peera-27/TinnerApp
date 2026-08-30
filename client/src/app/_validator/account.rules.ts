import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms'

/**
 * Mirror of `sever/src/helper/validation.helper.ts`.
 *
 * The server is the authority — this copy exists so a form can explain what is
 * wrong before it posts, instead of the API answering with a 400 on input the
 * form said was fine. The two used to disagree: the form accepted 16-character
 * usernames and any symbol, while the server wanted 4–10 alphanumerics and
 * symbols only from a short allow-list.
 *
 * Change one side and you must change the other.
 */
export const USERNAME_RE = /^[A-Za-z][A-Za-z\d_]{2,19}$/
export const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s]).{8,16}$/

export interface AccountRule {
    label: string
    test: (value: string) => boolean
}

/** Shown as a live checklist wherever a password is chosen. Keep it at five
 *  entries — the strength meter reads each one as 20%. */
export const PASSWORD_RULES: AccountRule[] = [
    { label: '8–16 characters', test: v => v.length >= 8 && v.length <= 16 },
    { label: 'A lowercase letter', test: v => /[a-z]/.test(v) },
    { label: 'An uppercase letter', test: v => /[A-Z]/.test(v) },
    { label: 'A number', test: v => /\d/.test(v) },
    { label: 'A symbol (! @ # & * …)', test: v => /[^A-Za-z\d\s]/.test(v) }
]

export const USERNAME_HINT =
    '3–20 characters, starting with a letter. Letters, numbers and _ only.'

/** Matches the server rule exactly, so a username the form accepts is a
 *  username the API accepts. */
export function usernameValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value as string
        if (!value) return { required: true }
        if (value.length < 3) return { usernameTooShort: true }
        if (value.length > 20) return { usernameTooLong: true }
        if (!/^[A-Za-z]/.test(value)) return { usernameStart: true }
        if (!USERNAME_RE.test(value)) return { usernameCharset: true }
        return null
    }
}

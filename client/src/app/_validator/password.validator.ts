import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms"

export const PasswordValidator = (minlength: number, maxlength: number): ValidatorFn => {
    return function (control: AbstractControl): ValidationErrors | null {
        const password = control.value as string
        if (!password) {
            return { required: true }
        } else if (password.length < minlength)
            return { invalidMinlength: true }
        else if (password.length > maxlength)
            return { invalidMaxlength: true }
        else if (!/[a-z]/.test(password))
            return { invalidLowerCase: true }
        else if (!/[A-Z]/.test(password))
            return { invalidUpperCase: true }
        else if (!/[0-9]/.test(password))
            return { invalidNumeric: true }
        // any non-alphanumeric character counts as a symbol; the old class was
        // malformed and silently rejected passwords whose only symbol was - or _
        else if (!/[^A-Za-z0-9\s]/.test(password))
            return { invalidSpecialChar: true }
        return null
    }
}

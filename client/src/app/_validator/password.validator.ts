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
        else if (!/[!@#&*?;:'"{}[]|=-_]/.test(password))
            return { invalidSpecialChar: true }
        return null
    }
}

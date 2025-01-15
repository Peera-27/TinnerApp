import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms"

export function PasswordMatchValidator(ctrl_password_name: string, ctrl_confirm_password_name: string): ValidatorFn {
    return function (formGroup: AbstractControl): ValidationErrors | null {
        const ctrlPassword = formGroup.get(ctrl_password_name)
        const ctrlConfirmPassword = formGroup.get(ctrl_confirm_password_name)
        if (ctrlPassword && ctrlConfirmPassword) {
            if (ctrlPassword.value !== ctrlConfirmPassword.value)
                ctrlConfirmPassword.setErrors({ misMatch: true })
            else
                ctrlConfirmPassword.setErrors(null)
        }

        return null

    }
}
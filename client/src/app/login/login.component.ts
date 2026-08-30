import { Component, inject, signal } from '@angular/core'
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'
import { PasswordValidator } from '../_validator/password.validator'
import { PASSWORD_RULES, USERNAME_HINT, usernameValidator } from '../_validator/account.rules'
import { PasswordMatchValidator } from '../_validator/password.match.validator'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatDatepickerModule } from '@angular/material/datepicker'
import { provideNativeDateAdapter } from '@angular/material/core'
import { AccountService } from '../_services/account.service'
import { Router, RouterLink } from '@angular/router'

interface Choice {
  value: string
  label: string
  icon: string
}

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule, FormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatDatepickerModule, RouterLink
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  providers: [provideNativeDateAdapter()]
})
export class LoginComponent {
  mode: 'login' | 'register' = 'login'
  form: FormGroup
  public errorFormServer = ''

  private accountService = inject(AccountService)
  private rounter = inject(Router)

  private readonly _currentyear = new Date().getFullYear()
  readonly mindate = new Date(this._currentyear - 70, 0, 1)
  readonly maxdate = new Date(this._currentyear - 18, 11, 31)
  readonly startDate = new Date(this._currentyear - 18, 0, 1)

  readonly hidePassword = signal(true)
  readonly hideConfirm = signal(true)
  readonly submitting = signal(false)

  readonly choices: Choice[] = [
    { value: 'male', label: 'Male', icon: 'male' },
    { value: 'female', label: 'Female', icon: 'female' },
    { value: 'all', label: 'LGBTQ+', icon: 'transgender' }
  ]

  readonly passwordRules = PASSWORD_RULES
  readonly usernameHint = USERNAME_HINT

  errorMessages = {
    username: signal(''),
    password: signal(''),
    display_name: signal(''),
    confirm_password: signal('')
  }

  constructor() {
    this.form = new FormGroup({
      username: new FormControl(null, [Validators.required, usernameValidator()]),
      password: new FormControl(null, [Validators.required, PasswordValidator(8, 16)]),
    })
  }

  //#region view helpers
  get isRegister() {
    return this.mode === 'register'
  }

  get passwordValue(): string {
    return this.form.controls['password']?.value ?? ''
  }

  /** 0–5, mirrors how many of the password rules are satisfied. */
  get passwordScore(): number {
    const value = this.passwordValue
    if (!value) return 0
    return this.passwordRules.filter(rule => rule.test(value)).length
  }

  get passwordStrengthLabel(): string {
    const score = this.passwordScore
    if (score <= 2) return 'Weak'
    if (score <= 4) return 'Getting there'
    return 'Strong'
  }

  choiceOf(control: string): string | null {
    return this.form.controls[control]?.value ?? null
  }

  pick(control: string, value: string) {
    const ctrl = this.form.controls[control]
    if (!ctrl) return
    ctrl.setValue(value)
    ctrl.markAsTouched()
    ctrl.markAsDirty()
  }
  //#endregion

  toggleMode() {
    this.mode = this.mode === 'login' ? 'register' : 'login'
    this.errorFormServer = ''
    this.updateForm()
  }

  updateForm() {
    if (this.mode === 'register') {
      this.form.addControl('confirm_password', new FormControl(null, Validators.required))
      this.form.addValidators(PasswordMatchValidator('password', 'confirm_password'))

      this.form.addControl('display_name', new FormControl(null, [Validators.required, Validators.minLength(3), Validators.maxLength(20)]))
      // optional, but it is the only way back into an account whose password
      // has been forgotten
      this.form.addControl('email', new FormControl(null, [Validators.email, Validators.maxLength(255)]))
      this.form.addControl('date_of_birth', new FormControl(null, Validators.required))
      this.form.addControl('gender', new FormControl(null, Validators.required))
      this.form.addControl('looking_for', new FormControl(null, Validators.required))
    } else {
      this.form.removeControl('confirm_password')
      this.form.removeValidators(PasswordMatchValidator('password', 'confirm_password'))
      this.form.removeControl('display_name')
      this.form.removeControl('email')
      this.form.removeControl('date_of_birth')
      this.form.removeControl('gender')
      this.form.removeControl('looking_for')
    }
  }

  async onSubmit() {
    if (this.form.invalid || this.submitting()) return
    this.submitting.set(true)
    try {
      this.errorFormServer = this.mode === 'login'
        ? await this.accountService.login(this.form.value)
        : await this.accountService.register(this.form.value)
    } finally {
      this.submitting.set(false)
    }

    if (this.errorFormServer === '') {
      this.rounter.navigate(['/'])
    }
  }

  updateErrorMessgae(ctrlName: string) {
    const control = this.form.controls[ctrlName]
    if (!control) return

    switch (ctrlName) {
      case 'username':
        if (control.hasError('required'))
          this.errorMessages.username.set('Please choose a username')
        else if (control.hasError('usernameTooShort'))
          this.errorMessages.username.set('At least 3 characters')
        else if (control.hasError('usernameTooLong'))
          this.errorMessages.username.set('20 characters at most')
        else if (control.hasError('usernameStart'))
          this.errorMessages.username.set('Must start with a letter')
        else if (control.hasError('usernameCharset'))
          this.errorMessages.username.set('Letters, numbers and _ only')
        else
          this.errorMessages.username.set('')
        break

      case 'password':
        if (control.hasError('required'))
          this.errorMessages.password.set('Please enter a password')
        else if (control.hasError('invalidMinlength'))
          this.errorMessages.password.set('At least 8 characters')
        else if (control.hasError('invalidMaxlength'))
          this.errorMessages.password.set('16 characters at most')
        else if (control.hasError('invalidLowerCase'))
          this.errorMessages.password.set('Add a lowercase letter')
        else if (control.hasError('invalidUpperCase'))
          this.errorMessages.password.set('Add an uppercase letter')
        else if (control.hasError('invalidNumeric'))
          this.errorMessages.password.set('Add a number')
        else if (control.hasError('invalidSpecialChar'))
          this.errorMessages.password.set('Add a symbol, e.g. ! @ # &')
        else
          this.errorMessages.password.set('')
        break

      case 'confirm_password':
        if (control.hasError('required'))
          this.errorMessages.confirm_password.set('Please repeat your password')
        else if (control.hasError('misMatch'))
          this.errorMessages.confirm_password.set('The two passwords do not match')
        else
          this.errorMessages.confirm_password.set('')
        break

      case 'display_name':
        if (control.hasError('required'))
          this.errorMessages.display_name.set('Tell people what to call you')
        else if (control.hasError('minlength'))
          this.errorMessages.display_name.set('At least 3 characters')
        else if (control.hasError('maxlength'))
          this.errorMessages.display_name.set('20 characters at most')
        else
          this.errorMessages.display_name.set('')
        break
    }
  }
}

import { Component, inject, signal } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { PasswordMatchValidator } from '../_validator/password.match.validator'
import { PasswordValidator } from '../_validator/password.validator'
import { PASSWORD_RULES } from '../_validator/account.rules'
import { AccountService } from '../_services/account.service'

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent {
  private accountService = inject(AccountService)
  private route = inject(ActivatedRoute)
  private router = inject(Router)

  /** Comes straight off the link in the mail. */
  private token = this.route.snapshot.queryParamMap.get('token') ?? ''
  hasToken = this.token.length > 0

  form = new FormGroup({
    password: new FormControl('', [Validators.required, PasswordValidator(8, 16)]),
    confirm_password: new FormControl('', Validators.required),
  }, PasswordMatchValidator('password', 'confirm_password'))

  hidePassword = signal(true)
  submitting = signal(false)
  serverError = signal('')
  done = signal(false)

  readonly rules = PASSWORD_RULES

  get passwordValue(): string {
    return this.form.controls.password.value ?? ''
  }

  async onSubmit() {
    if (this.form.invalid || this.submitting()) return

    this.submitting.set(true)
    const error = await this.accountService.resetPassword(this.token, this.passwordValue)
    this.submitting.set(false)

    if (error) {
      this.serverError.set(error)
      return
    }

    this.done.set(true)
    // every session was revoked with the reset, so the way on is a fresh login
    setTimeout(() => this.router.navigate(['/login']), 2500)
  }
}

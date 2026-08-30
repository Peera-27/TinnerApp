import { Component, inject, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { RouterLink } from '@angular/router'
import { AccountService } from '../_services/account.service'

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent {
  private accountService = inject(AccountService)

  email = new FormControl('', [Validators.required, Validators.email])
  submitting = signal(false)
  sent = signal(false)

  async onSubmit() {
    if (this.email.invalid || this.submitting()) return

    this.submitting.set(true)
    await this.accountService.forgotPassword(this.email.value ?? '')
    this.submitting.set(false)
    // the same answer either way — the server will not say whether the address
    // belongs to an account, and neither will this screen
    this.sent.set(true)
  }
}

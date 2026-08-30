import { Component, inject, signal } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
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
  /**
   * The control has to hang off a FormGroup bound to the <form> element. Without
   * it no Angular directive owns the form, `(ngSubmit)` is a listener for an
   * event that is never raised, and the submit button falls through to a native
   * browser submit — which reloads the page and never calls `onSubmit`. That is
   * what it did: the screen looked the same, the field cleared itself, and no
   * request was ever sent.
   */
  form = new FormGroup({ email: this.email })
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

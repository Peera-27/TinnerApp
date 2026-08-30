import { Component, inject, signal, ViewChild } from '@angular/core'
import { FormsModule, NgForm } from '@angular/forms'
import { MatTabsModule } from '@angular/material/tabs'
import { MatInputModule } from '@angular/material/input'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { AccountService } from '../_services/account.service'
import { User } from '../_models/user'
import { PhotoComponent } from './photo/photo.component'
import { DEFAULT_AVATAR } from '../_helper/helper'
import { MatSnackBar } from '@angular/material/snack-bar'
import { Router } from '@angular/router'

@Component({
  selector: 'app-profile',
  imports: [
    MatButtonModule, MatSelectModule, MatTabsModule, MatIconModule,
    FormsModule, MatInputModule, MatFormFieldModule, PhotoComponent
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent {
  private accountService = inject(AccountService)
  private snackbar = inject(MatSnackBar)
  private router = inject(Router)
  user: User
  @ViewChild('form') form?: NgForm

  readonly saved = signal(false)
  readonly choices = [
    { value: 'male', label: 'Men' },
    { value: 'female', label: 'Women' },
    { value: 'all', label: 'Everyone' }
  ]

  /** Rough "is this profile worth looking at" score, shown as a nudge. */
  get completeness(): number {
    const u = this.user
    const checks = [
      !!u.display_name,
      !!u.introduction,
      !!u.interest,
      !!u.location,
      (u.photos?.length ?? 0) > 0
    ]
    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
  }

  // ------------------------------------------------------------- password
  currentPassword = ''
  newPassword = ''
  confirmPassword = ''
  readonly changingPassword = signal(false)
  readonly passwordError = signal('')

  readonly passwordRules = [
    { label: '8–16 characters', test: (v: string) => v.length >= 8 && v.length <= 16 },
    { label: 'A lowercase letter', test: (v: string) => /[a-z]/.test(v) },
    { label: 'An uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
    { label: 'A number', test: (v: string) => /[0-9]/.test(v) },
    { label: 'A symbol (! @ # & * …)', test: (v: string) => /[^A-Za-z0-9\s]/.test(v) }
  ]

  constructor() {
    this.user = this.accountService.data()!.user
    // the stored session may predate the email column, and a listing never
    // carries it — so the field is filled from /me rather than from cache
    this.accountService.loadMe().then(() => {
      this.user = this.accountService.data()?.user ?? this.user
    })
  }

  get avatar(): string {
    return this.user.avatar || DEFAULT_AVATAR
  }

  async onSubmit() {
    const ok = await this.accountService.updateProfile(this.form?.value)
    if (!ok) return
    this.form?.form.markAsPristine()
    this.saved.set(true)
    setTimeout(() => this.saved.set(false), 2600)
  }

  // ------------------------------------------------------------- password
  canChangePassword(): boolean {
    return !!this.currentPassword
      && this.newPassword.length >= 8
      && this.newPassword === this.confirmPassword
      && this.passwordRules.every(rule => rule.test(this.newPassword))
  }

  async onChangePassword() {
    if (!this.canChangePassword() || this.changingPassword()) return

    this.changingPassword.set(true)
    const error = await this.accountService.changePassword(this.currentPassword, this.newPassword)
    this.changingPassword.set(false)

    if (error) {
      this.passwordError.set(error)
      return
    }

    // the server revoked every session, this one included, so the only honest
    // next step is a fresh sign-in
    this.accountService.logout()
    this.snackbar.open('Password changed. Please sign in again.', 'OK', { duration: 6000 })
    this.router.navigate(['/login'])
  }
}

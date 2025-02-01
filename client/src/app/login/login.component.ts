import { Component, inject, signal } from '@angular/core'
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'
import { password } from 'bun'
import { PasswordValidator } from '../_validator/password.validator'
import { PasswordMatchValidator } from '../_validator/password.match.validator'
import { CommonModule } from '@angular/common'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatDatepickerModule } from '@angular/material/datepicker'
import { provideNativeDateAdapter } from '@angular/material/core'
import { MatRadioModule } from '@angular/material/radio'
import { MatCardModule } from '@angular/material/card'
import { AccountService } from '../_services/account.service'
import { Router } from '@angular/router'


@Component({
  selector: 'app-login',
  imports: [MatCardModule, MatRadioModule, ReactiveFormsModule, CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatDatepickerModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  providers: [provideNativeDateAdapter()],

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
  errorMessages = {
    username: signal(''),
    password: signal(''),
    display_name: signal(''),
    confirm_password: signal(''),

  }

  constructor() {
    this.form = new FormGroup({
      username: new FormControl(null, [Validators.required, Validators.minLength(3), Validators.maxLength(16)]),
      password: new FormControl(null, [Validators.required, PasswordValidator(8, 16)]),
    })
  }
  toggleMode() {
    this.mode = this.mode === 'login' ? 'register' : 'login'
    this.updateForm()
  }
  updateForm() {
    if (this.mode === 'register') {
      this.form.addControl('confirm_password', new FormControl(null, Validators.required))
      this.form.addValidators(PasswordMatchValidator('password', 'confirm_password'))

      this.form.addControl('display_name', new FormControl(null, [Validators.required, Validators.minLength(3), Validators.maxLength(5)]))
      this.form.addControl('date_of_birth', new FormControl(null, Validators.required))
      this.form.addControl('gender', new FormControl(null, Validators.required))
      this.form.addControl('looking_for', new FormControl(null, Validators.required))
    } else {
      this.form.removeControl('confirm_password')
      this.form.removeValidators(PasswordMatchValidator('password', 'confirm_password'))
      this.form.removeControl('display_name')
      this.form.removeControl('date_of_birth')
      this.form.removeControl('gender')
      this.form.removeControl('looking_for')
    }
  }
  async onSubmit() {

    console.log(this.form.value)
    if (this.mode === 'login') {
      const logindata = this.form.value
      this.errorFormServer = await this.accountService.login(this.form.value)

    } else {
      this.errorFormServer = await this.accountService.register(this.form.value)

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
          this.errorMessages.username.set('นิ่งไว้วววววว ผมเคยเล่นเกมนี้มาก่อน')
        else if (control.hasError('minlength'))
          this.errorMessages.username.set(' Must Be at least 3 Char🤯')
        else if (control.hasError('maxlength'))
          this.errorMessages.username.set(' Must Be at least 16 Char or fewer🤯')
        else
          this.errorMessages.username.set('')
        break
      case 'password':
        if (control.hasError('required'))
          this.errorMessages.password.set('นิ่งไว้วววววว ผมเคยเล่นเกมนี้มาก่อน')
        else if (control.hasError('invalidMinlength'))
          this.errorMessages.password.set(' Must Be 8🤯')
        else if (control.hasError('invalidMaxlength'))
          this.errorMessages.password.set(' Must Bev 16🤯')
        else if (control.hasError('invalidLowerCase'))
          this.errorMessages.password.set(' Must low')
        else if (control.hasError('invalidUpperCase'))
          this.errorMessages.password.set(' Must up')
        else if (control.hasError('invalidNumeric'))
          this.errorMessages.password.set(' Must Be number')
        else if (control.hasError('invalidSpecialChar'))
          this.errorMessages.password.set(' Must SpecialChar')
        else
          this.errorMessages.password.set('')
        break
      case 'confirm_password':
        if (control.hasError('required'))
          this.errorMessages.confirm_password.set('นิ่งไว้วววววว ผมเคยเล่นเกมนี้มาก่อน')
        else if (control.hasError('misMatch'))
          this.errorMessages.confirm_password.set(' ต้องเหมือนกัน🤯🤯')
        else
          this.errorMessages.confirm_password.set('')
        break
      case 'display_name':
        if (control.hasError('required'))
          this.errorMessages.display_name.set('นิ่งไว้วววววว ผมเคยเล่นเกมนี้มาก่อน')
        else if (control.hasError('minlength'))
          this.errorMessages.display_name.set(' Must Be at least 3 Char🤯')
        else if (control.hasError('maxlength'))
          this.errorMessages.display_name.set(' Must Be at least 8 Char or fewer🤯')
        else
          this.errorMessages.display_name.set('')
        break

    }
  }
}


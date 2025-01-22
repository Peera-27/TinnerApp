import { inject, Injectable, signal } from '@angular/core'
import { environment } from '../../environments/environment'
import { HttpClient } from '@angular/common/http'
import { User } from '../_models/user'
import { firstValueFrom } from 'rxjs'
import { pareUserPhoto } from '../_helper/helper'

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private _key = 'account';
  private _baseApiurl = environment.baseUrl + 'api/account/'
  private _http = inject(HttpClient)
  data = signal<{ user: User, token: string } | null>(null)
  constructor() {
    this.loadDataFromlocalStorage()
  }

  logout() {
    localStorage.removeItem(this._key)
    this.data.set(null)
  }
  async login(logindata: { username: string, password: string }): Promise<string> {
    try {
      const url = this._baseApiurl + 'login'
      const response = this._http.post<{ user: User, token: string }>(url, logindata)
      const data = await firstValueFrom(response)
      data.user = pareUserPhoto(data.user)
      this.data.set(data)
      this.saveDataTolocalStorage()
      return ''
    } catch (error: any) {
      return error.error?.message
    }
  }
  private saveDataTolocalStorage() {
    const JsonString = JSON.stringify(this.data())
    localStorage.setItem(this._key, JsonString)
  }
  private loadDataFromlocalStorage() {
    const JSONstring = localStorage.getItem(this._key)
    if (JSONstring) {
      const data = JSON.parse(JSONstring)
      this.data.set(data)
    }
  }
  async register(registerdata: User): Promise<string> {
    try {
      const url = this._baseApiurl + 'register'
      const response = this._http.post<{ user: User, token: string }>(url, registerdata)
      const data = await firstValueFrom(response)
      data.user = pareUserPhoto(data.user)
      this.data.set(data)
      this.saveDataTolocalStorage()
      return ''
    } catch (error: any) {
      return error.error?.message
    }
  }
}

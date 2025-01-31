import { inject, Injectable, signal } from '@angular/core'
import { environment } from '../../environments/environment'
import { HttpClient } from '@angular/common/http'
import { User } from '../_models/user'
import { firstValueFrom } from 'rxjs'
import { pareUserPhoto } from '../_helper/helper'
import { Photo } from '../_models/photo'

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


  async setAvatar(photo_id: string): Promise<void> {
    const url = environment.baseUrl + 'api/photo/' + photo_id
    try {
      const response = this._http.patch(url, {})
      await firstValueFrom(response)
      const user = this.data()!.user
      if (user) {
        const photos = user.photos?.map(p => {
          p.is_avatar = p.id === photo_id
          return p
        })
        user.photos = photos

        this.setUser(user)
      }
    } catch (error) {

    }
  }


  private setUser(user: User) {
    const copyData = this.data()
    if (copyData)
      copyData.user = user
    this.data.set(copyData)
    this.saveDataTolocalStorage()
  }

  async deletephoto(photo_id: string): Promise<void> {
    const url = environment.baseUrl + 'api/photo/' + photo_id
    try {
      const response = this._http.delete(url)
      await firstValueFrom(response)
      const user = this.data()!.user
      if (user) {
        const photos = user.photos?.filter(p => p.id !== photo_id)
        user.photos = photos

        this.setUser(user)

      }
    } catch (error) {

    }
  }


  //#region login_and_register
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
  //#endregion
  //#region local

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
  //#endregion
  //#region profile
  async updateProfile(user: User): Promise<boolean> {
    const url = environment.baseUrl + 'api/user/'
    try {
      const response = this._http.patch(url, user)
      await firstValueFrom(response)
      const currentUserdata = this.data()
      if (currentUserdata) {
        currentUserdata.user = user
        this.data.set(currentUserdata)
        this.saveDataTolocalStorage()
      }
    } catch (error) {
      return false
    }
    return true
  }
  //#endregion
  //#region profile
  async uploadPhoto(file: File): Promise<boolean> {
    const url = environment.baseUrl + 'api/photo/'
    const fromData = new FormData()
    fromData.append('file', file)
    try {
      const response = this._http.post<Photo>(url, fromData)
      const photo = await firstValueFrom(response)
      const user = this.data()!.user
      if (user) {
        if (!user.photos)
          user.photos = []
        user.photos.push(photo)
        this.setUser(user)

        return true
      }
    } catch (error) {

    }
    return false
  }
  //#endregion



}

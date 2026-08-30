import { inject, Injectable, signal } from '@angular/core'
import { environment } from '../../environments/environment'
import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http'
import { User } from '../_models/user'
import { firstValueFrom } from 'rxjs'
import { compact, getAvatar, pareUserPhoto } from '../_helper/helper'
import { Photo } from '../_models/photo'
import { cacheManager } from '../_helper/cache'

/** Session as it is stored. `refresh_token` is optional: a session saved before
 *  refresh tokens existed still loads, it just cannot be renewed. */
export interface Session {
  user: User
  token: string
  refresh_token?: string
}

/** Marks the calls that must never be retried through a token refresh —
 *  refreshing inside a refresh would loop. */
export const SKIP_AUTH_REFRESH = new HttpContextToken<boolean>(() => false)
export const skipAuthRefresh = () => new HttpContext().set(SKIP_AUTH_REFRESH, true)

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private _key = 'account';
  private _baseApiurl = environment.baseUrl + 'api/account/'
  private _http = inject(HttpClient)

  data = signal<Session | null>(null)
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
        // every template renders `user.avatar`, not the flags — flipping
        // is_avatar alone left the header and profile on the old photo until
        // the next login recomputed it
        user.avatar = getAvatar(user)

        this.setUser(user)
      }
    } catch (error) {

    }
  }

  public _setuser(user: User) {
    this.setUser(user)
  }
  private setUser(user: User) {
    const current = this.data()
    // Both wrappers have to be new objects. A signal compares with Object.is,
    // so mutating the stored session in place notified nobody — and a
    // computed() is memoised on its own result too, so handing back the same
    // User reference left `computed(() => data()?.user)` looking unchanged and
    // its dependents, the header avatar among them, never re-ran.
    this.data.set(current ? { ...current, user: { ...user } } : current)
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
        // deleting the current avatar otherwise left `avatar` pointing at a
        // URL Cloudinary no longer serves
        user.avatar = getAvatar(user)

        this.setUser(user)

      }
    } catch (error) {

    }
  }


  //#region login_and_register
  logout() {
    // tell the server first, while the token is still in hand — otherwise the
    // refresh token would stay valid for another month
    const refresh_token = this.data()?.refresh_token
    if (refresh_token) {
      this._http.post(this._baseApiurl + 'logout', { refresh_token }, { context: skipAuthRefresh() })
        .subscribe({ error: () => { } })
    }

    localStorage.removeItem(this._key)

    this.data.set(null)
    cacheManager.clear('all')
  }

  async login(logindata: { username: string, password: string }): Promise<string> {
    try {
      const url = this._baseApiurl + 'login'
      const response = this._http.post<Session>(url, logindata, { context: skipAuthRefresh() })
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
      const response = this._http.post<Session>(url, compact(registerdata, true), { context: skipAuthRefresh() })
      const data = await firstValueFrom(response)
      data.user = pareUserPhoto(data.user)
      this.data.set(data)
      this.saveDataTolocalStorage()
      return ''
    } catch (error: any) {
      return error.error?.message
    }
  }

  /**
   * Trades the stored refresh token for a fresh pair. Returns false when the
   * session is truly over, which is the interceptor's cue to sign out.
   */
  async refresh(): Promise<boolean> {
    const refresh_token = this.data()?.refresh_token
    if (!refresh_token) return false

    try {
      const pair = await firstValueFrom(this._http.post<{ token: string, refresh_token: string }>(
        this._baseApiurl + 'refresh',
        { refresh_token },
        { context: skipAuthRefresh() },
      ))

      const current = this.data()
      if (!current) return false
      this.data.set({ ...current, token: pair.token, refresh_token: pair.refresh_token })
      this.saveDataTolocalStorage()
      return true
    } catch {
      return false
    }
  }
  //#endregion
  //#region password
  async changePassword(current_password: string, new_password: string): Promise<string> {
    try {
      await firstValueFrom(this._http.patch(this._baseApiurl + 'password', { current_password, new_password }))
      // every session was just revoked, this one included — the caller signs
      // back in with the new password
      return ''
    } catch (error: any) {
      return error.error?.message ?? 'Could not change your password'
    }
  }

  async forgotPassword(email: string): Promise<void> {
    // deliberately ignores failures: the answer is the same either way, so the
    // form cannot be used to find out which addresses are registered
    try {
      await firstValueFrom(this._http.post(this._baseApiurl + 'forgot-password', { email }, { context: skipAuthRefresh() }))
    } catch { }
  }

  async resetPassword(token: string, password: string): Promise<string> {
    try {
      await firstValueFrom(this._http.post(this._baseApiurl + 'reset-password', { token, password }, { context: skipAuthRefresh() }))
      return ''
    } catch (error: any) {
      return error.error?.message ?? 'This reset link is no longer valid'
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
      const data = JSON.parse(JSONstring) as Session
      // avatar/photoOfTheDay are derived, not authoritative — recompute them so
      // a session stored before the placeholder art changed does not keep
      // pointing at an asset that no longer exists.
      if (data?.user) data.user = pareUserPhoto(data.user)
      this.data.set(data)
    }
  }
  //#endregion
  //#region profile
  /** My own record, including the email a listing never carries. */
  async loadMe(): Promise<void> {
    try {
      const me = await firstValueFrom(this._http.get<User>(environment.baseUrl + 'api/account/me'))
      this.setUser(pareUserPhoto({ ...this.data()?.user, ...me } as User))
    } catch (error) {
      console.error(`Error:loading my account ${error}`)
    }
  }

  async updateProfile(user: User): Promise<boolean> {
    const url = environment.baseUrl + 'api/user/'
    try {
      const response = this._http.patch(url, compact(user))
      await firstValueFrom(response)
      const currentUserdata = this.data()
      if (currentUserdata) {
        // merge, never replace: the form only carries the editable fields, so
        // assigning it wholesale would drop id, photos, following and avatar.
        // Routed through setUser so the change actually reaches the header —
        // setting the mutated session back onto the signal notified nobody.
        this.setUser({ ...currentUserdata.user, ...user })
      }
    } catch (error) {
      return false
    }
    return true
  }
  //#endregion
  //#region photo
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
      // the error interceptor has already shown the snackbar; swallowing this
      // silently as well left an upload failing with no trace anywhere
      console.error('photo upload failed', error)
    }
    return false
  }
  //#endregion



}

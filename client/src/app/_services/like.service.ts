import { computed, inject, Injectable, Signal } from '@angular/core'
import { User } from '../_models/user'
import { AccountService } from './account.service'
import { HttpClient } from '@angular/common/http'
import { environment } from '../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class LikeService {
  user: Signal<User | undefined>
  _http: HttpClient = inject(HttpClient)
  accountservice: AccountService = inject(AccountService)
  private baseurl = environment.baseUrl + 'api/like/'
  constructor() {
    this.user = computed(() => this.accountservice.data()?.user)
  }
  public IsfollowingMember(id: string): boolean {
    const user = this.user()
    if (!user) return false
    const following = (user.following as string[])
    return following.includes(id)
  }

  toggleLike(target_id: string): boolean {
    const user = this.user()
    if (!user) return false
    const url = this.baseurl
    this._http.put(url, { target_id }).subscribe()
    const following = (user.following as string[])
    const isfollowingtarget = following.includes(target_id)
    if (isfollowingtarget) {
      console.log(`unliking ${target_id}`)
      user.following = following.filter(id => id !== target_id)

    } else {
      console.log(`like ${target_id}`)
      following.push(target_id)
      user.following = following

    }
    this.accountservice._setuser(user)
    return user.following.includes(target_id)
  }
}

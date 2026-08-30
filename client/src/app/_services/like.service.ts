import { computed, inject, Injectable, signal, Signal } from '@angular/core'
import { User } from '../_models/user'
import { AccountService } from './account.service'
import { HttpClient } from '@angular/common/http'
import { environment } from '../../environments/environment'
import { createPaginator, Paginator, UserQueryPagination } from '../_models/pagination'
import { } from "../_models/pagination"
import { cacheManager } from '../_helper/cache'
import { pareQuery, pareUserPhoto } from '../_helper/helper'

type listType = 'following' | 'follower' | 'match'

/** How long the "It's a match" celebration stays on screen. */
const MATCH_FLASH_MS = 2600

@Injectable({
  providedIn: 'root'
})
export class LikeService {
  user: Signal<User | undefined>
  following = signal<Paginator<UserQueryPagination, User>>(createPaginator())
  followers = signal<Paginator<UserQueryPagination, User>>(createPaginator())
  /** People I follow who follow me back. */
  matches = signal<Paginator<UserQueryPagination, User>>(createPaginator())
  /** Id of the person a like just matched with, so the card that triggered it
   *  can celebrate. Clears itself again a moment later. */
  justMatched = signal<string | null>(null)
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
    // the answer says whether this like completed a pair; the heart itself is
    // flipped optimistically so the card does not wait for the round trip
    this._http.put<{ liked: boolean, matched: boolean }>(url, { target_id }).subscribe({
      next: result => {
        if (!result?.matched) return
        this.justMatched.set(target_id)
        setTimeout(() => {
          if (this.justMatched() === target_id) this.justMatched.set(null)
        }, MATCH_FLASH_MS)
      }
    })
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
  getDataFromApi(type: listType) {
    const target = {
      following: { signal: this.following, path: 'following' },
      follower: { signal: this.followers, path: 'follower' },
      match: { signal: this.matches, path: 'matches' },
    }[type]

    const pagination = target.signal().pagination
    const key = cacheManager.createKey(pagination)
    const cachedata = cacheManager.load(key, type)
    if (cachedata) {
      console.log(`load ${type} data cache 👴🏿`)
      target.signal.set(cachedata as Paginator<UserQueryPagination, User>)
      return
    }
    console.log(`load ${type} data Api 🤓`)
    const url = this.baseurl + target.path + pareQuery(pagination)
    this._http.get<Paginator<UserQueryPagination, User>>(url).subscribe({
      next: response => {
        response.items = response.items.map(pareUserPhoto)
        const key = cacheManager.createKey(response.pagination)
        cacheManager.save(key, response, type)
        target.signal.set(response)
      }
    })
  }
  getFollowers() {
    this.getDataFromApi('follower')
  }
  getFollowing() {
    this.getDataFromApi('following')
  }
  getMatches() {
    this.getDataFromApi('match')
  }
}

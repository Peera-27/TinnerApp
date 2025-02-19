import { computed, inject, Injectable, signal, Signal } from '@angular/core'
import { User } from '../_models/user'
import { AccountService } from './account.service'
import { HttpClient } from '@angular/common/http'
import { environment } from '../../environments/environment'
import { default_paginator, Paginator, UserQueryPagination } from '../_models/pagination'
import { } from "../_models/pagination"
import { cacheManager } from '../_helper/cache'
import { pareQuery } from '../_helper/helper'
@Injectable({
  providedIn: 'root'
})
export class LikeService {
  user: Signal<User | undefined>
  following = signal<Paginator<UserQueryPagination, User>>(default_paginator)
  followers = signal<Paginator<UserQueryPagination, User>>(default_paginator)
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
  getDataFromApi(type: 'following' | 'follower') {
    const setcache = (cachedata: Paginator<UserQueryPagination, User>) => {
      if (type === 'following') {
        this.following.set(cachedata)
      } else {
        this.followers.set(cachedata)
      }
    }
    const pagination = type === 'following' ? this.following().pagination : this.followers().pagination
    const key = cacheManager.createKey(pagination)
    const cachedata = cacheManager.load(key, type)
    if (cachedata) {
      console.log(`load ${type} data cache 👴🏿`)
      setcache(cachedata)
      return
    }
    console.log(`load ${type} data Api 🤓`)
    const url = this.baseurl + type + pareQuery(pagination)
    this._http.get<Paginator<UserQueryPagination, User>>(url).subscribe({
      next: response => {
        const key = cacheManager.createKey(response.pagination)
        cacheManager.save(key, response, type)
        setcache(response)
      }
    })
  }
  getFollowers() {
    this.getDataFromApi('follower')
  }
  getFollowing() {
    this.getDataFromApi('following')
  }
}

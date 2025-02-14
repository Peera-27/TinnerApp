import { HttpClient } from '@angular/common/http'
import { inject, Injectable, signal } from '@angular/core'
import { environment } from '../../environments/environment'
import { User } from '../_models/user'
import { cacheManager } from '../_helper/cache'
import { Paginator, UserQueryPagination, default_paginator } from '../_models/pagination'
import { pareQuery, pareUserPhoto } from '../_helper/helper'
import { firstValueFrom } from 'rxjs'


type dataCategory = 'member' | 'follower' | 'following'
@Injectable({
  providedIn: 'root'
})
export class MemberService {
  private http = inject(HttpClient)
  private url = environment.baseUrl + 'api/' //user


  paginator = signal<Paginator<UserQueryPagination, User>>(default_paginator)

  private getData(category: dataCategory) {
    const pagination = this.paginator().pagination
    //get
    let key = cacheManager.createKey(pagination)
    const cachData = cacheManager.load(key, category)
    if (cachData) {
      console.log(`load ${category} from cache`)
      this.paginator.set(cachData)
      return
    }

    //get from server
    console.log(`load ${category} from server !!`)
    const url = this.url + 'user/' + pareQuery(pagination)
    this.http.get<Paginator<UserQueryPagination, User>>(url).subscribe({
      next: response => {
        key = cacheManager.createKey(pagination)
        cacheManager.save(key, response, category)
        this.paginator.set(response)
      }
    })
  }
  getMembers() {
    this.getData('member')
  }
  async getMemverByusername(username: string): Promise<User | undefined> {
    const member = this.paginator().items.find(obj => obj.username === username)
    if (member) {
      console.log('gay form cache')
      return member
    } else {
      console.log('get from api')
      try {
        const url = this.url + 'user/' + username
        const _member = await firstValueFrom(this.http.get<User>(url))
        return pareUserPhoto(_member)
      } catch (error) {
        console.error('Someting Nigga member 🙎🏿‍♂️ : ', error)
      }
    }
    return undefined
  }
}


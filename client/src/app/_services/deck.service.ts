import { HttpClient } from '@angular/common/http'
import { inject, Injectable, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../environments/environment'
import { cacheManager } from '../_helper/cache'
import { pareQuery, pareUserPhoto } from '../_helper/helper'
import { Paginator, UserQueryPagination } from '../_models/pagination'
import { User } from '../_models/user'

/** How many faces are pulled at a time. Enough to swipe through without a wait,
 *  small enough that the answer is not a page of dead weight. */
const BATCH = 20

@Injectable({
  providedIn: 'root'
})
export class DeckService {
  private http = inject(HttpClient)
  private baseUrl = environment.baseUrl + 'api/user'

  /** The stack, top card first. */
  cards = signal<User[]>([])
  loading = signal(false)
  exhausted = signal(false)

  /** The last person passed on, so a mis-swipe can be taken back. */
  private lastPassed = signal<User | null>(null)
  canUndo = signal(false)

  async load(): Promise<void> {
    this.loading.set(true)
    const pagination: UserQueryPagination = { pageSize: BATCH, currentPage: 1 }
    try {
      const url = `${this.baseUrl}/deck${pareQuery(pagination)}`
      const paginator = await firstValueFrom(this.http.get<Paginator<UserQueryPagination, User>>(url))
      this.cards.set(paginator.items.map(pareUserPhoto))
      this.exhausted.set(paginator.items.length === 0)
    } catch (error) {
      console.error(`Error:loading deck ${error}`)
    } finally {
      this.loading.set(false)
    }
  }

  /** Drops the top card and tops the stack up when it is running low. */
  private advance(): void {
    this.cards.update(cards => cards.slice(1))
    if (this.cards().length === 0) this.load()
  }

  /** Right swipe is handled by the caller through LikeService — the deck only
   *  has to forget the card. */
  liked(): void {
    this.advance()
  }

  async pass(user: User): Promise<void> {
    if (!user.id) return
    this.lastPassed.set(user)
    this.canUndo.set(true)
    this.advance()

    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/pass`, { target_id: user.id }))
    } catch (error) {
      console.error(`Error:passing ${error}`)
    }
  }

  /** Puts the last passed card back on top. */
  async undo(): Promise<void> {
    const user = this.lastPassed()
    if (!user?.id) return

    this.lastPassed.set(null)
    this.canUndo.set(false)

    try {
      await firstValueFrom(this.http.delete(`${this.baseUrl}/pass/${user.id}`))
      this.cards.update(cards => [user, ...cards])
      this.exhausted.set(false)
      cacheManager.clear('member')
    } catch (error) {
      console.error(`Error:undoing a pass ${error}`)
    }
  }
}

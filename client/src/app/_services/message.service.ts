import { HttpClient } from '@angular/common/http'
import { inject, Injectable, signal } from '@angular/core'
import { environment } from '../../environments/environment'
import { Message, Thread } from '../_models/message'
import { createPaginator, Paginator, QueryPagination } from '../_models/pagination'
import { webSocket, WebSocketSubject } from "rxjs/webSocket"
import { firstValueFrom, Subject, timer, retry } from 'rxjs'
import { cacheManager } from '../_helper/cache'
import { pareQuery, pareUserPhoto } from '../_helper/helper'

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private http = inject(HttpClient)
  private bastUrl = environment.baseUrl + 'api/message'
  private wsUrl = environment.wsUrl
  paginator = signal<Paginator<QueryPagination, Message>>(createPaginator())
  /** The inbox — one row per conversation. */
  threads = signal<Paginator<QueryPagination, Thread>>(createPaginator())
  /** Unread messages across every thread; drives the header badge. */
  unread = signal<number>(0)
  isWSconnected = signal<boolean>(false)
  private socket$!: WebSocketSubject<any>
  private messageSubject = new Subject<Message>()
  message$ = this.messageSubject.asObservable()
  constructor() {
    const protocal = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    this.wsUrl = environment.production
      ? `${protocal}//${window.location.host}${environment.wsUrl}`
      : environment.wsUrl
  }
  connect(receiver_id: string, token: string, user_id: string): void {
    const RECONNECT_INTERVAL = 5000
    this.socket$ = webSocket(`${this.wsUrl}?token=${token}&receiver_id=${receiver_id}`)
    this.socket$.pipe(
      retry({
        delay: err => {
          console.error('connection lose')
          this.isWSconnected.set(false)
          console.log(`ws connection down,will attempt to reconnect in ${RECONNECT_INTERVAL}ms`)
          return timer(RECONNECT_INTERVAL)
        }
      })
    ).subscribe({
      next: msg => {
        this.isWSconnected.set(true)
        const message = msg as Message
        if (message.sender && message.receiver) {
          this.messageSubject.next(message)
        }

      },
      error: err => {
        this.isWSconnected.set(false)
        console.error(err)
      },
      complete: () => {
        this.isWSconnected.set(false)
        console.log('ws complete')
      }
    })
  }
  sendMessage(message: Message): void {
    this.socket$.next(message)
  }
  close() {
    this.socket$.complete()
  }
  async getMessageHistory(receiver_id: string) {
    const pagination = this.paginator().pagination
    // the cache key must include the person the thread belongs to, otherwise
    // every conversation would read back the first one that was loaded
    const key = cacheManager.createKey({ ...pagination, receiver_id })

    const paginationCache = cacheManager.load(key, 'chat')
    if (paginationCache) {
      this.paginator.set(paginationCache as Paginator<QueryPagination, Message>)
      console.log('get chat history from cache')

      return
    }
    console.log('get chat history from server')

    const url = this.bastUrl + `/${receiver_id}` + pareQuery(pagination)
    try {
      const paginator = await firstValueFrom(this.http.get<Paginator<QueryPagination, Message>>(url))
      cacheManager.save(key, paginator, 'chat')
      this.paginator.set(paginator)
      // opening a thread marks it read on the server, so the badge is stale now
      this.refreshUnread()
    }
    catch (error) {
      console.error(`Error:loading chat history ${error}`)
    }
  }

  /** The inbox listing. Cached like the other lists, keyed by the page asked for. */
  async getThreads(): Promise<void> {
    const pagination = this.threads().pagination
    const key = cacheManager.createKey(pagination)

    const cached = cacheManager.load(key, 'thread')
    if (cached) {
      console.log('get inbox from cache')
      this.threads.set(cached as Paginator<QueryPagination, Thread>)
      return
    }
    console.log('get inbox from server')

    const url = this.bastUrl + '/threads' + pareQuery(pagination)
    try {
      const paginator = await firstValueFrom(this.http.get<Paginator<QueryPagination, Thread>>(url))
      // the API returns raw photo rows; the row needs a resolved avatar
      paginator.items = paginator.items.map(t => ({ ...t, user: pareUserPhoto(t.user) }))
      cacheManager.save(key, paginator, 'thread')
      this.threads.set(paginator)
    } catch (error) {
      console.error(`Error:loading inbox ${error}`)
    }
  }

  /** Re-reads the unread total. Cheap enough to call whenever it may have moved. */
  refreshUnread(): void {
    this.http.get<{ count: number }>(this.bastUrl + '/unread').subscribe({
      next: response => this.unread.set(response.count),
      error: () => this.unread.set(0),
    })
  }

  /**
   * Removes one message from my side only — the other person keeps their copy
   * until they delete it too.
   */
  async deleteMessage(message_id: string): Promise<boolean> {
    try {
      await firstValueFrom(this.http.delete(this.bastUrl + `/${message_id}`))
      this.paginator.update(current => ({
        ...current,
        items: current.items.filter(m => m.id !== message_id),
      }))
      // the cached pages still hold the deleted row
      cacheManager.clear('chat')
      cacheManager.clear('thread')
      return true
    } catch (error) {
      console.error(`Error:deleting message ${error}`)
      return false
    }
  }
}

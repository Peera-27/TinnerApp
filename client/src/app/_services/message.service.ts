import { HttpClient } from '@angular/common/http'
import { inject, Injectable, signal } from '@angular/core'
import { environment } from '../../environments/environment'
import { Message } from '../_models/message'
import { default_paginator, Paginator, QueryPagination } from '../_models/pagination'
import { webSocket, WebSocketSubject } from "rxjs/webSocket"
import { delay, firstValueFrom, retry, Subject, timer } from 'rxjs'
import { cacheManager } from '../_helper/cache'
import { pareQuery } from '../_helper/helper'

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private http = inject(HttpClient)
  private bastUrl = environment.baseUrl + 'api/message'
  private wsUrl = environment.wsUrl
  paginator = signal<Paginator<QueryPagination, Message>>(default_paginator)
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
    this.socket$ = webSocket(`${this.wsUrl}?token=${token}&reciver_id=${receiver_id}`)
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
    const key = cacheManager.createKey(pagination)

    const paginationCache = cacheManager.load(key, 'chat')
    if (paginationCache) {
      this.paginator.set(paginationCache)
      console.log('get chat history from cache')

      return
    }
    console.log('get chat history from server')

    const url = this.bastUrl + `/${receiver_id}` + pareQuery(pagination)
    try {
      const paginator = await firstValueFrom(this.http.get<Paginator<QueryPagination, Message>>(url))
      cacheManager.save(key, paginator, 'chat')
    }
    catch (error) {
      console.error(`Error:loading chat history ${error}`)
    }
  }
}
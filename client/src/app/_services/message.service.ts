import { HttpClient } from '@angular/common/http'
import { inject, Injectable, signal } from '@angular/core'
import { environment } from '../../environments/environment'
import { Message } from '../_models/message'
import { default_paginator, Paginator, QueryPagination } from '../_models/pagination'
import { WebSocketSubject } from "rxjs/webSocket"
import { Subject } from 'rxjs'

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
  connect(receiver_id: string, token: string, user_id: string): void { }
  sendMessage(message: Message): void { }
  close() {
    this.socket$.complete()
  }
  getMessageHistory(receiver_id: string) { }
}

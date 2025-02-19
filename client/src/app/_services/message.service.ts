import { HttpClient } from '@angular/common/http'
import { inject, Injectable, signal } from '@angular/core'
import { environment } from '../../environments/environment'
import { Message } from '../_models/message'
import { default_paginator, Paginator, QueryPagination } from '../_models/pagination'

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private http = inject(HttpClient)
  private bastUrl = environment.baseUrl + 'api/message'
  private wsUrl = environment.wsUrl
  paginator = signal<Paginator<QueryPagination, Message>>(default_paginator)
  isWSconnected = signal<boolean>(false)
  constructor() { }
}

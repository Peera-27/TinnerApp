import { HttpClient } from '@angular/common/http'
import { inject, Injectable, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../environments/environment'
import { pareQuery, pareUserPhoto } from '../_helper/helper'
import { Notification } from '../_models/notification'
import { createPaginator, Paginator, QueryPagination } from '../_models/pagination'
import { HubService } from './hub.service'

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient)
  private hub = inject(HubService)
  private baseUrl = environment.baseUrl + 'api/notification'

  paginator = signal<Paginator<QueryPagination, Notification>>(createPaginator())
  unread = signal(0)

  constructor() {
    // anything the hub pushes goes straight to the top of the list, so the bell
    // is right without waiting for the next page load
    this.hub.notification$.subscribe(notification => {
      notification.actor = pareUserPhoto(notification.actor)
      this.paginator.update(current => ({
        ...current,
        items: [notification, ...current.items],
      }))
      this.unread.update(count => count + 1)
    })
  }

  async load(): Promise<void> {
    const pagination = this.paginator().pagination
    const url = this.baseUrl + '/' + pareQuery(pagination)
    try {
      const paginator = await firstValueFrom(this.http.get<Paginator<QueryPagination, Notification>>(url))
      paginator.items = paginator.items.map(n => ({ ...n, actor: pareUserPhoto(n.actor) }))
      this.paginator.set(paginator)
    } catch (error) {
      console.error(`Error:loading notifications ${error}`)
    }
  }

  refreshUnread(): void {
    this.http.get<{ count: number }>(this.baseUrl + '/unread').subscribe({
      next: response => this.unread.set(response.count),
      error: () => this.unread.set(0),
    })
  }

  async markAllRead(): Promise<void> {
    if (this.unread() === 0) return
    try {
      await firstValueFrom(this.http.patch(this.baseUrl + '/read', {}))
      const now = new Date()
      this.paginator.update(current => ({
        ...current,
        items: current.items.map(n => n.read_at ? n : { ...n, read_at: now }),
      }))
      this.unread.set(0)
    } catch (error) {
      console.error(`Error:marking notifications read ${error}`)
    }
  }

  async markRead(notification: Notification): Promise<void> {
    if (notification.read_at) return
    try {
      await firstValueFrom(this.http.patch(`${this.baseUrl}/${notification.id}/read`, {}))
      const now = new Date()
      this.paginator.update(current => ({
        ...current,
        items: current.items.map(n => n.id === notification.id ? { ...n, read_at: now } : n),
      }))
      this.unread.update(count => Math.max(0, count - 1))
    } catch (error) {
      console.error(`Error:marking notification read ${error}`)
    }
  }
}

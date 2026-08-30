import { inject, Injectable, signal } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Subject, timer, retry } from 'rxjs'
import { webSocket, WebSocketSubject } from 'rxjs/webSocket'
import { environment } from '../../environments/environment'
import { Notification } from '../_models/notification'

type HubEvent =
  | { type: 'hello', online: string[] }
  | { type: 'presence', user_id: string, online: boolean }
  | { type: 'notification', payload: Notification }
  | { type: 'error', message: string }

/**
 * The always-on socket, one per signed-in tab.
 *
 * The chat socket in MessageService only exists while a conversation is open;
 * this one stays up for the whole session, which is what makes the green dots
 * and the notification bell work while you are somewhere else in the app.
 */
@Injectable({
  providedIn: 'root'
})
export class HubService {
  private http = inject(HttpClient)
  private wsUrl = environment.wsUrl.replace('/api/message/ws', '/api/hub/ws')

  /** Ids of everyone currently connected. */
  online = signal<ReadonlySet<string>>(new Set())
  connected = signal(false)

  private notificationSubject = new Subject<Notification>()
  notification$ = this.notificationSubject.asObservable()

  private socket$?: WebSocketSubject<HubEvent>
  /** The token the open socket was authenticated with. A refresh hands out a
   *  new one, and the socket has to be rebuilt around it — otherwise a
   *  reconnect would keep retrying with a token that has expired. */
  private token?: string

  constructor() {
    const protocal = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    this.wsUrl = environment.production
      ? `${protocal}//${window.location.host}${this.wsUrl}`
      : this.wsUrl
  }

  connect(token: string): void {
    if (this.socket$ && this.token === token) return
    if (this.socket$) this.disconnect()

    this.token = token
    const RECONNECT_INTERVAL = 5000

    this.socket$ = webSocket<HubEvent>(`${this.wsUrl}?token=${token}`)
    this.socket$.pipe(
      retry({
        delay: () => {
          this.connected.set(false)
          return timer(RECONNECT_INTERVAL)
        }
      })
    ).subscribe({
      next: event => {
        this.connected.set(true)
        this.handle(event)
      },
      error: () => this.connected.set(false),
      complete: () => this.connected.set(false),
    })
  }

  disconnect(): void {
    this.socket$?.complete()
    this.socket$ = undefined
    this.token = undefined
    this.connected.set(false)
    this.online.set(new Set())
  }

  isOnline(user_id?: string): boolean {
    return !!user_id && this.online().has(user_id)
  }

  /** Falls back to the REST list — used right after a reconnect. */
  refreshOnline(): void {
    this.http.get<{ ids: string[] }>(environment.baseUrl + 'api/hub/online').subscribe({
      next: response => this.online.set(new Set(response.ids)),
    })
  }

  private handle(event: HubEvent): void {
    switch (event.type) {
      case 'hello':
        this.online.set(new Set(event.online))
        break
      case 'presence': {
        // a new Set each time: signals compare by reference, so mutating the
        // existing one would not repaint a single dot
        const next = new Set(this.online())
        if (event.online) next.add(event.user_id)
        else next.delete(event.user_id)
        this.online.set(next)
        break
      }
      case 'notification':
        this.notificationSubject.next(event.payload)
        break
    }
  }
}

import { Component, computed, effect, inject } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { MatMenuModule } from '@angular/material/menu'
import { MatTooltipModule } from '@angular/material/tooltip'
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router'
import { filter } from 'rxjs'
import { AccountService } from '../_services/account.service'
import { MessageService } from '../_services/message.service'
import { NotificationService } from '../_services/notification.service'
import { ThemeService } from '../_services/theme.service'
import { DEFAULT_AVATAR, timeAgo } from '../_helper/helper'
import { Notification } from '../_models/notification'

interface NavItem {
  label: string
  icon: string
  link: string
  exact: boolean
  /** Rendered as a dot on the nav item; 0 means nothing to show. */
  badge: number
}

@Component({
  selector: 'app-header',
  imports: [MatMenuModule, MatButtonModule, MatIconModule, MatTooltipModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  private accountService = inject(AccountService)
  private messageService = inject(MessageService)
  private notificationService = inject(NotificationService)
  private router = inject(Router)
  protected theme = inject(ThemeService)

  user = computed(() => this.accountService.data()?.user)
  avatar = computed(() => this.user()?.avatar || DEFAULT_AVATAR)
  initial = computed(() => (this.user()?.display_name ?? '?').charAt(0).toUpperCase())
  unread = this.messageService.unread
  unreadNotifications = this.notificationService.unread

  /** The bell menu shows the newest handful; the rest is one click away. */
  recent = computed(() => this.notificationService.paginator().items.slice(0, 8))

  protected readonly timeAgo = timeAgo

  /** Full navigation — the desktop bar has room for all of it. */
  readonly nav = computed<NavItem[]>(() => [
    { label: 'Discover', icon: 'explore', link: '/', exact: true, badge: 0 },
    { label: 'Swipe', icon: 'style', link: '/swipe', exact: false, badge: 0 },
    { label: 'Matches', icon: 'favorite', link: '/matches', exact: false, badge: 0 },
    { label: 'Messages', icon: 'chat_bubble', link: '/messages', exact: false, badge: this.unread() },
    { label: 'Followers', icon: 'group', link: '/followers', exact: false, badge: 0 },
    { label: 'Following', icon: 'volunteer_activism', link: '/followings', exact: false, badge: 0 }
  ])

  /** The phone tab bar only fits the four main destinations — Profile is added
   *  by the template, and the follow lists live in the account menu. */
  readonly tabs = computed<NavItem[]>(() => this.nav().slice(0, 4))

  constructor() {
    // the badges have to be right the moment the header appears, and again
    // after every navigation, since reading clears part of them
    effect(() => {
      if (this.user()) this.messageService.refreshUnread()
    })

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe(() => {
      if (this.user()) this.messageService.refreshUnread()
    })
  }

  /** Opening the bell is what marks the pile read. */
  onNotificationsOpened() {
    this.notificationService.load()
    this.notificationService.markAllRead()
  }

  /** Where a notification takes you: a message opens the chat, a like or a
   *  match opens the profile behind it. */
  linkFor(notification: Notification): string {
    return `/members-profile/${notification.actor.username}`
  }

  queryFor(notification: Notification): Record<string, string> {
    return notification.type === 'message' ? { chat: '1' } : {}
  }

  textFor(notification: Notification): string {
    const name = notification.actor.display_name ?? notification.actor.username ?? 'Someone'
    switch (notification.type) {
      case 'like': return `${name} liked you`
      case 'match': return `You and ${name} matched`
      case 'message': return `${name} sent you a message`
      default: return `${name} did something`
    }
  }

  iconFor(notification: Notification): string {
    switch (notification.type) {
      case 'like': return 'favorite'
      case 'match': return 'auto_awesome'
      case 'message': return 'chat_bubble'
      default: return 'notifications'
    }
  }

  avatarOf(notification: Notification): string {
    return notification.actor.avatar || DEFAULT_AVATAR
  }

  logout() {
    this.accountService.logout()
    this.router.navigate(['/'])
  }
}

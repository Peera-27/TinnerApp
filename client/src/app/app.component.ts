import { Component, effect, inject } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { HeaderComponent } from './header/header.component'
import { NgxSpinnerComponent } from 'ngx-spinner'
import { AccountService } from './_services/account.service'
import { HubService } from './_services/hub.service'
import { NotificationService } from './_services/notification.service'
import { ThemeService } from './_services/theme.service'

@Component({
  selector: 'app-root',
  imports: [NgxSpinnerComponent, RouterOutlet, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  // Instantiated here so the stored light/dark preference is applied on boot,
  // before any route renders.
  protected readonly theme = inject(ThemeService)

  private accountService = inject(AccountService)
  private hub = inject(HubService)
  private notifications = inject(NotificationService)

  constructor() {
    // The hub socket belongs to the session, not to any one screen, so it is
    // opened here and follows sign-in and sign-out on its own.
    effect(() => {
      const session = this.accountService.data()
      if (session?.token) {
        this.hub.connect(session.token)
        this.notifications.refreshUnread()
      } else {
        this.hub.disconnect()
      }
    })
  }
}

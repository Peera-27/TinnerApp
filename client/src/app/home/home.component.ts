import { Component, computed, inject, Signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { MatIconModule } from '@angular/material/icon'
import { AccountService } from '../_services/account.service'
import { User } from '../_models/user'
import { MemberComponent } from '../member/member.component'

@Component({
  selector: 'app-home',
  imports: [MemberComponent, RouterLink, MatIconModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  private accountService = inject(AccountService)
  user: Signal<User | undefined>

  readonly steps = [
    {
      icon: 'person_add',
      title: 'Build your profile',
      text: 'Add a few photos, tell people what you are into, and set who you are looking for.'
    },
    {
      icon: 'explore',
      title: 'Discover people',
      text: 'Filter by age, gender and what they want — no endless scrolling through the wrong crowd.'
    },
    {
      icon: 'favorite',
      title: 'Follow and match',
      text: 'Tap the heart. When the feeling is mutual, you both show up in each other list.'
    }
  ]

  constructor() {
    this.user = computed(() => this.accountService.data()?.user)
  }
}

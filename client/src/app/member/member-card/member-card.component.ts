import { Component, computed, inject, input, OnInit, signal } from '@angular/core'
import { User } from '../../_models/user'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { LikeService } from '../../_services/like.service'
import { cacheManager } from '../../_helper/cache'
import { RouterLink } from '@angular/router'
import { DEFAULT_PHOTO } from '../../_helper/helper'
import { HubService } from '../../_services/hub.service'


@Component({
  selector: 'app-member-card',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, RouterLink],
  templateUrl: './member-card.component.html',
  styleUrl: './member-card.component.scss'
})
export class MemberCardComponent implements OnInit {
  private likeService = inject(LikeService)
  private hub = inject(HubService)

  member = input.required<User>()
  isfollowing = signal(false)
  justLiked = signal(false)

  photo = computed(() => this.member().photoOfTheDay || this.member().avatar || DEFAULT_PHOTO)

  /** True for a moment after a like that turned out to be mutual. */
  matched = computed(() => this.likeService.justMatched() === this.member().id)

  /** While the hub is connected it is the only truth about who is around; the
   *  flag that came with the list is just the fallback for a dropped socket. */
  isOnline = computed(() => this.hub.connected()
    ? this.hub.isOnline(this.member().id)
    : this.member().is_online === true)

  /** `interest` is free text — show the first couple of comma separated values. */
  tags = computed(() => (this.member().interest ?? '')
    .split(/[,#|]/)
    .map(t => t.trim())
    .filter(Boolean)
    .slice(0, 3))

  lookingFor = computed(() => {
    switch (this.member().looking_for) {
      case 'male': return 'Looking for men'
      case 'female': return 'Looking for women'
      case 'all': return 'Open to everyone'
      default: return 'Still figuring it out'
    }
  })

  togglelike() {
    const member = this.member()
    if (!member?.id) return
    const following = this.likeService.toggleLike(member.id)
    this.isfollowing.set(following)
    if (following) {
      this.justLiked.set(true)
      setTimeout(() => this.justLiked.set(false), 700)
    }
    cacheManager.clear('all')
  }

  onImageError(event: Event) {
    (event.target as HTMLImageElement).src = DEFAULT_PHOTO
  }

  ngOnInit() {
    const member = this.member()
    if (!member?.id) return
    this.isfollowing.set(this.likeService.IsfollowingMember(member.id))
  }
}

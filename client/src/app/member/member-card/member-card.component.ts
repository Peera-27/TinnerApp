import { Component, inject, input, OnInit } from '@angular/core'
import { User } from '../../_models/user'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { LikeService } from '../../_services/like.service'
import { cacheManager } from '../../_helper/cache'

@Component({
  selector: 'app-member-card',
  imports: [MatButtonModule, MatCardModule],
  templateUrl: './member-card.component.html',
  styleUrl: './member-card.component.scss'
})
export class MemberCardComponent implements OnInit {

  likeService: LikeService = inject(LikeService)
  member = input.required<User>()
  isfollowing = false
  togglelike() {
    const member = this.member()
    if (!member || !member.id) return
    this.likeService.toggleLike(member.id)

  }
  ngOnInit() {
    const member = this.member()
    if (!member || !member.id) return
    this.isfollowing = this.likeService.IsfollowingMember(member.id)
    cacheManager.clear('all')
  }
}

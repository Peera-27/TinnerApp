import { Component, inject, OnInit } from '@angular/core'
import { User } from '../../_models/user'
import { GalleryModule, GalleryItem, ImageItem } from 'ng-gallery'
import { MemberService } from '../../_services/member.service'
import { Photo } from '../../_models/photo'
import { ActivatedRoute, Router } from '@angular/router'


@Component({
  selector: 'app-member-profile',
  imports: [GalleryModule],
  templateUrl: './member-profile.component.html',
  styleUrl: './member-profile.component.scss'
})
export class MemberProfileComponent implements OnInit {
  member!: User
  images: GalleryItem[] = []
  memberService = inject(MemberService)
  activeRoute = inject(ActivatedRoute)
  router = inject(Router)

  private initGalleryItem(photos: Photo[]) {

  }
  async getmember() {
    const username = this.activeRoute.snapshot.paramMap.get('username')
    if (!username) return
    const member = await this.memberService.getMemverByusername(username)
    if (!member) {
this.router.navigate(['404'])
    }
  }
  ngOnInit(): void {
    this.getmember()
  }
}

import { Component, inject, OnInit, WritableSignal } from '@angular/core'
import { LikeService } from '../_services/like.service'
import { default_pageSizeOption, Paginator, UserQueryPagination } from '../_models/pagination'
import { User } from '../_models/user'
import { FormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatExpansionModule } from '@angular/material/expansion'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIcon } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator'
import { MatSelectModule } from '@angular/material/select'
import { MemberCardComponent } from '../member/member-card/member-card.component'

@Component({
  selector: 'app-followings',
  imports: [MemberCardComponent, MatIcon, MatSelectModule, MatButtonModule, MatPaginatorModule, MatExpansionModule, FormsModule, MatInputModule, MatFormFieldModule],
  templateUrl: './followings.component.html',
  styleUrl: './followings.component.scss'
})
export class FollowingsComponent implements OnInit {
  private likeService = inject(LikeService)
  pageSize = default_pageSizeOption

  following: WritableSignal<Paginator<UserQueryPagination, User>>
  constructor() {
    this.following = this.likeService.following
  }

  async onSearch() {
    this.likeService.getFollowing()
  }
  ngOnInit(): void {
    this.onSearch()
  }
  onReset() {         // onReset ที่ข้อมูลในฟิลหาย
    const resetPagination: UserQueryPagination = {
      username: '',
      looking_for: '',
      gender: '',
      min_age: undefined,
      max_age: undefined,
      currentPage: 1,
      pageSize: this.following().pagination.pageSize ?? 10,
      length: 0
    }

    // อัปเดต paginator ใหม่
    this.following.set({ ...this.following(), pagination: resetPagination })

    // บังคับให้ Angular detect การเปลี่ยนแปลง
    setTimeout(() => this.onSearch(), 0)
  }
  onPageChnage(event: PageEvent) {
    const copypaginator = this.following()
    copypaginator.pagination.currentPage = event.pageIndex + 1
    copypaginator.pagination.pageSize = event.pageSize
    this.following.set(copypaginator)
    this.onSearch()

  }
}

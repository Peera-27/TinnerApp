import { Component, inject, OnInit, WritableSignal } from '@angular/core'
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { RouterLink } from '@angular/router'
import { default_pageSizeOption, Paginator, UserQueryPagination } from '../_models/pagination'
import { User } from '../_models/user'
import { LikeService } from '../_services/like.service'
import { MemberCardComponent } from '../member/member-card/member-card.component'
import { FilterBarComponent } from '../_shared/filter-bar/filter-bar.component'
import { EmptyStateComponent } from '../_shared/empty-state/empty-state.component'

@Component({
  selector: 'app-followings',
  imports: [MemberCardComponent, FilterBarComponent, EmptyStateComponent, MatButtonModule, MatIconModule, MatPaginatorModule, RouterLink],
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

  ngOnInit(): void {
    this.onSearch()
  }

  async onSearch() {
    this.likeService.getFollowing()
  }

  onReset() {
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

    this.following.set({ ...this.following(), pagination: resetPagination })
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

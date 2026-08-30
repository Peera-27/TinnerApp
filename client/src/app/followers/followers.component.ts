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
  selector: 'app-followers',
  imports: [MemberCardComponent, FilterBarComponent, EmptyStateComponent, MatButtonModule, MatIconModule, MatPaginatorModule, RouterLink],
  templateUrl: './followers.component.html',
  styleUrl: './followers.component.scss'
})
export class FollowersComponent implements OnInit {
  private likeService = inject(LikeService)
  pageSize = default_pageSizeOption

  followers: WritableSignal<Paginator<UserQueryPagination, User>>

  constructor() {
    this.followers = this.likeService.followers
  }

  ngOnInit(): void {
    this.onSearch()
  }

  async onSearch() {
    this.likeService.getFollowers()
  }

  onReset() {
    const resetPagination: UserQueryPagination = {
      username: '',
      looking_for: '',
      gender: '',
      min_age: undefined,
      max_age: undefined,
      currentPage: 1,
      pageSize: this.followers().pagination.pageSize ?? 10,
      length: 0
    }

    this.followers.set({ ...this.followers(), pagination: resetPagination })
    setTimeout(() => this.onSearch(), 0)
  }

  onPageChnage(event: PageEvent) {
    const copypaginator = this.followers()
    copypaginator.pagination.currentPage = event.pageIndex + 1
    copypaginator.pagination.pageSize = event.pageSize
    this.followers.set(copypaginator)
    this.onSearch()
  }
}

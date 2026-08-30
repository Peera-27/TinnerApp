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
  selector: 'app-matches',
  imports: [MemberCardComponent, FilterBarComponent, EmptyStateComponent, MatButtonModule, MatIconModule, MatPaginatorModule, RouterLink],
  templateUrl: './matches.component.html',
  styleUrl: './matches.component.scss'
})
export class MatchesComponent implements OnInit {
  private likeService = inject(LikeService)
  pageSize = default_pageSizeOption

  matches: WritableSignal<Paginator<UserQueryPagination, User>>

  constructor() {
    this.matches = this.likeService.matches
  }

  ngOnInit(): void {
    this.onSearch()
  }

  onSearch() {
    this.likeService.getMatches()
  }

  onReset() {
    const resetPagination: UserQueryPagination = {
      username: '',
      looking_for: '',
      gender: '',
      min_age: undefined,
      max_age: undefined,
      location: '',
      interest: '',
      currentPage: 1,
      pageSize: this.matches().pagination.pageSize ?? 10,
      length: 0
    }

    this.matches.set({ ...this.matches(), pagination: resetPagination })
    setTimeout(() => this.onSearch(), 0)
  }

  onPageChnage(event: PageEvent) {
    const copypaginator = this.matches()
    copypaginator.pagination.currentPage = event.pageIndex + 1
    copypaginator.pagination.pageSize = event.pageSize
    this.matches.set(copypaginator)
    this.onSearch()
  }
}

import { Component, inject, OnInit, WritableSignal } from '@angular/core'
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MemberService } from '../_services/member.service'
import { default_pageSizeOption, Paginator, UserQueryPagination } from '../_models/pagination'
import { User } from '../_models/user'
import { MemberCardComponent } from './member-card/member-card.component'
import { FilterBarComponent } from '../_shared/filter-bar/filter-bar.component'
import { EmptyStateComponent } from '../_shared/empty-state/empty-state.component'

@Component({
  selector: 'app-member',
  imports: [MemberCardComponent, FilterBarComponent, EmptyStateComponent, MatButtonModule, MatIconModule, MatPaginatorModule],
  templateUrl: './member.component.html',
  styleUrl: './member.component.scss'
})
export class MemberComponent implements OnInit {
  private memberservice = inject(MemberService)
  paginator: WritableSignal<Paginator<UserQueryPagination, User>>
  pageSize = default_pageSizeOption

  constructor() {
    this.paginator = this.memberservice.paginator
  }

  ngOnInit(): void {
    this.memberservice.getMembers()
  }

  onPageChnage(event: PageEvent) {
    const copypaginator = this.paginator()
    copypaginator.pagination.currentPage = event.pageIndex + 1
    copypaginator.pagination.pageSize = event.pageSize
    this.paginator.set(copypaginator)
    this.onSearch()
  }

  onSearch() {
    this.memberservice.getMembers()
  }

  onReset() {
    const resetPagination: UserQueryPagination = {
      username: '',
      looking_for: '',
      gender: '',
      min_age: undefined,
      max_age: undefined,
      currentPage: 1,
      pageSize: this.paginator().pagination.pageSize ?? 10,
      length: 0
    }

    this.paginator.set({ ...this.paginator(), pagination: resetPagination })
    setTimeout(() => this.onSearch(), 0)
  }
}

import { Component, inject, OnInit, WritableSignal } from '@angular/core'
import { environment } from '../../environments/environment'
import { HttpClient } from '@angular/common/http'
import { Router } from '@angular/router'
import { MatPaginatorModule } from '@angular/material/paginator'
import { MemberService } from '../_services/member.service'
import { default_pageSizeOption, Paginator, UserQueryPagination } from '../_models/pagination'
import { User } from '../_models/user'
@Component({
  selector: 'app-member',
  imports: [MatPaginatorModule],
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
}

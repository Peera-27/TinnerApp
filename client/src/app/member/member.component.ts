import { Component, inject, OnInit, WritableSignal } from '@angular/core'
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator'
import { MemberService } from '../_services/member.service'
import { default_pageSizeOption, default_paginator, Paginator, UserQueryPagination } from '../_models/pagination'
import { User } from '../_models/user'
import { MatExpansionModule } from '@angular/material/expansion'
import { FormsModule } from '@angular/forms'
import { MatInputModule } from '@angular/material/input'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatButtonModule } from '@angular/material/button'
import { MatSelectModule } from '@angular/material/select'
import { MatIcon } from '@angular/material/icon'
import { MemberCardComponent } from './member-card/member-card.component'


@Component({
  selector: 'app-member',
  imports: [MemberCardComponent, MatIcon, MatSelectModule, MatButtonModule, MatPaginatorModule, MatExpansionModule, FormsModule, MatInputModule, MatFormFieldModule],
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
    this.paginator.set(default_paginator)
    this.onSearch()


  }
}


// onReset() {          onReset ที่ข้อมูลในฟิลหาย
//   const resetPagination: UserQueryPagination = {
//     username: '',
//     looking_for: '',
//     gender: '',
//     min_age: undefined,
//     max_age: undefined,
//     currentPage: 1,
//     pageSize: this.paginator().pagination.pageSize ?? 10,
//     length: 0
//   }

//   // อัปเดต paginator ใหม่
//   this.paginator.set({ ...this.paginator(), pagination: resetPagination });

//   // บังคับให้ Angular detect การเปลี่ยนแปลง
//   setTimeout(() => this.onSearch(), 0);
// }

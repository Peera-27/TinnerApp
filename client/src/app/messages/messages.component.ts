import { Component, inject, OnInit } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator'
import { RouterLink } from '@angular/router'
import { DEFAULT_AVATAR, timeAgo } from '../_helper/helper'
import { Thread } from '../_models/message'
import { default_pageSizeOption } from '../_models/pagination'
import { AccountService } from '../_services/account.service'
import { MessageService } from '../_services/message.service'
import { EmptyStateComponent } from '../_shared/empty-state/empty-state.component'

@Component({
  selector: 'app-messages',
  imports: [EmptyStateComponent, MatButtonModule, MatIconModule, MatPaginatorModule, RouterLink],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.scss'
})
export class MessagesComponent implements OnInit {
  private messageService = inject(MessageService)
  private accountService = inject(AccountService)

  threads = this.messageService.threads
  unread = this.messageService.unread
  pageSize = default_pageSizeOption

  /** Used straight from the template — the list is short, so no pipe needed. */
  protected readonly timeAgo = timeAgo

  ngOnInit(): void {
    this.messageService.getThreads()
    this.messageService.refreshUnread()
  }

  /** True when the last word in the thread was mine, so the row can say "You:". */
  isMine(thread: Thread): boolean {
    return thread.last_message.sender === this.accountService.data()?.user.id
  }

  avatarOf(thread: Thread): string {
    return thread.user.avatar || DEFAULT_AVATAR
  }

  onImageError(event: Event) {
    (event.target as HTMLImageElement).src = DEFAULT_AVATAR
  }

  onPageChange(event: PageEvent) {
    const current = this.threads()
    current.pagination.currentPage = event.pageIndex + 1
    current.pagination.pageSize = event.pageSize
    this.threads.set(current)
    this.messageService.getThreads()
  }
}

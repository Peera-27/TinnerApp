import { Component, inject, OnInit } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSnackBar } from '@angular/material/snack-bar'
import { RouterLink } from '@angular/router'
import { DEFAULT_AVATAR } from '../_helper/helper'
import { User } from '../_models/user'
import { SafetyService } from '../_services/safety.service'
import { EmptyStateComponent } from '../_shared/empty-state/empty-state.component'

@Component({
  selector: 'app-blocked',
  imports: [EmptyStateComponent, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './blocked.component.html',
  styleUrl: './blocked.component.scss'
})
export class BlockedComponent implements OnInit {
  private safety = inject(SafetyService)
  private snackbar = inject(MatSnackBar)

  blocks = this.safety.blocks

  ngOnInit(): void {
    this.safety.loadBlocks()
  }

  avatarOf(user: User): string {
    return user.avatar || DEFAULT_AVATAR
  }

  onImageError(event: Event) {
    (event.target as HTMLImageElement).src = DEFAULT_AVATAR
  }

  async unblock(user: User) {
    if (!user.id) return
    const lifted = await this.safety.unblock(user.id)
    if (lifted)
      this.snackbar.open(`${user.display_name} is unblocked.`, 'OK', { duration: 4000 })
  }
}

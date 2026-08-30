import { Component, inject, input, signal } from '@angular/core'
import { User } from '../../_models/user'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatDialog } from '@angular/material/dialog'
import { UploadPhotoComponent } from '../../_dialogs/upload-photo/upload-photo.component'
import { AccountService } from '../../_services/account.service'
import { EmptyStateComponent } from '../../_shared/empty-state/empty-state.component'
import {
  TimeagoClock, TimeagoCustomFormatter, TimeagoDefaultClock,
  TimeagoFormatter, TimeagoIntl, TimeagoModule
} from 'ngx-timeago'
import { strings as engString } from 'ngx-timeago/language-strings/en.js'

@Component({
  selector: 'app-photo',
  imports: [TimeagoModule, MatButtonModule, MatIconModule, MatTooltipModule, EmptyStateComponent],
  templateUrl: './photo.component.html',
  styleUrl: './photo.component.scss',
  providers: [
    { provide: TimeagoIntl, useClass: TimeagoIntl },
    { provide: TimeagoFormatter, useClass: TimeagoCustomFormatter },
    { provide: TimeagoClock, useClass: TimeagoDefaultClock }
  ]
})
export class PhotoComponent {
  user = input.required<User>()

  private dialog = inject(MatDialog)
  private accountService = inject(AccountService)

  /** id of the photo currently asking "are you sure?" */
  readonly pendingDelete = signal<string | null>(null)

  constructor(private intl: TimeagoIntl) {
    this.intl.strings = engString
    this.intl.changes.next()
  }

  openAddphotoDialog() {
    const ref = this.dialog.open(UploadPhotoComponent, { width: 'min(520px, 92vw)' })
    ref.afterClosed().subscribe(async file => {
      if (!file) return
      await this.accountService.uploadPhoto(file)
    })
  }

  askDelete(photo_id: string) {
    this.pendingDelete.set(photo_id)
  }

  cancelDelete() {
    this.pendingDelete.set(null)
  }

  confirmDelete(photo_id: string) {
    this.pendingDelete.set(null)
    this.accountService.deletephoto(photo_id)
  }

  setAvatar(photo_id: string) {
    this.accountService.setAvatar(photo_id)
  }
}

import { Component, inject, input } from '@angular/core'
import { User } from '../../_models/user'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatCardModule } from '@angular/material/card'
import { CommonModule } from '@angular/common'
import { MatDialog } from '@angular/material/dialog'
import { UploadPhotoComponent } from '../../_dialogs/upload-photo/upload-photo.component'
import { AccountService } from '../../_services/account.service'

@Component({
  selector: 'app-photo',
  imports: [MatButtonModule, MatIconModule, MatCardModule, CommonModule],
  templateUrl: './photo.component.html',
  styleUrl: './photo.component.scss'
})
export class PhotoComponent {
  user = input.required<User>()
  private dialog = inject(MatDialog)
  private accountService = inject(AccountService)
  openAddphotoDialog() {
    const ref = this.dialog.open(UploadPhotoComponent)
    ref.afterClosed().subscribe(async file => {
      await this.accountService.uploadPhoto(file)
    })
  }
  deletePhoto(photo_id: string) {

  }
  setAvatar(photo_id: string) {

  }
}

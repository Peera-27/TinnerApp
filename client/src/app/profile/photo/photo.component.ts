import { Component, inject, input } from '@angular/core'
import { User } from '../../_models/user'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatCardModule } from '@angular/material/card'
import { CommonModule } from '@angular/common'
import { MatDialog } from '@angular/material/dialog'
import { UploadPhotoComponent } from '../../_dialogs/upload-photo/upload-photo.component'

@Component({
  selector: 'app-photo',
  imports: [MatButtonModule, MatIconModule, MatCardModule, CommonModule],
  templateUrl: './photo.component.html',
  styleUrl: './photo.component.scss'
})
export class PhotoComponent {
  user = input.required<User>()
  private dialog = inject(MatDialog)

  openAddphotoDialog() {
    const ref = this.dialog.open(UploadPhotoComponent)
  }
  deletePhoto(photo_id: string) {

  }
  setAvatar(photo_id: string) {

  }
}

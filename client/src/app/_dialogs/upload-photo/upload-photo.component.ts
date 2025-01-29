import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import {
  MatDialogRef,
  MatDialogActions,
  MatDialogContent,
  MatDialogTitle,
} from "@angular/material/dialog"
@Component({
  selector: 'app-upload-photo',
  imports: [MatDialogContent, MatDialogTitle, MatDialogActions, MatButtonModule],
  templateUrl: './upload-photo.component.html',
  styleUrl: './upload-photo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadPhotoComponent {
  acceptedImageType = ['img/jpeg', 'image/png']
  imgFile: File | undefined
  imgPreview = signal<undefined | string>(undefined)
  errMessage = signal<undefined | string>(undefined)

  private readonly dialogRef = inject(MatDialogRef<UploadPhotoComponent>)
  onSubmit() {
    this.dialogRef.close(this.imgFile)
  }
  onImgpicked(event: Event) {

  }
}

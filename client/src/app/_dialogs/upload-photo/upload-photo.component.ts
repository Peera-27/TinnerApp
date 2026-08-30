import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { fileTypeFromBlob } from 'file-type'
import {
  MatDialogRef,
  MatDialogActions,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog'

const MAX_BYTES = 5 * 1024 * 1024

@Component({
  selector: 'app-upload-photo',
  imports: [MatDialogContent, MatDialogTitle, MatDialogActions, MatButtonModule, MatIconModule],
  templateUrl: './upload-photo.component.html',
  styleUrl: './upload-photo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadPhotoComponent {
  acceptedImageType = ['image/jpeg', 'image/png']

  readonly imgFile = signal<File | undefined>(undefined)
  readonly imgPreview = signal<string | undefined>(undefined)
  readonly errMessage = signal<string | undefined>(undefined)
  readonly dragging = signal(false)

  private readonly dialogRef = inject(MatDialogRef<UploadPhotoComponent>)

  onSubmit() {
    this.dialogRef.close(this.imgFile())
  }

  cancel() {
    this.dialogRef.close()
  }

  clear() {
    this.imgFile.set(undefined)
    this.imgPreview.set(undefined)
    this.errMessage.set(undefined)
  }

  onImgpicked(event: Event) {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0])
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault()
    this.dragging.set(true)
  }

  onDragLeave() {
    this.dragging.set(false)
  }

  onDrop(event: DragEvent) {
    event.preventDefault()
    this.dragging.set(false)
    const file = event.dataTransfer?.files?.[0]
    if (file) this.handleFile(file)
  }

  private async handleFile(file: File) {
    this.clear()

    if (file.size > MAX_BYTES) {
      this.errMessage.set('That image is larger than 5 MB — try a smaller one.')
      return
    }

    // sniff the real bytes rather than trusting the extension
    const fileType = await fileTypeFromBlob(file)
    if (!fileType || !this.acceptedImageType.includes(fileType.mime)) {
      this.errMessage.set('Only JPG and PNG images can be uploaded.')
      return
    }

    this.imgFile.set(file)
    const fileReader = new FileReader()
    fileReader.onload = () => this.imgPreview.set(fileReader.result as string)
    fileReader.readAsDataURL(file)
  }

  formatSize(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${Math.round(bytes / 1024)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }
}

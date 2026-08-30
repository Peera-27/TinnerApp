import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog'
import { MatIconModule } from '@angular/material/icon'
import { REPORT_REASONS } from '../../_services/safety.service'

export interface ReportResult {
  reason: string
  detail?: string
  block: boolean
}

@Component({
  selector: 'app-report',
  imports: [MatDialogContent, MatDialogTitle, MatDialogActions, MatButtonModule, MatIconModule, FormsModule],
  templateUrl: './report.component.html',
  styleUrl: './report.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportComponent {
  private readonly dialogRef = inject(MatDialogRef<ReportComponent, ReportResult>)
  /** Only used for the wording — the caller already knows who is being reported. */
  readonly data = inject<{ name: string }>(MAT_DIALOG_DATA)

  readonly reasons = REPORT_REASONS
  readonly reason = signal<string>(REPORT_REASONS[0].value)
  readonly detail = signal('')
  /** Most people who report someone also want them gone. */
  readonly block = signal(true)

  submit() {
    this.dialogRef.close({
      reason: this.reason(),
      detail: this.detail().trim() || undefined,
      block: this.block(),
    })
  }

  cancel() {
    this.dialogRef.close()
  }
}

import { Component, inject } from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'app-sever-error',
  imports: [RouterLink, MatIconModule],
  templateUrl: './sever-error.component.html',
  styleUrl: './sever-error.component.scss'
})
export class SeverErrorComponent {
  private router = inject(Router)
  error: undefined | { [id: string]: unknown }
  showDetails = false

  constructor() {
    this.error = this.router.getCurrentNavigation()?.extras.state
  }

  get code(): string {
    const code = this.error?.['code']
    return code ? String(code) : '500'
  }

  /** The server sends either a plain string or an object with a `message`. */
  get message(): string {
    const raw = this.error?.['message']
    if (!raw) return 'The server ran into a problem and could not finish your request.'
    if (typeof raw === 'string') return raw
    if (typeof raw === 'object' && raw !== null && 'message' in raw) {
      return String((raw as { message: unknown }).message)
    }
    return 'The server ran into a problem and could not finish your request.'
  }

  get details(): string {
    return JSON.stringify(this.error ?? {}, null, 2)
  }

  retry() {
    location.reload()
  }
}

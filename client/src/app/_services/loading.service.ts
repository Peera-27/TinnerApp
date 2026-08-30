import { inject, Injectable } from '@angular/core'
import { NgxSpinnerService } from 'ngx-spinner'

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  loadingRequestCount = 0
  private spinner = inject(NgxSpinnerService)

  loading() {
    this.loadingRequestCount++
    // No `type`: the built-in animations are not loaded, the branded heart in
    // app.component.html is projected into the overlay instead.
    this.spinner.show(undefined, {
      bdColor: 'rgba(14, 12, 19, 0.66)',
      fullScreen: true,
      size: 'medium'
    })
  }

  idle() {
    this.loadingRequestCount--
    if (this.loadingRequestCount <= 0) {
      this.loadingRequestCount = 0
      this.spinner.hide()
    }
  }
}

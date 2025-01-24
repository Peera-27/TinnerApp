import { inject, Injectable } from '@angular/core'
import { NgxSpinnerService } from 'ngx-spinner'

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  loadingRequestCount = 0
  private spinner = inject(NgxSpinnerService)
  constructor() { }
  loading() {
    this.loadingRequestCount++
    this.spinner.show(undefined, {
      type: "ball-8bits",
      bdColor: 'rgba(183, 179, 179, 0.8)',
      color: 'rgba(15, 63, 108, 0.8)',
      fullScreen: true,
      size: "large"

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

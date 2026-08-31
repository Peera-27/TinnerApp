import { inject, Injectable } from '@angular/core'
import { NgxSpinnerService } from 'ngx-spinner'

/**
 * The full-screen loader, shown only when it earns its place.
 *
 * Showing it the instant a request starts meant it flashed on every tap — and
 * the interceptor used to hold every response back a full second so the flash
 * would at least last long enough to read, which made the whole app feel a
 * second slower than it is. Both halves of that are gone.
 *
 * Now the overlay waits: if a request finishes inside `SHOW_AFTER_MS` nothing is
 * ever drawn, which is what happens to nearly every call. Only a request that is
 * genuinely slow puts the loader up, and once up it stays for `MIN_VISIBLE_MS`
 * so it reads as a state and not a glitch.
 */
@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  loadingRequestCount = 0
  private spinner = inject(NgxSpinnerService)

  /** Long enough that a healthy request never draws anything, short enough that
   *  a slow one is acknowledged before it feels ignored. */
  private static readonly SHOW_AFTER_MS = 250
  /** An overlay that appears and vanishes inside a few frames reads as a fault,
   *  so once it is up it stays up this long. */
  private static readonly MIN_VISIBLE_MS = 400

  /** Pending "show it now" timer, while no request has taken long enough yet. */
  private showTimer?: ReturnType<typeof setTimeout>
  /** When the overlay actually went up; 0 while nothing is on screen. */
  private shownAt = 0

  loading() {
    this.loadingRequestCount++
    // already counting down to a show, or already showing — nothing to add
    if (this.showTimer || this.shownAt) return

    this.showTimer = setTimeout(() => {
      this.showTimer = undefined
      // everything finished while we waited, which is the common case
      if (this.loadingRequestCount <= 0) return

      this.shownAt = Date.now()
      // No `type`: the built-in animations are not loaded, the branded heart in
      // app.component.html is projected into the overlay instead.
      this.spinner.show(undefined, {
        bdColor: 'rgba(14, 12, 19, 0.66)',
        fullScreen: true,
        size: 'medium'
      })
    }, LoadingService.SHOW_AFTER_MS)
  }

  idle() {
    this.loadingRequestCount--
    if (this.loadingRequestCount > 0) return
    this.loadingRequestCount = 0

    if (this.showTimer) {
      clearTimeout(this.showTimer)
      this.showTimer = undefined
    }
    // it never got as far as being drawn
    if (!this.shownAt) return

    const remaining = LoadingService.MIN_VISIBLE_MS - (Date.now() - this.shownAt)
    if (remaining <= 0) {
      this.hide()
      return
    }
    setTimeout(() => this.hide(), remaining)
  }

  private hide() {
    // a new request may have started while the minimum was running out; the
    // overlay is still correct for it, so leave it alone
    if (this.loadingRequestCount > 0) return
    this.shownAt = 0
    this.spinner.hide()
  }
}

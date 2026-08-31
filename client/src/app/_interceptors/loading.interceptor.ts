import { HttpInterceptorFn } from '@angular/common/http'
import { inject } from '@angular/core'
import { LoadingService } from '../_services/loading.service'
import { finalize } from 'rxjs'

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService)
  // liking somebody is instant and optimistic on the card — an overlay over the
  // whole screen for it would be worse than no feedback at all
  if (req.url.includes('/api/like')) return next(req)

  loadingService.loading()
  // There used to be a `delay(1000)` here, held over from making the loader
  // visible long enough to admire. It cost every request in the app a full extra
  // second. LoadingService decides when the overlay is warranted now, so nothing
  // has to be slowed down for its benefit.
  return next(req).pipe(
    finalize(() => {
      loadingService.idle()
    })
  )
}

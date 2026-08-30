import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http'
import { inject } from '@angular/core'
import { catchError, from, switchMap, throwError } from 'rxjs'
import { AccountService, SKIP_AUTH_REFRESH } from '../_services/account.service'

/**
 * One refresh at a time. Ten requests failing together must not fire ten
 * rotations — each one revokes the last, and every request but the first would
 * be left holding a dead token.
 */
let inFlight: Promise<boolean> | null = null

function refreshOnce(accountService: AccountService): Promise<boolean> {
  if (!inFlight) {
    inFlight = accountService.refresh().then(
      ok => { inFlight = null; return ok },
      err => { inFlight = null; throw err },
    )
  }
  return inFlight
}

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const accountService = inject(AccountService)

  const withToken = (request: HttpRequest<unknown>) => {
    const token = accountService.data()?.token
    return token
      ? request.clone({ setHeaders: { authorization: 'Bearer ' + token } })
      : request
  }

  return next(withToken(req)).pipe(
    catchError((error: unknown) => {
      const expired = error instanceof HttpErrorResponse && error.status === 401
      // the refresh call itself is marked to skip this, otherwise a failing
      // refresh would try to refresh
      const eligible = expired
        && !req.context.get(SKIP_AUTH_REFRESH)
        && !!accountService.data()?.refresh_token

      if (!eligible) return throwError(() => error)

      return from(refreshOnce(accountService)).pipe(
        // a refresh that fails falls through to the error interceptor, which
        // signs the session out
        switchMap(renewed => renewed ? next(withToken(req)) : throwError(() => error)),
      )
    }),
  )
}

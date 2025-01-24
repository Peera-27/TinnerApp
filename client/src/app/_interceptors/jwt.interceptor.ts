import { HttpInterceptorFn } from '@angular/common/http'
import { inject } from '@angular/core'
import { AccountService } from '../_services/account.service'

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const accountService = inject(AccountService)
  if (accountService.data()?.token) {
    req = req.clone({
      setHeaders: {
        authorization: 'Bearer ' + accountService.data()?.token
      }
    })

  }
  return next(req)
}

import { inject, Injectable, Injector } from '@angular/core'
import { NavigationExtras, Router } from '@angular/router'
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar'
import { throwError } from 'rxjs'
import { AccountService } from './account.service'
@Injectable({
  providedIn: 'root'
})
export class ErrorService {
  private router = inject(Router)
  private snackbar = inject(MatSnackBar)
  // resolved lazily: AccountService -> HttpClient -> this interceptor would be a
  // construction cycle if it were injected as a field
  private injector = inject(Injector)
  private snackbarConfig: MatSnackBarConfig = {
    horizontalPosition: 'center',
    verticalPosition: 'bottom',
    duration: 5000
  }
  constructor() {

  }
  handleError(error: any) {
    if (error) {
      switch (error.status) {
        case 400:
          this.snackbar.open('That request did not look right — please check and try again.', 'OK', this.snackbarConfig)
          break
        case 401:
          // Stale credentials must not leave the app looking signed in. This also
          // covers everyone whose cached user still holds a mongo ObjectId after
          // the move to postgres — those ids no longer resolve.
          this.injector.get(AccountService).logout()
          this.snackbar.open('Your session expired. Please sign in again.', 'OK', this.snackbarConfig)
          this.router.navigate(['/login'])
          break
        case 404:
          this.router.navigate(['/404'])
          break
        case 500:
        case 501:
        case 502:
        case 503:
        case 504:
        case 505:
        case 506:
        case 507:
        case 508:
        case 509:
        case 510:
        case 511:
          if (error.error.message === 'Token has expired') {
            this.router.navigate(['/'])
          }
          const navExtra: NavigationExtras = {
            state: {
              message: error.error,
              code: error.status
            }
          }
          this.router.navigate(['/server-error'], navExtra)
          break
        default:
          this.snackbar.open('Something went wrong. Please try again.', 'OK', this.snackbarConfig)
          break
      }
    }
    return throwError(() => error)
  }
}

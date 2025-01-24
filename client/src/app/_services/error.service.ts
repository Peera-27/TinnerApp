import { inject, Injectable } from '@angular/core'
import { NavigationExtras, Router } from '@angular/router'
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar'
import { throwError } from 'rxjs'
@Injectable({
  providedIn: 'root'
})
export class ErrorService {
  private router = inject(Router)
  private snackbar = inject(MatSnackBar)
  private snackbarConfig: MatSnackBarConfig = {
    horizontalPosition: 'left',
    verticalPosition: 'bottom'
  }
  constructor() {

  }
  handleError(error: any) {
    if (error) {
      switch (error.status) {
        case 400:
          this.snackbar.open('Bad Request 🥵', 'ok', this.snackbarConfig)
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
          this.snackbar.open("😏Something ผิดปกติ😏", 'ok', this.snackbarConfig)
          break
      }
    }
    return throwError(() => error)
  }
}

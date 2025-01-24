import { Component, inject } from '@angular/core'
import { Router } from '@angular/router'

@Component({
  selector: 'app-sever-error',
  imports: [],
  templateUrl: './sever-error.component.html',
  styleUrl: './sever-error.component.scss'
})
export class SeverErrorComponent {
  private router = inject(Router)
  error: undefined | { [id: string]: string | number }
  constructor() {
    this.error = this.router.getCurrentNavigation()?.extras.state
  }
}

import { Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, MatIconModule],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss'
})
export class NotFoundComponent {
  back() {
    history.back()
  }
}

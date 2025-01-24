import { Component } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { HeaderComponent } from "./header/header.component"
import { NgxSpinnerComponent } from 'ngx-spinner'
@Component({
  selector: 'app-root',
  imports: [NgxSpinnerComponent, RouterOutlet, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
}

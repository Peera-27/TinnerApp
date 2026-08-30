import { Component, Input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'app-empty-state',
  imports: [MatIconModule],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss'
})
export class EmptyStateComponent {
  @Input() icon = 'search_off'
  @Input({ required: true }) heading = ''
  @Input() message = ''
}

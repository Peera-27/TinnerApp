import { Component, EventEmitter, Input, Output, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { UserQueryPagination } from '../../_models/pagination'

/**
 * Search + filter controls shared by Discover, Followers and Following.
 * The pagination object is mutated in place — the parent owns it and decides
 * when to re-query.
 */
@Component({
  selector: 'app-filter-bar',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
  templateUrl: './filter-bar.component.html',
  styleUrl: './filter-bar.component.scss'
})
export class FilterBarComponent {
  @Input({ required: true }) pagination!: UserQueryPagination
  @Output() search = new EventEmitter<void>()
  @Output() resetFilters = new EventEmitter<void>()

  protected readonly expanded = signal(false)

  readonly genders = [
    { value: 'male', label: 'Male', icon: 'male' },
    { value: 'female', label: 'Female', icon: 'female' },
    { value: 'all', label: 'LGBTQ+', icon: 'transgender' }
  ]

  get activeCount(): number {
    const p = this.pagination
    return [p.looking_for, p.gender, p.min_age, p.max_age, p.location, p.interest].filter(v => v !== undefined && v !== null && v !== '').length
  }

  onSubmit() {
    this.search.emit()
  }

  onReset() {
    this.resetFilters.emit()
  }
}

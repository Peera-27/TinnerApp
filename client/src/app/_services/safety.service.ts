import { HttpClient } from '@angular/common/http'
import { inject, Injectable, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../environments/environment'
import { cacheManager } from '../_helper/cache'
import { pareQuery, pareUserPhoto } from '../_helper/helper'
import { createPaginator, Paginator, UserQueryPagination } from '../_models/pagination'
import { User } from '../_models/user'

/** The reasons the server accepts, with the wording shown in the dialog. */
export const REPORT_REASONS = [
  { value: 'harassment', label: 'Harassment or abuse' },
  { value: 'spam', label: 'Spam or scam' },
  { value: 'fake_profile', label: 'Fake profile' },
  { value: 'inappropriate_photos', label: 'Inappropriate photos' },
  { value: 'underage', label: 'Under 18' },
  { value: 'other', label: 'Something else' },
] as const

@Injectable({
  providedIn: 'root'
})
export class SafetyService {
  private http = inject(HttpClient)
  private baseUrl = environment.baseUrl + 'api/safety'

  blocks = signal<Paginator<UserQueryPagination, User>>(createPaginator())

  async loadBlocks(): Promise<void> {
    const url = this.baseUrl + '/blocks' + pareQuery(this.blocks().pagination)
    try {
      const paginator = await firstValueFrom(this.http.get<Paginator<UserQueryPagination, User>>(url))
      paginator.items = paginator.items.map(pareUserPhoto)
      this.blocks.set(paginator)
    } catch (error) {
      console.error(`Error:loading blocks ${error}`)
    }
  }

  /**
   * Blocking changes what every list is allowed to show, and it drops the
   * follow on both sides — so every cached page is stale afterwards.
   */
  async block(target_id: string): Promise<boolean> {
    try {
      await firstValueFrom(this.http.put(this.baseUrl + '/blocks', { target_id }))
      cacheManager.clear('all')
      return true
    } catch (error) {
      console.error(`Error:blocking ${error}`)
      return false
    }
  }

  async unblock(target_id: string): Promise<boolean> {
    try {
      await firstValueFrom(this.http.delete(`${this.baseUrl}/blocks/${target_id}`))
      this.blocks.update(current => ({
        ...current,
        items: current.items.filter(u => u.id !== target_id),
      }))
      cacheManager.clear('all')
      return true
    } catch (error) {
      console.error(`Error:unblocking ${error}`)
      return false
    }
  }

  async report(reported_id: string, reason: string, detail?: string): Promise<boolean> {
    try {
      await firstValueFrom(this.http.post(this.baseUrl + '/reports', { reported_id, reason, detail }))
      return true
    } catch (error) {
      console.error(`Error:reporting ${error}`)
      return false
    }
  }
}

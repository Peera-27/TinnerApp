import { Component, computed, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core'
import { DatePipe } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { GalleryModule, GalleryItem, ImageItem } from 'ng-gallery'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { MatTabsModule } from '@angular/material/tabs'
import { MatMenuModule } from '@angular/material/menu'
import { MatDialog } from '@angular/material/dialog'
import { MatSnackBar } from '@angular/material/snack-bar'
import { MatTooltipModule } from '@angular/material/tooltip'
import { User } from '../../_models/user'
import { Photo } from '../../_models/photo'
import { Message } from '../../_models/message'
import { MemberService } from '../../_services/member.service'
import { AccountService } from '../../_services/account.service'
import { LikeService } from '../../_services/like.service'
import { MessageService } from '../../_services/message.service'
import { SafetyService } from '../../_services/safety.service'
import { HubService } from '../../_services/hub.service'
import { ReportComponent, ReportResult } from '../../_dialogs/report/report.component'
import { cacheManager } from '../../_helper/cache'
import { DEFAULT_AVATAR } from '../../_helper/helper'
import { EmptyStateComponent } from '../../_shared/empty-state/empty-state.component'
import { Subscription } from 'rxjs'


@Component({
  selector: 'app-member-profile',
  imports: [
    GalleryModule, MatTabsModule, MatIconModule, MatButtonModule, MatTooltipModule, MatMenuModule,
    EmptyStateComponent, FormsModule, DatePipe, RouterLink
  ],
  templateUrl: './member-profile.component.html',
  styleUrl: './member-profile.component.scss'
})
export class MemberProfileComponent implements OnInit, OnDestroy {
  private memberService = inject(MemberService)
  private accountService = inject(AccountService)
  private likeService = inject(LikeService)
  private messageService = inject(MessageService)
  private safetyService = inject(SafetyService)
  private hub = inject(HubService)
  private dialog = inject(MatDialog)
  private snackbar = inject(MatSnackBar)
  private activeRoute = inject(ActivatedRoute)
  private router = inject(Router)

  private chatLog = viewChild<ElementRef<HTMLElement>>('chatLog')

  member = signal<User | undefined>(undefined)
  images: GalleryItem[] = []
  isFollowing = signal(false)

  // ------------------------------------------------------------------ chat
  chatOpen = signal(false)
  messages = signal<Message[]>([])
  draft = ''
  connected = this.messageService.isWSconnected
  private chatSub?: Subscription
  private didConnect = false

  avatar = computed(() => this.member()?.avatar || DEFAULT_AVATAR)
  photoCount = computed(() => this.member()?.photos?.length ?? 0)

  /** The hub is the live truth while it is connected; the flag that came with
   *  the profile covers the moment before that. */
  isOnline = computed(() => this.hub.connected()
    ? this.hub.isOnline(this.member()?.id)
    : this.member()?.is_online === true)

  tags = computed(() => (this.member()?.interest ?? '')
    .split(/[,#|]/)
    .map(t => t.trim())
    .filter(Boolean))

  details = computed(() => {
    const m = this.member()
    if (!m) return []
    return [
      { icon: 'search', label: 'Looking for', value: this.readable(m.looking_for) },
      { icon: 'wc', label: 'Gender', value: this.readable(m.gender) },
      { icon: 'cake', label: 'Age', value: m.age ? `${m.age} years old` : '—' },
      { icon: 'location_on', label: 'Location', value: m.location || '—' }
    ]
  })

  private readable(value?: string): string {
    switch (value) {
      case 'male': return 'Men'
      case 'female': return 'Women'
      case 'all': return 'Everyone'
      default: return '—'
    }
  }

  private initGalleryItem(photos: Photo[]) {
    this.images = photos.map(photo => new ImageItem({ src: photo.url, thumb: photo.url }))
  }

  async getmember() {
    const username = this.activeRoute.snapshot.paramMap.get('username')
    if (!username) return

    const member = await this.memberService.getMemberByusername(username)
    if (!member) {
      this.router.navigate(['404'])
      return
    }

    this.member.set(member)
    if (member.photos) this.initGalleryItem(member.photos)
    if (member.id) this.isFollowing.set(this.likeService.IsfollowingMember(member.id))

    // arriving from the inbox links straight into the conversation
    if (this.activeRoute.snapshot.queryParamMap.has('chat')) this.openChat()
  }

  toggleFollow() {
    const member = this.member()
    if (!member?.id) return
    this.isFollowing.set(this.likeService.toggleLike(member.id))
    cacheManager.clear('all')
  }

  // ---------------------------------------------------------------- safety
  /** Blocking is one-click and reversible, so it asks nothing — the snackbar
   *  says where to undo it. */
  async blockMember() {
    const member = this.member()
    if (!member?.id) return

    const blocked = await this.safetyService.block(member.id)
    if (!blocked) return

    this.snackbar.open(`${member.display_name} is blocked. Undo it from Blocked people.`, 'OK', { duration: 6000 })
    this.router.navigate(['/'])
  }

  openReport() {
    const member = this.member()
    if (!member?.id) return

    const ref = this.dialog.open(ReportComponent, {
      width: 'min(520px, 92vw)',
      data: { name: member.display_name ?? member.username ?? 'this profile' },
    })

    ref.afterClosed().subscribe(async (result?: ReportResult) => {
      if (!result) return

      const sent = await this.safetyService.report(member.id!, result.reason, result.detail)
      if (!sent) return

      if (result.block) {
        await this.safetyService.block(member.id!)
        this.snackbar.open('Report sent and profile blocked. Thank you.', 'OK', { duration: 6000 })
        this.router.navigate(['/'])
        return
      }
      this.snackbar.open('Report sent. Thank you for telling us.', 'OK', { duration: 5000 })
    })
  }

  // ------------------------------------------------------------------ chat
  async openChat() {
    const member = this.member()
    const account = this.accountService.data()
    if (!member?.id || !account?.user.id) return

    this.chatOpen.set(true)

    await this.messageService.getMessageHistory(member.id)
    // history comes back newest-first; the log reads oldest-first
    this.messages.set([...this.messageService.paginator().items].reverse())
    this.scrollToBottom()

    if (this.didConnect) return
    this.messageService.connect(member.id, account.token, account.user.id)
    this.didConnect = true
    this.chatSub = this.messageService.message$.subscribe(msg => {
      this.messages.update(list => [...list, msg])
      this.scrollToBottom()
    })
  }

  closeChat() {
    this.chatOpen.set(false)
  }

  send() {
    const content = this.draft.trim()
    const member = this.member()
    const me = this.accountService.data()?.user
    if (!content || !member?.id || !me?.id) return

    // the server echoes the saved message back to the sender, so the log is
    // filled by the socket rather than optimistically here
    this.messageService.sendMessage({ sender: me.id, receiver: member.id, content })
    this.draft = ''
    cacheManager.clear('chat')
  }

  isMine(message: Message): boolean {
    return message.sender === this.accountService.data()?.user.id
  }

  /** Removes one message from my side of the thread; the other person keeps theirs. */
  async deleteMessage(message: Message) {
    if (!message.id) return
    // dropped from the log first: a second click on the same bubble would ask
    // the server to delete a row that is already gone, which answers 404
    const snapshot = this.messages()
    this.messages.update(list => list.filter(m => m.id !== message.id))

    const removed = await this.messageService.deleteMessage(message.id)
    if (!removed) this.messages.set(snapshot)
  }

  private scrollToBottom() {
    setTimeout(() => {
      const el = this.chatLog()?.nativeElement
      if (el) el.scrollTop = el.scrollHeight
    })
  }

  ngOnInit(): void {
    this.getmember()
  }

  ngOnDestroy(): void {
    this.chatSub?.unsubscribe()
    if (this.didConnect) this.messageService.close()
  }
}

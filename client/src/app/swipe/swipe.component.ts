import { Component, computed, inject, OnInit, signal } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { RouterLink } from '@angular/router'
import { DEFAULT_PHOTO } from '../_helper/helper'
import { User } from '../_models/user'
import { DeckService } from '../_services/deck.service'
import { HubService } from '../_services/hub.service'
import { LikeService } from '../_services/like.service'
import { EmptyStateComponent } from '../_shared/empty-state/empty-state.component'

/** How far a card has to travel before letting go counts as a decision. */
const COMMIT_PX = 110

@Component({
  selector: 'app-swipe',
  imports: [EmptyStateComponent, MatButtonModule, MatIconModule, MatTooltipModule, RouterLink],
  templateUrl: './swipe.component.html',
  styleUrl: './swipe.component.scss'
})
export class SwipeComponent implements OnInit {
  private deck = inject(DeckService)
  private likeService = inject(LikeService)
  private hub = inject(HubService)

  cards = this.deck.cards
  loading = this.deck.loading
  canUndo = this.deck.canUndo

  /** How far the top card has been dragged, in pixels. */
  drag = signal(0)
  /** Set while a card is flying off, so the animation can finish before the
   *  stack moves underneath it. */
  leaving = signal<'like' | 'pass' | null>(null)

  top = computed(() => this.cards()[0])
  /** Only the next card is rendered behind the top one — a deeper stack is
   *  invisible and costs a DOM node each. */
  behind = computed(() => this.cards()[1])

  matched = computed(() => {
    const id = this.likeService.justMatched()
    return id ? this.cards().find(c => c.id === id) ?? this.lastLiked() : undefined
  })
  private lastLiked = signal<User | undefined>(undefined)

  /** Which way the current drag is leaning, for the LIKE / NOPE stamps. */
  intent = computed<'like' | 'pass' | null>(() => {
    const offset = this.drag()
    if (offset > 40) return 'like'
    if (offset < -40) return 'pass'
    return null
  })

  cardStyle = computed(() => {
    const offset = this.drag()
    const flying = this.leaving()
    if (flying) {
      const distance = flying === 'like' ? window.innerWidth : -window.innerWidth
      return `transform: translateX(${distance}px) rotate(${distance / 24}deg); opacity: 0;`
    }
    return `transform: translateX(${offset}px) rotate(${offset / 24}deg);`
  })

  isOnline(user?: User): boolean {
    if (!user) return false
    return this.hub.connected() ? this.hub.isOnline(user.id) : user.is_online === true
  }

  photo(user?: User): string {
    return user?.photoOfTheDay || user?.avatar || DEFAULT_PHOTO
  }

  tags(user?: User): string[] {
    return (user?.interest ?? '').split(/[,#|]/).map(t => t.trim()).filter(Boolean).slice(0, 3)
  }

  onImageError(event: Event) {
    (event.target as HTMLImageElement).src = DEFAULT_PHOTO
  }

  ngOnInit(): void {
    if (this.cards().length === 0) this.deck.load()
  }

  // ------------------------------------------------------------- gestures
  private startX = 0
  private dragging = false

  onPointerDown(event: PointerEvent) {
    if (this.leaving()) return
    this.dragging = true
    this.startX = event.clientX
    // keeps the pointer with this element even when it leaves the card
    ;(event.target as HTMLElement).setPointerCapture?.(event.pointerId)
  }

  onPointerMove(event: PointerEvent) {
    if (!this.dragging) return
    this.drag.set(event.clientX - this.startX)
  }

  onPointerUp() {
    if (!this.dragging) return
    this.dragging = false

    const offset = this.drag()
    this.drag.set(0)

    if (offset > COMMIT_PX) this.like()
    else if (offset < -COMMIT_PX) this.pass()
  }

  // -------------------------------------------------------------- actions
  like() {
    const user = this.top()
    if (!user?.id || this.leaving()) return

    this.lastLiked.set(user)
    this.likeService.toggleLike(user.id)
    this.fly('like', () => this.deck.liked())
  }

  pass() {
    const user = this.top()
    if (!user || this.leaving()) return
    this.fly('pass', () => this.deck.pass(user))
  }

  undo() {
    this.deck.undo()
  }

  /** Runs the card off screen, then hands the stack over. */
  private fly(direction: 'like' | 'pass', done: () => void) {
    this.leaving.set(direction)
    setTimeout(() => {
      this.leaving.set(null)
      done()
    }, 260)
  }
}

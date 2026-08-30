import { Injectable, computed, effect, signal } from '@angular/core'

export type ThemeMode = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'tinner-theme'

/**
 * Material emits its M3 tokens with `light-dark()`, so the whole palette follows
 * whatever `color-scheme` the root element resolves to. Switching themes is
 * therefore just a class on <html>; 'system' means we add no class at all and
 * let `color-scheme: light dark` defer to the OS.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
    private readonly media = typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : undefined

    readonly mode = signal<ThemeMode>(this.readStoredMode())
    private readonly systemPrefersDark = signal(this.media?.matches ?? false)

    /** The theme actually being rendered right now. */
    readonly isDark = computed(() => {
        const mode = this.mode()
        return mode === 'system' ? this.systemPrefersDark() : mode === 'dark'
    })

    constructor() {
        this.media?.addEventListener('change', e => this.systemPrefersDark.set(e.matches))

        effect(() => {
            const mode = this.mode()
            const root = document.documentElement
            root.classList.toggle('theme-dark', mode === 'dark')
            root.classList.toggle('theme-light', mode === 'light')
        })
    }

    setMode(mode: ThemeMode) {
        this.mode.set(mode)
        localStorage.setItem(STORAGE_KEY, mode)
    }

    toggle() {
        this.setMode(this.isDark() ? 'light' : 'dark')
    }

    private readStoredMode(): ThemeMode {
        const stored = localStorage.getItem(STORAGE_KEY)
        return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
    }
}

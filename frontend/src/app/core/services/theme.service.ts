import { Injectable, signal, effect, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

export type ThemeMode = 'light' | 'dark' | 'auto';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private authService = inject(AuthService);

  themeMode = signal<ThemeMode>('light');
  positiveColor = signal<string>('blue');
  negativeColor = signal<string>('red');

  // Resolved theme ('light' or 'dark') actually applied to DOM
  resolvedThemeMode = signal<'light' | 'dark'>('light');

  // Flag to avoid updating the server during the initial sync from the server
  private isSyncingFromServer = false;
  // Flag to avoid overwriting backend with local storage defaults on startup
  private initialEffectRun = true;

  constructor() {
    this.loadPreferences();

    // Effect to reactively update the DOM when signals change
    effect(() => {
      const currentMode = this.themeMode();
      const pos = this.positiveColor();
      const neg = this.negativeColor();

      const effectiveMode = currentMode === 'auto' ? this.getAutoTheme() : currentMode;
      this.resolvedThemeMode.set(effectiveMode);
      this.applyTheme(effectiveMode, pos, neg);
      
      if (this.initialEffectRun) {
        this.initialEffectRun = false;
        // Only save to local storage on the initial run
        localStorage.setItem('themeMode', currentMode);
        localStorage.setItem('themePos', pos);
        localStorage.setItem('themeNeg', neg);
        return;
      }
      
      this.savePreferences();
    });

    // Periodically recheck time for auto mode (every 60s)
    if (typeof window !== 'undefined') {
      setInterval(() => {
        if (this.themeMode() === 'auto') {
          const effectiveMode = this.getAutoTheme();
          if (this.resolvedThemeMode() !== effectiveMode) {
            this.resolvedThemeMode.set(effectiveMode);
            this.applyTheme(effectiveMode, this.positiveColor(), this.negativeColor());
          }
        }
      }, 60000);
    }
  }

  getAutoTheme(): 'light' | 'dark' {
    const hour = new Date().getHours();
    return (hour >= 19 || hour < 7) ? 'dark' : 'light';
  }

  syncFromServer(prefs: {themeMode?: string, themePos?: string, themeNeg?: string}) {
    this.isSyncingFromServer = true;
    if (prefs.themeMode === 'light' || prefs.themeMode === 'dark' || prefs.themeMode === 'auto') {
      this.themeMode.set(prefs.themeMode as ThemeMode);
    }
    if (prefs.themePos) this.positiveColor.set(prefs.themePos);
    if (prefs.themeNeg) this.negativeColor.set(prefs.themeNeg);
    
    this.isSyncingFromServer = false;
  }

  private loadPreferences() {
    const savedMode = localStorage.getItem('themeMode') as ThemeMode;
    const savedPos = localStorage.getItem('themePos');
    const savedNeg = localStorage.getItem('themeNeg');

    if (savedMode === 'dark' || savedMode === 'light' || savedMode === 'auto') {
      this.themeMode.set(savedMode);
    } else {
      this.themeMode.set('light');
    }

    if (savedPos) this.positiveColor.set(savedPos);
    if (savedNeg) this.negativeColor.set(savedNeg);
  }

  private savePreferences() {
    localStorage.setItem('themeMode', this.themeMode());
    localStorage.setItem('themePos', this.positiveColor());
    localStorage.setItem('themeNeg', this.negativeColor());

    if (!this.isSyncingFromServer && this.authService.isAuthenticated) {
      this.authService.updatePreferences({
        themeMode: this.themeMode(),
        themePos: this.positiveColor(),
        themeNeg: this.negativeColor()
      }).subscribe({
        error: (err) => console.error('Failed to sync theme:', err)
      });
    }
  }

  private applyTheme(mode: 'light' | 'dark', pos: string, neg: string) {
    const html = document.documentElement;

    // Apply dark mode class
    if (mode === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }

    // Apply data attributes for CSS variables
    html.setAttribute('data-theme-pos', pos);
    html.setAttribute('data-theme-neg', neg);
  }

  toggleMode() {
    this.themeMode.update(m => {
      if (m === 'light') return 'dark';
      if (m === 'dark') return 'auto';
      return 'light';
    });
  }

  setThemeMode(mode: ThemeMode) {
    this.themeMode.set(mode);
  }

  setPositiveColor(color: string) {
    this.positiveColor.set(color);
  }

  setNegativeColor(color: string) {
    this.negativeColor.set(color);
  }
}

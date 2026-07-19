import { Injectable, signal, effect, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

export type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private authService = inject(AuthService);

  themeMode = signal<ThemeMode>('light');
  positiveColor = signal<string>('blue');
  negativeColor = signal<string>('red');

  // Flag to avoid updating the server during the initial sync from the server
  private isSyncingFromServer = false;

  constructor() {
    this.loadPreferences();

    // Effect to reactively update the DOM when signals change
    effect(() => {
      this.applyTheme(this.themeMode(), this.positiveColor(), this.negativeColor());
      this.savePreferences();
    });
  }

  syncFromServer(prefs: {themeMode?: string, themePos?: string, themeNeg?: string}) {
    this.isSyncingFromServer = true;
    if (prefs.themeMode === 'light' || prefs.themeMode === 'dark') {
      this.themeMode.set(prefs.themeMode);
    }
    if (prefs.themePos) this.positiveColor.set(prefs.themePos);
    if (prefs.themeNeg) this.negativeColor.set(prefs.themeNeg);
    
    this.isSyncingFromServer = false;
  }

  private loadPreferences() {
    const savedMode = localStorage.getItem('themeMode') as ThemeMode;
    const savedPos = localStorage.getItem('themePos');
    const savedNeg = localStorage.getItem('themeNeg');

    if (savedMode === 'dark' || savedMode === 'light') {
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

  private applyTheme(mode: ThemeMode, pos: string, neg: string) {
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
    this.themeMode.update(m => m === 'light' ? 'dark' : 'light');
  }

  setPositiveColor(color: string) {
    this.positiveColor.set(color);
  }

  setNegativeColor(color: string) {
    this.negativeColor.set(color);
  }
}

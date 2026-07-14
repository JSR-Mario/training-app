import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  themeMode = signal<ThemeMode>('light');
  positiveColor = signal<string>('blue');
  negativeColor = signal<string>('red');

  constructor() {
    this.loadPreferences();

    // Effect to reactively update the DOM when signals change
    effect(() => {
      this.applyTheme(this.themeMode(), this.positiveColor(), this.negativeColor());
      this.savePreferences();
    });
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

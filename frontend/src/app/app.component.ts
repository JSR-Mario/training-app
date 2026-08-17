import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';
import { PwaUpdateService } from './core/services/pwa-update.service';
import { Title } from '@angular/platform-browser';
import { environment } from '../environments/environment';
@Component({
  standalone: true,
    selector: 'app-root',
    imports: [RouterOutlet],
    template: `
    <router-outlet></router-outlet>
  `,
    styles: []
})
export class AppComponent {
  private themeService = inject(ThemeService);
  private pwaUpdateService = inject(PwaUpdateService);
  private titleService = inject(Title);

  constructor() {
    this.titleService.setTitle(`Yes ${environment.appVersion}`);
  }
}

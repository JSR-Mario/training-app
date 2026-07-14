import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';

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
}

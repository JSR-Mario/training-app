import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-portfolio',
  imports: [RouterLink],
  templateUrl: './portfolio.component.html',
  styleUrl: './portfolio.component.css',
})
export class PortfolioComponent implements OnInit {
  private titleService = inject(Title);

  ngOnInit(): void {
    // Set portfolio specific title
    this.titleService.setTitle('Juan Mario Sosa | Portfolio');

    // Update favicon to a simple professional logo (Black circle with 'J')
    const link: HTMLLinkElement = document.querySelector("link[rel~='icon']") || document.createElement('link');
    link.type = 'image/svg+xml';
    link.rel = 'icon';
    link.href = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="black"/><text x="50" y="72" font-family="Arial" font-size="60" font-weight="bold" fill="white" text-anchor="middle">J</text></svg>';
    document.head.appendChild(link);
  }
}

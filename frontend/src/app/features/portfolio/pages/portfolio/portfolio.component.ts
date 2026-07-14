import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-portfolio',
  imports: [RouterLink],
  templateUrl: './portfolio.component.html',
  styleUrl: './portfolio.component.css',
})
export class PortfolioComponent implements OnInit {
  constructor(private titleService: Title) {}

  ngOnInit(): void {
    // Set portfolio specific title
    this.titleService.setTitle('Juan Mario Sosa | Portfolio');

    // Update favicon to user photo
    const link: HTMLLinkElement = document.querySelector("link[rel~='icon']") || document.createElement('link');
    link.type = 'image/jpeg';
    link.rel = 'icon';
    link.href = '/me/me.jpg';
    document.head.appendChild(link);
  }
}

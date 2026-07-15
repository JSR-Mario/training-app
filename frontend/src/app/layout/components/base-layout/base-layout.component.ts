import { Component, inject, signal, computed, ElementRef, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';
import { DashboardService } from '../../../features/dashboard/services/dashboard.service';
import { ThemeService } from '../../../core/services/theme.service';
import { filter } from 'rxjs/operators';
@Component({
  standalone: true,
  selector: 'app-base-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <style>
      @keyframes levelUpGlow {
        0% { transform: scale(1); box-shadow: 0 0 0px rgba(245, 158, 11, 0); }
        50% { transform: scale(1.2); box-shadow: 0 0 20px rgba(245, 158, 11, 1); background-color: #F59E0B; color: white; }
        100% { transform: scale(1); box-shadow: 0 0 0px rgba(245, 158, 11, 0); }
      }
      .animate-level-up {
        animation: levelUpGlow 2s ease-in-out;
      }
    </style>
    <div class="h-screen w-screen bg-gray-50 dark:bg-gray-950 flex flex-col md:flex-row overflow-hidden">
      
      <!-- Mobile Drawer Overlay -->
      @if (isSidebarOpen() && isMobile()) {
        <div class="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" tabindex="0" (click)="toggleSidebar()" (keydown.enter)="toggleSidebar()"></div>
      }

      <!-- Sidebar (Desktop & Mobile Drawer) -->
      <aside 
        class="fixed md:relative inset-y-0 left-0 z-50 md:z-0 flex flex-col bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 transition-all duration-300 overflow-hidden h-full"
        [class.-translate-x-full]="!isSidebarOpen() && isMobile()"
        [class.w-64]="isSidebarOpen() || isMobile()"
        [class.md:w-0]="!isSidebarOpen()"
      >
        <div class="p-6 whitespace-nowrap flex items-center justify-between">
          <a routerLink="/dashboard" (click)="closeOnMobile()" class="block cursor-pointer hover:opacity-80 transition-opacity">
            <h1 class="text-2xl font-bold text-black dark:text-white">
              TR <span class="text-accent-pos text-sm align-text-top ml-1">v0.1.0</span>
            </h1>
          </a>
          @if (isMobile()) {
            <button (click)="toggleSidebar()" class="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white md:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          }
        </div>
        
        <nav class="flex-1 px-4 space-y-2 mt-2 overflow-y-auto">
          <a routerLink="/dashboard" (click)="closeOnMobile()" routerLinkActive="bg-gray-100 dark:bg-gray-800 text-black dark:text-white font-bold" class="flex items-center px-4 py-3 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-black dark:hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span class="font-medium">Dashboard</span>
          </a>
          <a routerLink="/workout" (click)="closeOnMobile()" routerLinkActive="bg-gray-100 dark:bg-gray-800 text-black dark:text-white font-bold" class="flex items-center px-4 py-3 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-black dark:hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span class="font-medium">Workout</span>
          </a>
          <a routerLink="/body-weight" (click)="closeOnMobile()" routerLinkActive="bg-gray-100 dark:bg-gray-800 text-black dark:text-white font-bold" class="flex items-center px-4 py-3 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-black dark:hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span class="font-medium">Body Weight</span>
          </a>
          <a routerLink="/cardio" (click)="closeOnMobile()" routerLinkActive="bg-gray-100 dark:bg-gray-800 text-black dark:text-white font-bold" class="flex items-center px-4 py-3 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-black dark:hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span class="font-medium">Cardio</span>
          </a>
          <a routerLink="/programs" (click)="closeOnMobile()" routerLinkActive="bg-gray-100 dark:bg-gray-800 text-black dark:text-white font-bold" class="flex items-center px-4 py-3 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-black dark:hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <span class="font-medium">Programs</span>
          </a>
          <a routerLink="/exercises" (click)="closeOnMobile()" routerLinkActive="bg-gray-100 dark:bg-gray-800 text-black dark:text-white font-bold" class="flex items-center px-4 py-3 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-black dark:hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span class="font-medium">Exercises</span>
          </a>
          <a routerLink="/analytics" (click)="closeOnMobile()" routerLinkActive="bg-gray-100 dark:bg-gray-800 text-black dark:text-white font-bold" class="flex items-center px-4 py-3 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-black dark:hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span class="font-medium">Analytics</span>
          </a>
        </nav>
        
        <!-- Bottom Sidebar Links -->
        <div class="p-4 border-t border-gray-200 dark:border-gray-800">
          <a href="https://www.jsr-mario.com/" class="flex items-center px-4 py-3 text-sm text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-black dark:hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span class="font-medium">About Mario</span>
          </a>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-1 relative flex flex-col overflow-y-auto bg-gray-50 dark:bg-gray-950 pb-16 md:pb-0">
        
        <!-- Top Bar with Hamburger and User Dropdown -->
        <header class="flex items-center justify-between px-4 md:px-6 py-4 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30">
          <button 
            (click)="toggleSidebar()" 
            class="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800 focus:outline-none"
            title="Toggle Sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div class="relative user-dropdown-container">
            <button (click)="dropdownOpen.set(!dropdownOpen())" class="flex items-center space-x-3 text-gray-300 hover:text-white focus:outline-none p-2 rounded-lg hover:bg-gray-800 transition-colors">
              <span class="font-medium">{{ username() }}</span>
              <!-- Level Badge -->
              @if (level() > 0) {
                <span 
                  class="px-2 py-0.5 text-xs font-bold rounded-full border border-accent-pos/50 text-accent-pos bg-accent-pos/10 transition-all duration-300"
                  [class.animate-level-up]="animatingLevel()"
                  title="Your Current Level"
                >
                  Lvl {{ level() }}
                </span>
              }
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            @if (dropdownOpen()) {
              <div class="absolute right-0 mt-2 w-64 bg-white dark:bg-black border-2 border-black dark:border-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] dark:shadow-[4px_4px_0_0_rgba(255,255,255,1)] z-50 p-4 space-y-4">
                
                <!-- XP Progress -->
                @if (level() > 0) {
                  <div class="space-y-1.5 pb-2 border-b-2 border-black dark:border-white">
                    <div class="flex items-center justify-between text-xs">
                      <span class="font-bold text-black dark:text-white">Lvl {{ level() }}</span>
                      <span class="text-gray-500">Lvl {{ level() + 1 }}</span>
                    </div>
                    <div class="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        class="h-full bg-accent-pos rounded-full transition-all duration-500"
                        [style.width.%]="xpProgressPercent()"
                      ></div>
                    </div>
                    <div class="flex items-center justify-between text-[10px] text-gray-500 font-medium">
                      <span>{{ currentLevelXp() | number:'1.0-0' }} XP</span>
                      <span>{{ nextLevelXp() | number:'1.0-0' }} XP</span>
                    </div>
                  </div>
                }

                <!-- Theme Toggle -->
                <div class="flex items-center justify-between">
                  <span class="text-sm font-bold text-black dark:text-white">Theme Mode</span>
                  <button (click)="themeService.toggleMode()" class="px-3 py-1 text-xs font-bold border-2 border-black dark:border-white active:translate-y-px active:translate-x-px text-black dark:text-white">
                    {{ themeService.themeMode() === 'light' ? 'Dark' : 'Light' }}
                  </button>
                </div>

                <!-- Positive Color -->
                <div>
                  <span class="text-xs font-bold text-gray-500 mb-2 block">Primary Color</span>
                  <div class="flex gap-2">
                    @for (color of ['blue', 'green', 'pink', 'purple', 'yellow']; track color) {
                      <button 
                        (click)="themeService.setPositiveColor(color)"
                        class="w-6 h-6 rounded-full border-2 border-black dark:border-white hover:scale-110 transition-transform"
                        [class.ring-2]="themeService.positiveColor() === color"
                        [class.ring-black]="themeService.positiveColor() === color"
                        [class.dark:ring-white]="themeService.positiveColor() === color"
                        [style.background]="getPosColorHex(color)"
                        [attr.aria-label]="'Set primary color to ' + color"
                        [title]="color"
                      ><span class="sr-only">{{ color }}</span></button>
                    }
                  </div>
                </div>
 
                <!-- Negative Color -->
                <div>
                  <span class="text-xs font-bold text-gray-500 mb-2 block">Alert Color</span>
                  <div class="flex gap-2">
                    @for (color of ['red', 'orange', 'rose', 'pink']; track color) {
                      <button 
                        (click)="themeService.setNegativeColor(color)"
                        class="w-6 h-6 rounded-full border-2 border-black dark:border-white hover:scale-110 transition-transform"
                        [class.ring-2]="themeService.negativeColor() === color"
                        [class.ring-black]="themeService.negativeColor() === color"
                        [class.dark:ring-white]="themeService.negativeColor() === color"
                        [style.background]="getNegColorHex(color)"
                        [attr.aria-label]="'Set alert color to ' + color"
                        [title]="color"
                      ><span class="sr-only">{{ color }}</span></button>
                    }
                  </div>
                </div>

                <div class="border-t-2 border-black dark:border-white pt-2">
                  <button (click)="logout()" class="w-full text-left py-2 text-sm font-bold text-accent-neg hover:opacity-80 transition-colors flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </div>
            }
          </div>
        </header>

        <div class="container mx-auto p-4 md:p-8">
          <router-outlet></router-outlet>
        </div>
      </main>

      <!-- Mobile Bottom Navigation -->
      <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 z-30">
        <div class="flex justify-around items-center h-16">
          <a routerLink="/dashboard" routerLinkActive="text-accent-pos font-bold" class="flex flex-col items-center justify-center w-full h-full text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span class="text-[10px] font-medium mt-1">Home</span>
          </a>
          <a routerLink="/workout" routerLinkActive="text-accent-pos font-bold" class="flex flex-col items-center justify-center w-full h-full text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span class="text-[10px] font-medium mt-1">Workout</span>
          </a>
          <a routerLink="/body-weight" routerLinkActive="text-accent-pos font-bold" class="flex flex-col items-center justify-center w-full h-full text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span class="text-[10px] font-medium mt-1">Weight</span>
          </a>
          <a routerLink="/cardio" routerLinkActive="text-accent-pos font-bold" class="flex flex-col items-center justify-center w-full h-full text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span class="text-[10px] font-medium mt-1">Cardio</span>
          </a>
        </div>
      </nav>
    </div>
  `
})
export class BaseLayoutComponent {
  private authService = inject(AuthService);
  private dashboardService = inject(DashboardService);
  private router = inject(Router);
  themeService = inject(ThemeService);

  isMobile = signal<boolean>(window.innerWidth < 768);
  isSidebarOpen = signal<boolean>(!this.isMobile());
  dropdownOpen = signal<boolean>(false);
  level = signal<number>(0);
  animatingLevel = signal<boolean>(false);
  currentLevelXp = signal<number>(0);
  nextLevelXp = signal<number>(0);

  username = computed(() => this.authService.username);
  
  xpProgressPercent = computed(() => {
    const next = this.nextLevelXp();
    if (next <= 0) return 0;
    return Math.min((this.currentLevelXp() / next) * 100, 100);
  });

  private elementRef = inject(ElementRef);

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (this.dropdownOpen() && !this.elementRef.nativeElement.querySelector('.user-dropdown-container')?.contains(event.target)) {
      this.dropdownOpen.set(false);
    }
  }

  constructor() {
    // We could use HostListener for resize, but window event listener is fine too.
    window.addEventListener('resize', this.onResize.bind(this));

    // Reload level on navigation to dashboard
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      if (event.urlAfterRedirects === '/dashboard') {
        this.loadLevel();
      }
    });

    this.loadLevel();
  }

  loadLevel() {
    this.dashboardService.getSummary().subscribe({
      next: (res) => {
        if (res.experience?.level) {
          const newLevel = res.experience.level;
          const currentLevel = this.level();
          
          if (currentLevel > 0 && newLevel > currentLevel) {
            // Level Up!
            this.animatingLevel.set(true);
            setTimeout(() => this.animatingLevel.set(false), 2500);
          }
          this.level.set(newLevel);
          this.currentLevelXp.set(res.experience.currentLevelXp);
          this.nextLevelXp.set(res.experience.nextLevelXp);
        }
      }
    });
  }

  onResize() {
    const mobile = window.innerWidth < 768;
    if (mobile !== this.isMobile()) {
      this.isMobile.set(mobile);
      if (mobile) {
        this.isSidebarOpen.set(false);
      } else {
        this.isSidebarOpen.set(true);
      }
    }
  }

  toggleSidebar() {
    this.isSidebarOpen.set(!this.isSidebarOpen());
    window.dispatchEvent(new CustomEvent('sidebar-toggled', { detail: this.isSidebarOpen() }));
  }

  closeOnMobile() {
    if (this.isMobile()) {
      this.isSidebarOpen.set(false);
      window.dispatchEvent(new CustomEvent('sidebar-toggled', { detail: false }));
    }
  }

  logout() {
    this.authService.logout();
  }

  getPosColorHex(color: string): string {
    const map: Record<string, string> = {
      'blue': '#3b82f6',
      'green': '#22c55e',
      'pink': '#ec4899',
      'purple': '#a855f7',
      'yellow': '#eab308'
    };
    return map[color] || '#3b82f6';
  }

  getNegColorHex(color: string): string {
    const map: Record<string, string> = {
      'red': '#ef4444',
      'orange': '#f97316',
      'rose': '#f43f5e',
      'pink': '#ec4899'
    };
    return map[color] || '#ef4444';
  }
}


import { Component, inject, signal, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  standalone: true,
  selector: 'app-base-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="h-screen w-screen bg-gray-900 flex flex-col md:flex-row overflow-hidden">
      
      <!-- Mobile Drawer Overlay -->
      @if (isSidebarOpen() && isMobile()) {
        <div class="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" tabindex="0" (click)="toggleSidebar()" (keydown.enter)="toggleSidebar()"></div>
      }

      <!-- Sidebar (Desktop & Mobile Drawer) -->
      <aside 
        class="fixed md:relative inset-y-0 left-0 z-50 md:z-0 flex flex-col glass border-r border-gray-700/50 transition-all duration-300 overflow-hidden h-full"
        [class.-translate-x-full]="!isSidebarOpen() && isMobile()"
        [class.w-64]="isSidebarOpen() || isMobile()"
        [class.md:w-0]="!isSidebarOpen()"
      >
        <div class="p-6 whitespace-nowrap flex items-center justify-between">
          <h1 class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Training App
          </h1>
          @if (isMobile()) {
            <button (click)="toggleSidebar()" class="text-gray-400 hover:text-white md:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          }
        </div>
        
        <nav class="flex-1 px-4 space-y-2 mt-2 overflow-y-auto">
          <a routerLink="/dashboard" (click)="closeOnMobile()" routerLinkActive="bg-gray-700/50 text-white" class="flex items-center px-4 py-3 text-gray-300 rounded-xl hover:bg-gray-700/30 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span class="font-medium">Dashboard</span>
          </a>
          <a routerLink="/workout" (click)="closeOnMobile()" routerLinkActive="bg-gray-700/50 text-white" class="flex items-center px-4 py-3 text-gray-300 rounded-xl hover:bg-gray-700/30 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span class="font-medium">Workout</span>
          </a>
          <a routerLink="/body-weight" (click)="closeOnMobile()" routerLinkActive="bg-gray-700/50 text-white" class="flex items-center px-4 py-3 text-gray-300 rounded-xl hover:bg-gray-700/30 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span class="font-medium">Body Weight</span>
          </a>
          <a routerLink="/cardio" (click)="closeOnMobile()" routerLinkActive="bg-gray-700/50 text-white" class="flex items-center px-4 py-3 text-gray-300 rounded-xl hover:bg-gray-700/30 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span class="font-medium">Cardio</span>
          </a>
          <a routerLink="/programs" (click)="closeOnMobile()" routerLinkActive="bg-gray-700/50 text-white" class="flex items-center px-4 py-3 text-gray-300 rounded-xl hover:bg-gray-700/30 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <span class="font-medium">Programs</span>
          </a>
          <a routerLink="/exercises" (click)="closeOnMobile()" routerLinkActive="bg-gray-700/50 text-white" class="flex items-center px-4 py-3 text-gray-300 rounded-xl hover:bg-gray-700/30 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span class="font-medium">Exercises</span>
          </a>
          <a routerLink="/analytics" (click)="closeOnMobile()" routerLinkActive="bg-gray-700/50 text-white" class="flex items-center px-4 py-3 text-gray-300 rounded-xl hover:bg-gray-700/30 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span class="font-medium">Analytics</span>
          </a>
        </nav>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-1 relative flex flex-col overflow-y-auto bg-gray-900 pb-16 md:pb-0">
        
        <!-- Top Bar with Hamburger and User Dropdown -->
        <header class="flex items-center justify-between px-4 md:px-6 py-4 bg-gray-900/50 backdrop-blur-md border-b border-gray-800 sticky top-0 z-30">
          <button 
            (click)="toggleSidebar()" 
            class="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800 focus:outline-none"
            title="Toggle Sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div class="relative">
            <button (click)="dropdownOpen.set(!dropdownOpen())" class="flex items-center space-x-2 text-gray-300 hover:text-white focus:outline-none p-2 rounded-lg hover:bg-gray-800 transition-colors">
              <span class="font-medium">{{ username() }}</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            @if (dropdownOpen()) {
              <div class="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50">
                <button (click)="logout()" class="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-gray-700/50 transition-colors flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            }
          </div>
        </header>

        <div class="container mx-auto p-4 md:p-8">
          <router-outlet></router-outlet>
        </div>
      </main>

      <!-- Mobile Bottom Navigation -->
      <nav class="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-gray-700/50 z-30">
        <div class="flex justify-around items-center h-16">
          <a routerLink="/dashboard" routerLinkActive="text-blue-400" class="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-gray-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span class="text-[10px] font-medium mt-1">Home</span>
          </a>
          <a routerLink="/workout" routerLinkActive="text-blue-400" class="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-gray-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span class="text-[10px] font-medium mt-1">Workout</span>
          </a>
          <a routerLink="/body-weight" routerLinkActive="text-blue-400" class="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-gray-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span class="text-[10px] font-medium mt-1">Weight</span>
          </a>
          <a routerLink="/cardio" routerLinkActive="text-blue-400" class="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-gray-200 transition-colors">
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
  isMobile = signal<boolean>(window.innerWidth < 768);
  isSidebarOpen = signal<boolean>(!this.isMobile());
  dropdownOpen = signal<boolean>(false);

  username = computed(() => this.authService.username);

  constructor() {
    // We could use HostListener for resize, but window event listener is fine too.
    window.addEventListener('resize', this.onResize.bind(this));
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
}


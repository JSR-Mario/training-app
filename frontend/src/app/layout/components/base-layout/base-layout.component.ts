import { Component, inject, signal, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  standalone: true,
    selector: 'app-base-layout',
    imports: [RouterOutlet, RouterLink, RouterLinkActive],
    template: `
    <div class="h-screen w-screen bg-gray-900 flex flex-col md:flex-row overflow-hidden">
      
      <!-- Desktop Sidebar -->
      <aside 
        class="hidden md:flex flex-col glass border-r border-gray-700/50 transition-all duration-300"
        [class.w-64]="isSidebarOpen()"
        [class.w-0]="!isSidebarOpen()"
        [class.overflow-hidden]="!isSidebarOpen()"
      >
        <div class="p-6 whitespace-nowrap">
          <h1 class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Training App
          </h1>
        </div>
        
        <nav class="flex-1 px-4 space-y-2 mt-4">
          <a routerLink="/dashboard" routerLinkActive="bg-gray-700/50 text-white" class="flex items-center px-4 py-3 text-gray-300 rounded-xl hover:bg-gray-700/30 transition-colors">
            <span class="font-medium">Dashboard</span>
          </a>
          <a routerLink="/workout" routerLinkActive="bg-gray-700/50 text-white" class="flex items-center px-4 py-3 text-gray-300 rounded-xl hover:bg-gray-700/30 transition-colors">
            <span class="font-medium">Workout</span>
          </a>
          <a routerLink="/programs" routerLinkActive="bg-gray-700/50 text-white" class="flex items-center px-4 py-3 text-gray-300 rounded-xl hover:bg-gray-700/30 transition-colors">
            <span class="font-medium">Programs</span>
          </a>
          <a routerLink="/exercises" routerLinkActive="bg-gray-700/50 text-white" class="flex items-center px-4 py-3 text-gray-300 rounded-xl hover:bg-gray-700/30 transition-colors">
            <span class="font-medium">Exercises</span>
          </a>
          <a routerLink="/analytics" routerLinkActive="bg-gray-700/50 text-white" class="flex items-center px-4 py-3 text-gray-300 rounded-xl hover:bg-gray-700/30 transition-colors">
            <span class="font-medium">Analytics</span>
          </a>
          <a routerLink="/body-weight" routerLinkActive="bg-gray-700/50 text-white" class="flex items-center px-4 py-3 text-gray-300 rounded-xl hover:bg-gray-700/30 transition-colors">
            <span class="font-medium">Body Weight</span>
          </a>
          <a routerLink="/cardio" routerLinkActive="bg-gray-700/50 text-white" class="flex items-center px-4 py-3 text-gray-300 rounded-xl hover:bg-gray-700/30 transition-colors">
            <span class="font-medium">Cardio</span>
          </a>
        </nav>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-1 relative flex flex-col overflow-y-auto bg-gray-900 pb-16 md:pb-0">
        
        <!-- Top Bar with Hamburger and User Dropdown -->
        <header class="hidden md:flex items-center justify-between px-6 py-4 bg-gray-900/50 backdrop-blur-md border-b border-gray-800 sticky top-0 z-30">
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
              <div class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold border border-blue-500/30">
                {{ username().charAt(0).toUpperCase() }}
              </div>
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
      <nav class="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-gray-700/50 z-50">
        <div class="flex justify-around items-center h-16">
          <a routerLink="/dashboard" routerLinkActive="text-blue-400" class="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-gray-200 transition-colors">
            <span class="text-xs font-medium mt-1">Home</span>
          </a>
          <a routerLink="/workout" routerLinkActive="text-blue-400" class="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-gray-200 transition-colors">
            <span class="text-xs font-medium mt-1">Workout</span>
          </a>
          <a routerLink="/programs" routerLinkActive="text-blue-400" class="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-gray-200 transition-colors">
            <span class="text-xs font-medium mt-1">Programs</span>
          </a>
          <a routerLink="/exercises" routerLinkActive="text-blue-400" class="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-gray-200 transition-colors">
            <span class="text-xs font-medium mt-1">Exercises</span>
          </a>
          <a routerLink="/analytics" routerLinkActive="text-blue-400" class="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-gray-200 transition-colors">
            <span class="text-xs font-medium mt-1">Analytics</span>
          </a>
          <button (click)="logout()" class="flex flex-col items-center justify-center w-full h-full text-red-400 hover:text-red-300 transition-colors">
            <span class="text-xs font-medium mt-1">Logout</span>
          </button>
        </div>
      </nav>
    </div>
  `
})
export class BaseLayoutComponent {
  private authService = inject(AuthService);
  isSidebarOpen = signal<boolean>(true);
  dropdownOpen = signal<boolean>(false);

  username = computed(() => this.authService.username);

  toggleSidebar() {
    this.isSidebarOpen.set(!this.isSidebarOpen());
    // Dispatch event so child components (like active-workout) know sidebar changed
    window.dispatchEvent(new CustomEvent('sidebar-toggled', { detail: this.isSidebarOpen() }));
  }

  logout() {
    this.authService.logout();
  }
}

import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
    selector: 'app-base-layout',
    imports: [RouterOutlet, RouterLink, RouterLinkActive],
    template: `
    <div class="h-screen w-screen bg-gray-900 flex flex-col md:flex-row overflow-hidden">
      <!-- Desktop Sidebar -->
      <aside class="hidden md:flex flex-col w-64 glass border-r border-gray-700/50">
        <div class="p-6">
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
        </nav>

        <div class="p-4 border-t border-gray-700/50">
          <button (click)="logout()" class="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-400 bg-red-400/10 rounded-lg hover:bg-red-400/20 transition-colors">
            Sign Out
          </button>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-1 relative overflow-y-auto bg-gray-900 pb-16 md:pb-0">
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

  logout() {
    this.authService.logout();
  }
}

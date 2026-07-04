import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ProgressChartComponent } from '../../../analytics/components/progress-chart/progress-chart.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ProgressChartComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-semibold text-white">Dashboard</h2>
      </div>
      
      <!-- CSS Grid for cards to leave space for future additions -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <!-- Volume Progress Mini Chart Card -->
        <div 
          class="glass-card hover:bg-gray-800/80 cursor-pointer transition-colors p-4"
          (click)="goToAnalytics()"
          (keyup.enter)="goToAnalytics()"
          tabindex="0"
          role="button"
          title="Go to detailed Analytics"
        >
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-lg font-medium text-gray-200">Volume Progress</h3>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div class="pointer-events-none">
            <app-progress-chart [miniMode]="true"></app-progress-chart>
          </div>
        </div>
        
        <!-- Placeholder for future cards -->
        <div class="glass-card border border-dashed border-gray-700/50 p-6 flex flex-col items-center justify-center text-gray-500 min-h-[250px]">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <p class="text-sm">More widgets coming soon</p>
        </div>

      </div>
    </div>
  `
})
export class DashboardComponent {
  private router = inject(Router);

  goToAnalytics() {
    this.router.navigate(['/analytics']);
  }
}

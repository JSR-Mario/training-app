import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div class="glass-card p-6">
      <h2 class="text-2xl font-semibold text-white mb-4">Dashboard</h2>
      <p class="text-gray-300">Welcome to the Training App! Your progress will be displayed here soon.</p>
    </div>
  `
})
export class DashboardComponent {}

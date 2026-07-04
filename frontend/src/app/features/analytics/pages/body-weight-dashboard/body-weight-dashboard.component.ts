import { Component } from '@angular/core';
import { BodyWeightTrackerComponent } from '../../components/body-weight-tracker/body-weight-tracker.component';

@Component({
  standalone: true,
  selector: 'app-body-weight-dashboard',
  imports: [BodyWeightTrackerComponent],
  template: `
    <div class="max-w-7xl mx-auto space-y-6">
      <header class="mb-4">
        <h1 class="text-2xl font-bold text-white tracking-tight sm:text-3xl">
          Body <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Weight</span>
        </h1>
      </header>

      <div class="mt-6">
        <app-body-weight-tracker></app-body-weight-tracker>
      </div>
    </div>
  `
})
export class BodyWeightDashboardComponent {}

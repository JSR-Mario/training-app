import { Component } from '@angular/core';
import { BodyWeightTrackerComponent } from '../../components/body-weight-tracker/body-weight-tracker.component';

@Component({
  standalone: true,
  selector: 'app-body-weight-dashboard',
  imports: [BodyWeightTrackerComponent],
  template: `
    <div class="max-w-7xl mx-auto space-y-6">
      <header class="mb-6">
        <h1 class="text-2xl font-bold text-black dark:text-white tracking-tight sm:text-3xl">
          Body <span class="text-accent-pos">Weight</span>
        </h1>
      </header>

      <div class="mt-6">
        <app-body-weight-tracker></app-body-weight-tracker>
      </div>
    </div>
  `
})
export class BodyWeightDashboardComponent {}

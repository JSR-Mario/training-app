import { Component, signal } from '@angular/core';

import { ProgressChartComponent } from '../../components/progress-chart/progress-chart.component';
import { BodyWeightTrackerComponent } from '../../components/body-weight-tracker/body-weight-tracker.component';
import { CardioChartComponent } from '../../components/cardio-chart/cardio-chart.component';

type Tab = 'progress' | 'weight' | 'cardio';

@Component({
  standalone: true,
    selector: 'app-analytics-dashboard',
    imports: [ProgressChartComponent, BodyWeightTrackerComponent, CardioChartComponent],
    templateUrl: './analytics-dashboard.component.html',
    styles: ``
})
export class AnalyticsDashboardComponent {
  activeTab = signal<Tab>('progress');

  setTab(tab: Tab) {
    this.activeTab.set(tab);
  }
}

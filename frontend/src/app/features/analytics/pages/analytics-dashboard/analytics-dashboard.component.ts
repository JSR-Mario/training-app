import { Component, signal } from '@angular/core';

import { ProgressChartComponent } from '../../components/progress-chart/progress-chart.component';
import { BodyWeightTrackerComponent } from '../../components/body-weight-tracker/body-weight-tracker.component';

type Tab = 'progress' | 'weight';

@Component({
    selector: 'app-analytics-dashboard',
    imports: [ProgressChartComponent, BodyWeightTrackerComponent],
    templateUrl: './analytics-dashboard.component.html',
    styles: ``
})
export class AnalyticsDashboardComponent {
  activeTab = signal<Tab>('progress');

  setTab(tab: Tab) {
    this.activeTab.set(tab);
  }
}

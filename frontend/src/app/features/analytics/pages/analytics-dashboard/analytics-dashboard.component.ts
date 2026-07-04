import { Component } from '@angular/core';
import { ProgressChartComponent } from '../../components/progress-chart/progress-chart.component';

@Component({
  standalone: true,
  selector: 'app-analytics-dashboard',
  imports: [ProgressChartComponent],
  templateUrl: './analytics-dashboard.component.html',
  styles: ``
})
export class AnalyticsDashboardComponent {}

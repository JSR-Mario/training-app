import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressChartComponent } from '../../components/progress-chart/progress-chart.component';
import { ExerciseProgressChartComponent } from '../../components/exercise-progress-chart/exercise-progress-chart.component';

@Component({
  standalone: true,
  selector: 'app-analytics-dashboard',
  imports: [CommonModule, ProgressChartComponent, ExerciseProgressChartComponent],
  templateUrl: './analytics-dashboard.component.html',
  styles: ``
})
export class AnalyticsDashboardComponent {
  activeTab = signal<'volume' | 'exercise'>('volume');
}

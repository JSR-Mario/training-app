import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ProgressChartComponent } from '../../components/progress-chart/progress-chart.component';
import { ExerciseProgressChartComponent } from '../../components/exercise-progress-chart/exercise-progress-chart.component';

@Component({
  standalone: true,
  selector: 'app-analytics-dashboard',
  imports: [CommonModule, ProgressChartComponent, ExerciseProgressChartComponent],
  templateUrl: './analytics-dashboard.component.html',
  styles: ``
})
export class AnalyticsDashboardComponent implements OnInit {
  private route = inject(ActivatedRoute);
  activeTab = signal<'volume' | 'exercise'>('volume');

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['exerciseId']) {
        this.activeTab.set('exercise');
      }
    });
  }
}

import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ProgressChartComponent } from '../../components/progress-chart/progress-chart.component';
import { ExerciseProgressChartComponent } from '../../components/exercise-progress-chart/exercise-progress-chart.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { environment } from '../../../../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-analytics-dashboard',
  imports: [CommonModule, ProgressChartComponent, ExerciseProgressChartComponent],
  templateUrl: './analytics-dashboard.component.html',
  styles: ``
})
export class AnalyticsDashboardComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  authService = inject(AuthService);
  
  activeTab = signal<'volume' | 'exercise'>('volume');
  
  isResyncing = signal(false);
  resyncSuccess = signal(false);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['exerciseId']) {
        this.activeTab.set('exercise');
      }
    });
  }

  resyncAnalytics() {
    this.isResyncing.set(true);
    this.resyncSuccess.set(false);
    this.http.post(`${environment.apiUrl}/api/v1/training/sessions/resync-analytics`, {}).subscribe({
      next: () => {
        this.isResyncing.set(false);
        this.resyncSuccess.set(true);
        setTimeout(() => {
          this.resyncSuccess.set(false);
          window.location.reload();
        }, 1500);
      },
      error: (err) => {
        console.error('Error resyncing analytics', err);
        this.isResyncing.set(false);
      }
    });
  }
}

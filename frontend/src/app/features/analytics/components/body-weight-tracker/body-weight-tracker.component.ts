import { Component, OnInit, inject, signal } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { BodyWeightService } from '../../services/body-weight.service';
import { finalize } from 'rxjs';

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

@Component({
  standalone: true,
    selector: 'app-body-weight-tracker',
    imports: [ReactiveFormsModule, BaseChartDirective],
    templateUrl: './body-weight-tracker.component.html',
    styles: ``
})
export class BodyWeightTrackerComponent implements OnInit {
  private bodyWeightService = inject(BodyWeightService);
  private fb = inject(FormBuilder);

  isLoading = signal(false);
  isSaving = signal(false);
  activeRange = signal<TimeRange>('1M');

  periodChangeKg = signal<number>(0);
  periodChangePercent = signal<number>(0);
  math = Math;

  form: FormGroup = this.fb.group({
    date: [this.getTodayString(), Validators.required],
    weightKg: ['', [Validators.required, Validators.min(20), Validators.max(500)]]
  });

  public lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#e2e8f0',
        bodyColor: '#e2e8f0',
        padding: 12,
        cornerRadius: 8,
        mode: 'index',
        intersect: false
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8' }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: { color: 'rgba(128, 128, 128, 0.1)' },
        ticks: { color: '#8b5cf6' },
        title: { display: true, text: 'Weight (kg)', color: '#8b5cf6' }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  public lineChartType: ChartType = 'line';
  
  public lineChartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: []
  };

  ngOnInit() {
    this.loadData();
  }

  setRange(range: TimeRange) {
    this.activeRange.set(range);
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    const { startDate, endDate } = this.getDateRange(this.activeRange());

    this.bodyWeightService.getWeightEntries(startDate, endDate)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => {
          const dates = data.map(d => new Date(d.date));
          const labels = dates.map(d => d.toLocaleDateString());
          const weights = data.map(d => d.weightKg);

          // Linear Regression for Trendline
          let trendData: number[] = [];
          if (weights.length > 1) {
            const xs = dates.map(d => d.getTime());
            const ys = weights;
            const n = xs.length;
            
            const sumX = xs.reduce((a, b) => a + b, 0);
            const sumY = ys.reduce((a, b) => a + b, 0);
            const sumXY = xs.reduce((sum, x, i) => sum + x * ys[i], 0);
            const sumXX = xs.reduce((sum, x) => sum + x * x, 0);
            
            // Protect against division by zero if all x are the same
            const denominator = (n * sumXX - sumX * sumX);
            if (denominator !== 0) {
              const slope = (n * sumXY - sumX * sumY) / denominator;
              const intercept = (sumY - slope * sumX) / n;
              trendData = xs.map(x => slope * x + intercept);
            } else {
              trendData = weights.map(() => weights[0]);
            }

            this.periodChangeKg.set(weights[weights.length - 1] - weights[0]);
            this.periodChangePercent.set((weights[weights.length - 1] - weights[0]) / weights[0] * 100);
          } else if (weights.length === 1) {
            trendData = [weights[0]];
            this.periodChangeKg.set(0);
            this.periodChangePercent.set(0);
          } else {
            this.periodChangeKg.set(0);
            this.periodChangePercent.set(0);
          }

          const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-pos').trim() || '#8b5cf6';
          
          this.lineChartData = {
            labels,
            datasets: [
              {
                data: weights,
                label: 'Body Weight (kg)',
                backgroundColor: 'rgba(139, 92, 246, 0.2)', // violet
                borderColor: accentColor,
                pointBackgroundColor: accentColor,
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: accentColor,
                fill: 'origin',
                tension: 0.4,
                order: 1
              },
              {
                data: trendData,
                label: 'Trend',
                type: 'line',
                borderColor: '#6b7280', // gray-500
                borderWidth: 2,
                borderDash: [5, 5],
                fill: false,
                tension: 0,
                pointRadius: 0,
                order: 0
              }
            ]
          };
        }
      });
  }

  saveWeight() {
    if (this.form.invalid) return;

    this.isSaving.set(true);
    const { date, weightKg } = this.form.value;

    this.bodyWeightService.saveWeightEntry(date, weightKg)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.form.patchValue({ weightKg: '' }); // Clear input, keep date
          this.loadData(); // Refresh chart
        }
      });
  }

  private getDateRange(range: TimeRange): { startDate: string, endDate: string } {
    const end = new Date();
    const start = new Date();

    switch (range) {
      case '1M': start.setMonth(start.getMonth() - 1); break;
      case '3M': start.setMonth(start.getMonth() - 3); break;
      case '6M': start.setMonth(start.getMonth() - 6); break;
      case '1Y': start.setFullYear(start.getFullYear() - 1); break;
      case 'ALL': start.setFullYear(2000); break; // far past
    }

    return {
      startDate: this.formatDateLocal(start),
      endDate: this.formatDateLocal(end)
    };
  }

  private formatDateLocal(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private getTodayString(): string {
    return this.formatDateLocal(new Date());
  }
}

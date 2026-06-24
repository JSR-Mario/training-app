import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { BodyWeightService } from '../../services/body-weight.service';
import { finalize } from 'rxjs';

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

@Component({
  selector: 'app-body-weight-tracker',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BaseChartDirective],
  templateUrl: './body-weight-tracker.component.html',
  styles: ``
})
export class BodyWeightTrackerComponent implements OnInit {
  private bodyWeightService = inject(BodyWeightService);
  private fb = inject(FormBuilder);

  isLoading = signal(false);
  isSaving = signal(false);
  activeRange = signal<TimeRange>('1M');

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
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: '#3b82f6' }, // Blue 500
        title: { display: true, text: 'Weight (kg)', color: '#3b82f6' }
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
          const labels = data.map(d => new Date(d.date).toLocaleDateString());
          const weights = data.map(d => d.weightKg);

          this.lineChartData = {
            labels,
            datasets: [
              {
                data: weights,
                label: 'Body Weight (kg)',
                backgroundColor: 'rgba(59, 130, 246, 0.2)', // Blue 500
                borderColor: '#3b82f6',
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#3b82f6',
                fill: 'origin',
                tension: 0.4
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
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  }

  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }
}

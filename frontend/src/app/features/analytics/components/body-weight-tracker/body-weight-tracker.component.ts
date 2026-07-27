import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { BodyWeightService } from '../../services/body-weight.service';
import { BodyWeightEntry } from '../../../../core/types/training.types';
import { finalize } from 'rxjs';

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

interface AggregatedBucket {
  label: string;
  weights: number[];
  avgWeight: number;
  timestamp: number;
}

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

  startWeight = signal<number | null>(null);
  currentWeight = signal<number | null>(null);
  periodChangeKg = signal<number>(0);
  periodChangePercent = signal<number>(0);
  aggregationUnit = signal<string>('Weekly');
  math = Math;

  private currentBuckets: AggregatedBucket[] = [];

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
        intersect: false,
        callbacks: {
          label: (context) => {
            if (context.datasetIndex === 0) {
              const bucketIndex = context.dataIndex;
              const bucket = this.currentBuckets[bucketIndex];
              if (bucket) {
                return `Avg: ${context.parsed.y.toFixed(1)} kg (${bucket.weights.length} log${bucket.weights.length > 1 ? 's' : ''})`;
              }
              return `Avg: ${context.parsed.y.toFixed(1)} kg`;
            } else {
              return `Trend: ${context.parsed.y.toFixed(1)} kg`;
            }
          }
        }
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
    const range = this.activeRange();
    const { startDate, endDate } = this.getDateRange(range);

    this.bodyWeightService.getWeightEntries(startDate, endDate)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => {
          if (!data || data.length === 0) {
            this.startWeight.set(null);
            this.currentWeight.set(null);
            this.periodChangeKg.set(0);
            this.periodChangePercent.set(0);
            this.currentBuckets = [];
            this.lineChartData = { labels: [], datasets: [] };
            return;
          }

          // Sort data by date ascending
          const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          const startW = sorted[0].weightKg;
          const currentW = sorted[sorted.length - 1].weightKg;
          const diffKg = currentW - startW;
          const diffPercent = startW > 0 ? (diffKg / startW) * 100 : 0;

          this.startWeight.set(startW);
          this.currentWeight.set(currentW);
          this.periodChangeKg.set(diffKg);
          this.periodChangePercent.set(diffPercent);

          // Aggregate entries according to activeRange
          const buckets = this.aggregateEntries(sorted, range);
          this.currentBuckets = buckets;

          const labels = buckets.map(b => b.label);
          const weights = buckets.map(b => b.avgWeight);

          // Linear Regression for Trendline over aggregated points
          let trendData: number[] = [];
          if (weights.length > 1) {
            const xs = buckets.map(b => b.timestamp);
            const ys = weights;
            const n = xs.length;
            
            const sumX = xs.reduce((a, b) => a + b, 0);
            const sumY = ys.reduce((a, b) => a + b, 0);
            const sumXY = xs.reduce((sum, x, i) => sum + x * ys[i], 0);
            const sumXX = xs.reduce((sum, x) => sum + x * x, 0);
            
            const denominator = (n * sumXX - sumX * sumX);
            if (denominator !== 0) {
              const slope = (n * sumXY - sumX * sumY) / denominator;
              const intercept = (sumY - slope * sumX) / n;
              trendData = xs.map(x => Number((slope * x + intercept).toFixed(1)));
            } else {
              trendData = weights.map(() => weights[0]);
            }
          } else if (weights.length === 1) {
            trendData = [weights[0]];
          }

          let accentColor = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-pos').trim() || '#8b5cf6';
          if (/^\d+\s+\d+\s+\d+$/.test(accentColor)) {
            accentColor = `rgb(${accentColor.split(/\s+/).join(', ')})`;
          }
          
          this.lineChartData = {
            labels,
            datasets: [
              {
                data: weights,
                label: `Avg Weight (${this.aggregationUnit()})`,
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                borderColor: accentColor,
                pointBackgroundColor: accentColor,
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: accentColor,
                fill: 'origin',
                tension: 0.4,
                spanGaps: true,
                order: 1
              },
              {
                data: trendData,
                label: 'Trend',
                type: 'line',
                borderColor: '#6b7280',
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

  public aggregateEntries(entries: BodyWeightEntry[], range: TimeRange): AggregatedBucket[] {
    if (entries.length === 0) return [];

    const startTs = new Date(entries[0].date).getTime();
    const endTs = new Date(entries[entries.length - 1].date).getTime();
    const spanDays = Math.ceil((endTs - startTs) / (1000 * 60 * 60 * 24));

    let groupBy: 'WEEK' | 'MONTH' | 'YEAR' = 'WEEK';
    if (range === '1M') {
      groupBy = 'WEEK';
    } else if (range === '3M' || range === '6M' || range === '1Y') {
      groupBy = 'MONTH';
    } else { // ALL
      groupBy = spanDays >= 730 ? 'YEAR' : 'MONTH';
    }

    this.aggregationUnit.set(groupBy === 'WEEK' ? 'Weekly' : groupBy === 'MONTH' ? 'Monthly' : 'Yearly');

    const bucketMap = new Map<string, { label: string, weights: number[], timestamps: number[] }>();

    for (const entry of entries) {
      const date = new Date(entry.date + 'T00:00:00');
      let key = '';
      let label = '';

      if (groupBy === 'WEEK') {
        const dCopy = new Date(date);
        const day = dCopy.getDay();
        const diff = dCopy.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(dCopy.setDate(diff));
        key = this.formatDateLocal(monday);
        label = `Wk ${monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
      } else if (groupBy === 'MONTH') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        label = date.toLocaleDateString(undefined, { month: 'short', year: range === '1Y' || range === 'ALL' ? '2-digit' : undefined });
      } else { // YEAR
        key = `${date.getFullYear()}`;
        label = key;
      }

      if (!bucketMap.has(key)) {
        bucketMap.set(key, { label, weights: [], timestamps: [] });
      }
      const b = bucketMap.get(key)!;
      b.weights.push(entry.weightKg);
      b.timestamps.push(date.getTime());
    }

    const result: AggregatedBucket[] = [];
    for (const [, b] of bucketMap) {
      const avg = Number((b.weights.reduce((sum, w) => sum + w, 0) / b.weights.length).toFixed(1));
      const avgTs = Math.round(b.timestamps.reduce((sum, t) => sum + t, 0) / b.timestamps.length);
      result.push({
        label: b.label,
        weights: b.weights,
        avgWeight: avg,
        timestamp: avgTs
      });
    }

    return result;
  }

  saveWeight() {
    if (this.form.invalid) return;

    this.isSaving.set(true);
    const { date, weightKg } = this.form.value;

    this.bodyWeightService.saveWeightEntry(date, weightKg)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.form.patchValue({ weightKg: '' });
          this.loadData();
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
      case 'ALL': start.setFullYear(2000); break;
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

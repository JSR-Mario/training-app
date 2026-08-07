import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { CardioLogService } from '../../services/cardio-log.service';
import { CardioLogResponse } from '../../../../core/types/training.types';
import { CARDIO_TYPES } from '../../../../core/constants/cardio-types';

export type CardioTimeRange = '7D' | '1M' | '1Y' | 'ALL';

@Component({
  selector: 'app-cardio-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './cardio-chart.component.html',
  styles: ``
})
export class CardioChartComponent implements OnInit {
  private cardioService = inject(CardioLogService);

  isLoading = signal(true);
  logs = signal<CardioLogResponse[]>([]);

  activeRange = signal<CardioTimeRange>('7D');

  readonly timeRanges = [
    { id: '7D', label: '7D' },
    { id: '1M', label: '1M' },
    { id: '1Y', label: '1Y' },
    { id: 'ALL', label: 'ALL' }
  ] as const;

  setRange(range: CardioTimeRange) {
    this.activeRange.set(range);
    this.updateChart();
  }

  public chartOptions: ChartConfiguration['options'] = {
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
        stacked: true,
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8' }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: '#10b981' }, // Emerald 500
        title: { display: true, text: 'Duration (Minutes)', color: '#10b981' },
        beginAtZero: true
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  public chartType: ChartType = 'bar';
  public chartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: []
  };

  ngOnInit() {
    this.loadLogs();
  }

  // Allow external components to trigger a reload
  reload() {
    this.loadLogs();
  }

  private loadLogs() {
    this.isLoading.set(true);
    this.cardioService.getLogs().subscribe({
      next: (logs) => {
        this.logs.set(logs);
        this.updateChart();
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load cardio logs', err);
        this.isLoading.set(false);
      }
    });
  }

  private formatDateIso(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private updateChart() {
    const data = this.logs();
    if (!data || data.length === 0) {
      this.chartData = { labels: [], datasets: [] };
      return;
    }

    const range = this.activeRange();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let cutoffDate: Date | null = null;
    if (range === '7D') {
      cutoffDate = new Date(today);
      cutoffDate.setDate(today.getDate() - 6);
    } else if (range === '1M') {
      cutoffDate = new Date(today);
      cutoffDate.setDate(today.getDate() - 29);
    } else if (range === '1Y') {
      cutoffDate = new Date(today);
      cutoffDate.setDate(today.getDate() - 364);
    }

    const filteredData = data.filter(entry => {
      if (!cutoffDate) return true;
      const entryDate = new Date(entry.performedOn + 'T00:00:00');
      return entryDate >= cutoffDate;
    });

    const typeOrder = CARDIO_TYPES.map(t => t.value) as string[];
    const knownNames = new Set(typeOrder);

    const aggregated = new Map<string, Map<string, number>>();
    const presentTypes = new Set<string>();

    if (range === '7D') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = this.formatDateIso(d);
        aggregated.set(dateStr, new Map<string, number>());
      }
    }

    filteredData.forEach(entry => {
      const date = entry.performedOn;
      let type = (entry.cardioType || 'Other').trim();

      if (type === '' || !knownNames.has(type)) {
        type = 'Other';
      }

      presentTypes.add(type);

      if (!aggregated.has(date)) {
        aggregated.set(date, new Map<string, number>());
      }
      const dateMap = aggregated.get(date)!;
      dateMap.set(type, (dateMap.get(type) || 0) + (entry.durationMinutes || 0));
    });

    const sortedDates = Array.from(aggregated.keys()).sort();

    if (sortedDates.length === 0) {
      this.chartData = { labels: [], datasets: [] };
      return;
    }

    // Calculate total duration per date for trendline
    const dailyTotals = sortedDates.map(d => {
      const dateMap = aggregated.get(d);
      if (!dateMap) return 0;
      let sum = 0;
      dateMap.forEach(val => sum += val);
      return sum;
    });

    // Linear regression for Trend Line
    const n = sortedDates.length;
    const trendValues: number[] = [];

    if (n > 0) {
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumX2 = 0;

      for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += dailyTotals[i];
        sumXY += i * dailyTotals[i];
        sumX2 += i * i;
      }

      const denominator = n * sumX2 - sumX * sumX;
      const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
      const intercept = (sumY - slope * sumX) / n;

      for (let i = 0; i < n; i++) {
        const val = slope * i + intercept;
        trendValues.push(Math.max(0, Math.round(val * 10) / 10));
      }
    }

    const sortedTypes = Array.from(presentTypes).sort((a, b) => {
      const idxA = typeOrder.indexOf(a);
      const idxB = typeOrder.indexOf(b);
      return (idxA === -1 ? typeOrder.length : idxA) - (idxB === -1 ? typeOrder.length : idxB);
    });

    const datasets: ChartConfiguration['data']['datasets'] = sortedTypes.map(type => {
      const typeDef = CARDIO_TYPES.find(t => t.value === type) || CARDIO_TYPES.find(t => t.value === 'Other')!;
      const colorOptions = typeDef.color;
      return {
        type: 'bar',
        label: type,
        data: sortedDates.map(d => aggregated.get(d)?.get(type) || 0),
        backgroundColor: colorOptions.bg,
        borderColor: colorOptions.border,
        borderWidth: 2,
        borderRadius: 4,
        stack: 'cardio'
      };
    });

    if (dailyTotals.some(v => v > 0)) {
      datasets.push({
        type: 'line',
        label: 'Trend Line',
        data: trendValues,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        borderWidth: 2.5,
        borderDash: [6, 4],
        pointRadius: 3,
        pointBackgroundColor: '#f59e0b',
        fill: false,
        stack: 'trend',
        order: -1
      });
    }

    this.chartData = {
      labels: sortedDates,
      datasets: datasets
    };
  }
}

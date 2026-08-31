import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType, TooltipItem } from 'chart.js';
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
        intersect: false,
        callbacks: {
          label: (context: TooltipItem<ChartType>) => {
            const datasetLabel = context.dataset.label || '';
            const value = context.parsed.y;
            if (value === null || value === undefined) return '';
            if (value === 0 && context.dataset.type === 'bar') {
              return '';
            }
            if (context.dataset.yAxisID === 'y1' || datasetLabel.includes('Distance')) {
              return `${datasetLabel}: ${value} km`;
            }
            return `${datasetLabel}: ${value} min`;
          }
        }
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
        stacked: true,
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: '#10b981' },
        title: { display: true, text: 'Duration (min)', color: '#10b981' },
        beginAtZero: true
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: { color: '#38bdf8' },
        title: { display: true, text: 'Distance (km)', color: '#38bdf8' },
        beginAtZero: true
      }
    },
    interaction: {
      mode: 'index',
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
    const dailyDistanceMap = new Map<string, number>();
    const presentTypes = new Set<string>();

    if (range === '7D') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = this.formatDateIso(d);
        aggregated.set(dateStr, new Map<string, number>());
        dailyDistanceMap.set(dateStr, 0);
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

      const dist = Number(entry.distanceKm) || 0;
      dailyDistanceMap.set(date, Math.round(((dailyDistanceMap.get(date) || 0) + dist) * 100) / 100);
    });

    const sortedDates = Array.from(aggregated.keys()).sort();

    if (sortedDates.length === 0) {
      this.chartData = { labels: [], datasets: [] };
      return;
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
        stack: 'cardio',
        yAxisID: 'y',
        order: 2
      };
    });

    const dailyDistances = sortedDates.map(d => dailyDistanceMap.get(d) || 0);
    datasets.push({
      type: 'line',
      label: 'Distance (km)',
      data: dailyDistances,
      borderColor: '#38bdf8',
      backgroundColor: 'rgba(56, 189, 248, 0.15)',
      borderWidth: 2.5,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: '#38bdf8',
      pointBorderColor: '#ffffff',
      tension: 0.2,
      fill: false,
      yAxisID: 'y1',
      order: 1
    });

    this.chartData = {
      labels: sortedDates,
      datasets: datasets
    };
  }
}

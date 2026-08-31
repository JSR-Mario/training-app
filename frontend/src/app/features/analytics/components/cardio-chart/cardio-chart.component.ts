import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType, TooltipItem } from 'chart.js';
import { CardioLogService } from '../../services/cardio-log.service';
import { CardioLogResponse } from '../../../../core/types/training.types';
import { CARDIO_TYPES } from '../../../../core/constants/cardio-types';

export type CardioTimeRange = '7D' | '1M' | '1Y' | 'ALL';

export interface ActivityFilterItem {
  value: string;
  label: string;
}

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
  selectedActivity = signal<string>('ALL');
  availableActivities = signal<ActivityFilterItem[]>([]);

  totalDurationMinutes = signal<number>(0);
  totalDistanceKm = signal<number>(0);
  sessionCount = signal<number>(0);
  averagePace = signal<string | null>(null);

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

  setActivity(activity: string) {
    this.selectedActivity.set(activity);
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
        display: false,
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

  formatDuration(minutes: number): string {
    if (!minutes || minutes <= 0) return '0 min';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
    if (hrs > 0) return `${hrs}h`;
    return `${mins} min`;
  }

  private loadLogs() {
    this.isLoading.set(true);
    this.cardioService.getLogs().subscribe({
      next: (logs) => {
        this.logs.set(logs);
        this.updateAvailableActivities(logs);
        this.updateChart();
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load cardio logs', err);
        this.isLoading.set(false);
      }
    });
  }

  private updateAvailableActivities(logs: CardioLogResponse[]) {
    const presentTypes = new Set<string>();
    logs.forEach(l => {
      if (l.cardioType && l.cardioType.trim() !== '') {
        presentTypes.add(l.cardioType.trim());
      }
    });

    const items: ActivityFilterItem[] = [{ value: 'ALL', label: 'All Activities' }];
    CARDIO_TYPES.forEach(t => {
      if (presentTypes.has(t.value)) {
        items.push({ value: t.value, label: t.label });
      }
    });
    // Add any custom type not in CARDIO_TYPES
    presentTypes.forEach(t => {
      if (!items.some(i => i.value === t)) {
        items.push({ value: t, label: t });
      }
    });

    this.availableActivities.set(items);
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
      this.sessionCount.set(0);
      this.totalDurationMinutes.set(0);
      this.totalDistanceKm.set(0);
      this.averagePace.set(null);
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

    const rangeFilteredData = data.filter(entry => {
      if (!cutoffDate) return true;
      const entryDate = new Date(entry.performedOn + 'T00:00:00');
      return entryDate >= cutoffDate;
    });

    const activityFilter = this.selectedActivity();
    const filteredData = rangeFilteredData.filter(entry => {
      if (activityFilter === 'ALL') return true;
      return (entry.cardioType || 'Other').trim() === activityFilter;
    });

    // Compute Summary KPIs
    let sumMinutes = 0;
    let sumDistance = 0;
    filteredData.forEach(entry => {
      sumMinutes += entry.durationMinutes || 0;
      sumDistance += Number(entry.distanceKm) || 0;
    });

    this.sessionCount.set(filteredData.length);
    this.totalDurationMinutes.set(sumMinutes);
    this.totalDistanceKm.set(Math.round(sumDistance * 100) / 100);

    if (sumDistance > 0 && sumMinutes > 0) {
      const paceDecimal = sumMinutes / sumDistance;
      const paceMin = Math.floor(paceDecimal);
      const paceSec = Math.round((paceDecimal - paceMin) * 60);
      const paddedSec = paceSec < 10 ? `0${paceSec}` : (paceSec === 60 ? '00' : `${paceSec}`);
      const finalMin = paceSec === 60 ? paceMin + 1 : paceMin;
      this.averagePace.set(`${finalMin}:${paddedSec} /km`);
    } else {
      this.averagePace.set(null);
    }

    const sortedDatesSet = new Set<string>();
    if (range === '7D') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        sortedDatesSet.add(this.formatDateIso(d));
      }
    }
    filteredData.forEach(entry => sortedDatesSet.add(entry.performedOn));
    const sortedDates = Array.from(sortedDatesSet).sort();

    if (sortedDates.length === 0) {
      this.chartData = { labels: [], datasets: [] };
      return;
    }

    const typeOrder = CARDIO_TYPES.map(t => t.value) as string[];
    const knownNames = new Set(typeOrder);

    if (activityFilter === 'ALL') {
      // General overview: Stacked duration bars by type
      const aggregated = new Map<string, Map<string, number>>();
      const presentTypes = new Set<string>();

      sortedDates.forEach(d => aggregated.set(d, new Map<string, number>()));

      filteredData.forEach(entry => {
        const date = entry.performedOn;
        let type = (entry.cardioType || 'Other').trim();
        if (type === '' || !knownNames.has(type)) {
          type = 'Other';
        }
        presentTypes.add(type);
        const dateMap = aggregated.get(date)!;
        dateMap.set(type, (dateMap.get(type) || 0) + (entry.durationMinutes || 0));
      });

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
          yAxisID: 'y'
        };
      });

      this.chartOptions = {
        ...this.chartOptions,
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
            display: false
          }
        }
      };

      this.chartData = {
        labels: sortedDates,
        datasets: datasets
      };
    } else {
      // Specific sport selected: Focus on Distance (km) and Duration (min)
      const dailyDistMap = new Map<string, number>();
      const dailyDurMap = new Map<string, number>();
      sortedDates.forEach(d => {
        dailyDistMap.set(d, 0);
        dailyDurMap.set(d, 0);
      });

      filteredData.forEach(entry => {
        const date = entry.performedOn;
        const dist = Number(entry.distanceKm) || 0;
        const dur = entry.durationMinutes || 0;
        dailyDistMap.set(date, Math.round(((dailyDistMap.get(date) || 0) + dist) * 100) / 100);
        dailyDurMap.set(date, (dailyDurMap.get(date) || 0) + dur);
      });

      const typeDef = CARDIO_TYPES.find(t => t.value === activityFilter) || CARDIO_TYPES.find(t => t.value === 'Other')!;
      const hasDistance = sumDistance > 0;

      const datasets: ChartConfiguration['data']['datasets'] = [];

      if (hasDistance) {
        // Distance Bars (Left Y Axis)
        datasets.push({
          type: 'bar',
          label: `${typeDef.label} Distance`,
          data: sortedDates.map(d => dailyDistMap.get(d) || 0),
          backgroundColor: typeDef.color.bg,
          borderColor: typeDef.color.border,
          borderWidth: 2,
          borderRadius: 4,
          yAxisID: 'y',
          order: 2
        });

        // Duration Line (Right Y Axis)
        datasets.push({
          type: 'line',
          label: `${typeDef.label} Duration`,
          data: sortedDates.map(d => dailyDurMap.get(d) || 0),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#ffffff',
          tension: 0.2,
          yAxisID: 'y1',
          order: 1
        });

        this.chartOptions = {
          ...this.chartOptions,
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
              ticks: { color: typeDef.color.border },
              title: { display: true, text: 'Distance (km)', color: typeDef.color.border },
              beginAtZero: true
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              grid: { drawOnChartArea: false },
              ticks: { color: '#10b981' },
              title: { display: true, text: 'Duration (min)', color: '#10b981' },
              beginAtZero: true
            }
          }
        };
      } else {
        // Only Duration Bars
        datasets.push({
          type: 'bar',
          label: `${typeDef.label} Duration`,
          data: sortedDates.map(d => dailyDurMap.get(d) || 0),
          backgroundColor: typeDef.color.bg,
          borderColor: typeDef.color.border,
          borderWidth: 2,
          borderRadius: 4,
          yAxisID: 'y'
        });

        this.chartOptions = {
          ...this.chartOptions,
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
              ticks: { color: '#10b981' },
              title: { display: true, text: 'Duration (min)', color: '#10b981' },
              beginAtZero: true
            },
            y1: {
              display: false
            }
          }
        };
      }

      this.chartData = {
        labels: sortedDates,
        datasets: datasets
      };
    }
  }
}

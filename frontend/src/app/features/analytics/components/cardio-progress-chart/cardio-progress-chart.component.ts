import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType, TooltipItem } from 'chart.js';
import { CardioLogService } from '../../services/cardio-log.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { CardioLogResponse } from '../../../../core/types/training.types';
import { CARDIO_TYPES } from '../../../../core/constants/cardio-types';

export interface CardioFilterOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-cardio-progress-chart',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  template: `
    <div class="solid-card p-6 rounded-2xl animate-fade-in relative border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm space-y-6">
      <!-- Top Bar: Title & Selectors -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <svg class="w-5 h-5 text-accent-pos" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Cardio Progression
          </h3>
        </div>

        <!-- Right Side Controls -->
        <div class="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto">
          <!-- Cardio Sport Selector -->
          <div class="w-full sm:w-60 relative">
            <label for="cardio-sport-select" class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Activity / Sport
            </label>
            <select
              id="cardio-sport-select"
              [ngModel]="selectedActivity()"
              (ngModelChange)="onActivityChange($event)"
              class="w-full appearance-none bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm rounded-lg pl-3 pr-8 py-2 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent-pos transition-all cursor-pointer">
              @for (act of availableActivities(); track act.value) {
                <option [value]="act.value">{{ act.label }}</option>
              }
            </select>
            <div class="absolute right-2.5 top-[26px] flex items-center gap-1 text-slate-400 pointer-events-none">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <!-- Time Filter Dropdown -->
          <div class="w-full sm:w-40 relative">
            <label for="cardio-time-filter-select" class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Time Range
            </label>
            <select
              id="cardio-time-filter-select"
              [ngModel]="selectedTimeRange()"
              (ngModelChange)="onTimeRangeChange($event)"
              class="w-full appearance-none bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm rounded-lg pl-3 pr-8 py-2 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent-pos transition-all cursor-pointer">
              <option value="1W">Last Week</option>
              <option value="1M">Last Month</option>
              <option value="3M">Last 3 Months</option>
              <option value="6M">Last 6 Months</option>
              <option value="1Y">Last Year</option>
              <option value="ALL">All Time</option>
            </select>
            <div class="absolute right-2.5 top-[26px] flex items-center gap-1 text-slate-400 pointer-events-none">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Stat Badges & PRs -->
      @if (!isLoading() && filteredLogs().length > 0) {
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <!-- Max Distance PR -->
          <div class="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-lg p-3.5 flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-accent-pos/10 text-accent-pos flex items-center justify-center font-bold text-xs shrink-0">
              DIST
            </div>
            <div class="min-w-0">
              <div class="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">Max Distance (PR)</div>
              <div class="text-lg font-bold text-slate-900 dark:text-white truncate">
                @if (maxDistance()) {
                  {{ maxDistance() }} <span class="text-xs text-slate-500 font-normal">km</span>
                } @else {
                  —
                }
              </div>
            </div>
          </div>

          <!-- Max Duration PR -->
          <div class="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-lg p-3.5 flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-accent-neg/10 text-accent-neg flex items-center justify-center font-bold text-xs shrink-0">
              TIME
            </div>
            <div class="min-w-0">
              <div class="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">Max Duration (PR)</div>
              <div class="text-lg font-bold text-slate-900 dark:text-white truncate">
                {{ formatDuration(maxDuration()) }}
              </div>
            </div>
          </div>

          <!-- Best Pace PR -->
          <div class="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-lg p-3.5 flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold text-xs shrink-0">
              PACE
            </div>
            <div class="min-w-0">
              <div class="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">Best Pace (PR)</div>
              <div class="text-lg font-bold text-slate-900 dark:text-white truncate">
                {{ bestPace() || '—' }}
              </div>
            </div>
          </div>

          <!-- Total Sessions -->
          <div class="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-lg p-3.5 flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
              SESS
            </div>
            <div class="min-w-0">
              <div class="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">Total Sessions</div>
              <div class="text-lg font-bold text-slate-900 dark:text-white truncate">
                {{ filteredLogs().length }}
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Chart Container -->
      <div class="relative min-h-[320px] flex items-center justify-center">
        <!-- Loading Spinner -->
        @if (isLoading()) {
          <div class="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-slate-900/70 z-10 rounded-lg">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-pos"></div>
          </div>
        }

        <!-- Empty State -->
        @if (!isLoading() && filteredLogs().length === 0) {
          <div class="text-center py-12 px-4 text-slate-400 dark:text-slate-500">
            <svg class="w-12 h-12 mx-auto mb-3 stroke-current opacity-40" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p class="text-sm font-medium text-slate-600 dark:text-slate-300">
              No cardio history found for this activity and time range
            </p>
          </div>
        }

        <!-- Canvas Chart -->
        @if (!isLoading() && filteredLogs().length > 0) {
          <div class="w-full h-[340px]">
            <canvas 
              baseChart
              [data]="chartData"
              [options]="chartOptions"
              [type]="chartType">
            </canvas>
          </div>
        }
      </div>
    </div>
  `,
  styles: ``
})
export class CardioProgressChartComponent implements OnInit {
  private cardioService = inject(CardioLogService);
  private themeService = inject(ThemeService);

  logs = signal<CardioLogResponse[]>([]);
  isLoading = signal<boolean>(false);

  selectedActivity = signal<string>('ALL');
  selectedTimeRange = signal<string>('ALL');

  availableActivities = computed(() => {
    const presentTypes = new Set<string>();
    this.logs().forEach(l => {
      if (l.cardioType && l.cardioType.trim() !== '') {
        presentTypes.add(l.cardioType.trim());
      }
    });

    const items: CardioFilterOption[] = [{ value: 'ALL', label: 'All Activities' }];
    CARDIO_TYPES.forEach(t => {
      if (presentTypes.has(t.value)) {
        items.push({ value: t.value, label: t.label });
      }
    });
    presentTypes.forEach(t => {
      if (!items.some(i => i.value === t)) {
        items.push({ value: t, label: t });
      }
    });
    return items;
  });

  filteredLogs = computed(() => {
    const data = this.logs();
    const range = this.selectedTimeRange();
    const act = this.selectedActivity();

    const now = new Date();
    let cutoff: Date | null = null;

    switch (range) {
      case '1W':
        cutoff = new Date();
        cutoff.setDate(now.getDate() - 7);
        break;
      case '1M':
        cutoff = new Date();
        cutoff.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        cutoff = new Date();
        cutoff.setMonth(now.getMonth() - 3);
        break;
      case '6M':
        cutoff = new Date();
        cutoff.setMonth(now.getMonth() - 6);
        break;
      case '1Y':
        cutoff = new Date();
        cutoff.setFullYear(now.getFullYear() - 1);
        break;
      default:
        cutoff = null;
    }

    return data.filter(entry => {
      if (cutoff && new Date(entry.performedOn + 'T00:00:00').getTime() < cutoff.getTime()) {
        return false;
      }
      if (act !== 'ALL' && (entry.cardioType || 'Other').trim() !== act) {
        return false;
      }
      return true;
    }).sort((a, b) => new Date(a.performedOn).getTime() - new Date(b.performedOn).getTime());
  });

  maxDistance = computed(() => {
    const list = this.filteredLogs();
    let max = 0;
    list.forEach(l => {
      const d = Number(l.distanceKm) || 0;
      if (d > max) max = d;
    });
    return max > 0 ? max : null;
  });

  maxDuration = computed(() => {
    const list = this.filteredLogs();
    let max = 0;
    list.forEach(l => {
      const d = l.durationMinutes || 0;
      if (d > max) max = d;
    });
    return max;
  });

  bestPace = computed(() => {
    const list = this.filteredLogs();
    let minPaceDecimal: number | null = null;

    list.forEach(l => {
      const dist = Number(l.distanceKm) || 0;
      const dur = l.durationMinutes || 0;
      if (dist > 0 && dur > 0) {
        const pace = dur / dist;
        if (minPaceDecimal === null || pace < minPaceDecimal) {
          minPaceDecimal = pace;
        }
      }
    });

    if (minPaceDecimal === null) return null;
    const paceMin = Math.floor(minPaceDecimal);
    const paceSec = Math.round((minPaceDecimal - paceMin) * 60);
    const paddedSec = paceSec < 10 ? `0${paceSec}` : (paceSec === 60 ? '00' : `${paceSec}`);
    const finalMin = paceSec === 60 ? paceMin + 1 : paceMin;
    return `${finalMin}:${paddedSec} /km`;
  });

  chartType: ChartType = 'line';
  chartData: ChartConfiguration['data'] = { labels: [], datasets: [] };

  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { color: '#94a3b8', font: { size: 12 } }
      },
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
            if (context.dataset.yAxisID === 'yDistance') {
              return `${datasetLabel}: ${value} km`;
            }
            return `${datasetLabel}: ${value} min`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8' }
      },
      yDistance: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#10b981' },
        title: { display: true, text: 'Distance (km)', color: '#10b981' },
        beginAtZero: true
      },
      yDuration: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: { display: false },
        ticks: { color: '#ec4899' },
        title: { display: true, text: 'Duration (min)', color: '#ec4899' },
        beginAtZero: true
      }
    },
    interaction: {
      mode: 'index',
      intersect: false
    }
  };

  constructor() {
    effect(() => {
      this.themeService.themeMode();
      this.themeService.positiveColor();
      this.themeService.negativeColor();

      const current = this.filteredLogs();
      this.updateChart(current);
    });
  }

  ngOnInit() {
    this.loadLogs();
  }

  onActivityChange(act: string) {
    this.selectedActivity.set(act);
    this.updateChart(this.filteredLogs());
  }

  onTimeRangeChange(range: string) {
    this.selectedTimeRange.set(range);
    this.updateChart(this.filteredLogs());
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
        this.isLoading.set(false);
        this.updateChart(this.filteredLogs());
      },
      error: (err) => {
        console.error('Error loading cardio logs for progression', err);
        this.isLoading.set(false);
      }
    });
  }

  private updateChart(entries: CardioLogResponse[]) {
    if (!entries.length) {
      this.chartData = { labels: [], datasets: [] };
      return;
    }

    const posColor = this.getCssVariableValue('--color-accent-pos');
    const negColor = this.getCssVariableValue('--color-accent-neg');

    const hasDistance = entries.some(e => Number(e.distanceKm) > 0);

    if (this.chartOptions && this.chartOptions.scales) {
      const scalesMap = this.chartOptions.scales as Record<string, { display?: boolean; ticks?: Record<string, unknown>; title?: Record<string, unknown> }>;
      if (scalesMap['yDistance']) {
        scalesMap['yDistance'].display = hasDistance;
        scalesMap['yDistance'].ticks = { ...scalesMap['yDistance'].ticks, color: posColor };
        scalesMap['yDistance'].title = { ...scalesMap['yDistance'].title, color: posColor };
      }
      if (scalesMap['yDuration']) {
        scalesMap['yDuration'].ticks = { ...scalesMap['yDuration'].ticks, color: negColor };
        scalesMap['yDuration'].title = { ...scalesMap['yDuration'].title, color: negColor };
      }
    }

    const labels = entries.map(e => {
      const d = new Date(e.performedOn + 'T00:00:00');
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    });

    const durations = entries.map(e => e.durationMinutes);
    const distances = entries.map(e => Number(e.distanceKm) || 0);

    const datasets: ChartConfiguration['data']['datasets'] = [];

    if (hasDistance) {
      datasets.push({
        label: 'Distance (km)',
        data: distances,
        yAxisID: 'yDistance',
        borderColor: posColor,
        backgroundColor: this.hexToRgba(posColor, 0.12),
        borderWidth: 3,
        tension: 0.3,
        fill: true,
        pointBackgroundColor: posColor,
        pointBorderColor: '#0f172a',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7
      });
    }

    datasets.push({
      label: 'Duration (min)',
      data: durations,
      yAxisID: 'yDuration',
      borderColor: negColor,
      backgroundColor: this.hexToRgba(negColor, 0.08),
      borderWidth: 2.5,
      borderDash: hasDistance ? [4, 4] : undefined,
      tension: 0.3,
      fill: !hasDistance,
      pointBackgroundColor: negColor,
      pointBorderColor: '#0f172a',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    });

    this.chartData = {
      labels,
      datasets
    };
  }

  private getCssVariableValue(variableName: string): string {
    if (typeof window === 'undefined') return '#10b981';
    let val = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
    if (!val) return '#10b981';
    if (/^\d+\s+\d+\s+\d+$/.test(val)) {
      val = `rgb(${val.split(/\s+/).join(', ')})`;
    }
    return val;
  }

  private hexToRgba(color: string, alpha: number): string {
    if (color.startsWith('rgb')) {
      return color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
    }
    if (color.startsWith('#')) {
      let hex = color.slice(1);
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      const num = parseInt(hex, 16);
      const r = (num >> 16) & 255;
      const g = (num >> 8) & 255;
      const b = num & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
  }
}

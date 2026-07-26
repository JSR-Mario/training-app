import { Component, OnInit, ElementRef, HostListener, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { AnalyticsService } from '../../services/analytics.service';
import { ExerciseService } from '../../../exercises/services/exercise.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { ExerciseProgressEntry } from '../../../../core/types/analytics.types';
import { Exercise } from '../../../../core/types/training.types';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-exercise-progress-chart',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  template: `
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
      <!-- Top Bar: Title & Searchable Exercise Selector -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <svg class="w-5 h-5 text-accent-pos" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Exercise Progression
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track weight PRs, volume, and sets over time for any exercise
          </p>
        </div>

        <!-- Custom Searchable Dropdown -->
        <div class="w-full sm:w-80 relative">
          <label for="exercise-search-input" class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Select Exercise
          </label>

          <div class="relative">
            <input 
              id="exercise-search-input"
              type="text"
              [ngModel]="selectedExerciseName()"
              (focus)="openDropdown()"
              (input)="onSearchInput($event)"
              placeholder="Search exercise..."
              autocomplete="off"
              class="w-full text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg pr-8 pl-3 py-2 focus:ring-2 focus:ring-accent-pos focus:outline-none transition-all cursor-pointer" />

            <div class="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400 pointer-events-none">
              <svg class="w-4 h-4 transition-transform duration-200" [class.rotate-180]="isDropdownOpen()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <!-- Dropdown Menu -->
          @if (isDropdownOpen()) {
            <div class="absolute right-0 left-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-30 py-1 divide-y divide-slate-100 dark:divide-slate-700/50">
              @for (ex of filteredExercises(); track ex.id) {
                <button 
                  type="button"
                  (click)="selectExercise(ex)"
                  [class.bg-slate-100]="ex.id === selectedExerciseId()"
                  [class.dark:bg-slate-700/60]="ex.id === selectedExerciseId()"
                  [class.text-accent-pos]="ex.id === selectedExerciseId()"
                  class="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/40 flex items-center justify-between transition-colors">
                  <span class="font-medium truncate">{{ ex.name }}</span>
                  @if (ex.equipmentBrand) {
                    <span class="text-xs text-slate-400 dark:text-slate-500 shrink-0 ml-2 font-normal">
                      {{ ex.equipmentBrand }}
                    </span>
                  }
                </button>
              }
              @if (filteredExercises().length === 0) {
                <div class="px-3 py-3 text-xs text-slate-400 text-center">
                  No exercises found
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- Stat Badges -->
      @if (selectedExerciseId() && !isLoading()) {
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-lg p-3.5 flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-accent-pos/10 text-accent-pos flex items-center justify-center font-bold text-sm">
              PR
            </div>
            <div>
              <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">All-Time Weight PR</div>
              <div class="text-lg font-bold text-slate-900 dark:text-white">
                {{ maxWeightPR() }} <span class="text-xs text-slate-500 font-normal">kg</span>
              </div>
            </div>
          </div>

          <div class="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-lg p-3.5 flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-accent-neg/10 text-accent-neg flex items-center justify-center font-bold text-sm">
              VOL
            </div>
            <div>
              <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">Peak Session Volume</div>
              <div class="text-lg font-bold text-slate-900 dark:text-white">
                {{ peakVolume() }} <span class="text-xs text-slate-500 font-normal">kg</span>
              </div>
            </div>
          </div>

          <div class="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-lg p-3.5 flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
              SESS
            </div>
            <div>
              <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">Sessions Logged</div>
              <div class="text-lg font-bold text-slate-900 dark:text-white">
                {{ totalSessions() }}
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
        @if (!isLoading() && (!selectedExerciseId() || progressData().length === 0)) {
          <div class="text-center py-12 px-4 text-slate-400 dark:text-slate-500">
            <svg class="w-12 h-12 mx-auto mb-3 stroke-current opacity-40" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p class="text-sm font-medium text-slate-600 dark:text-slate-300">
              {{ selectedExerciseId() ? 'No workout history found for this exercise' : 'Select an exercise above to view progression' }}
            </p>
          </div>
        }

        <!-- Canvas Chart -->
        @if (!isLoading() && selectedExerciseId() && progressData().length > 0) {
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
export class ExerciseProgressChartComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);
  private exerciseService = inject(ExerciseService);
  private themeService = inject(ThemeService);
  private elementRef = inject(ElementRef);

  exercises = signal<Exercise[]>([]);
  selectedExerciseId = signal<string>('');
  searchTerm = signal<string>('');
  isDropdownOpen = signal<boolean>(false);

  progressData = signal<ExerciseProgressEntry[]>([]);
  isLoading = signal<boolean>(false);

  filteredExercises = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const all = this.exercises();
    if (!term) return all;
    return all.filter(ex => 
      ex.name.toLowerCase().includes(term) ||
      (ex.equipmentBrand && ex.equipmentBrand.toLowerCase().includes(term))
    );
  });

  selectedExerciseName = computed(() => {
    if (this.isDropdownOpen()) {
      return this.searchTerm();
    }
    const currentId = this.selectedExerciseId();
    const found = this.exercises().find(e => e.id === currentId);
    if (!found) return '';
    return found.equipmentBrand ? `${found.name} (${found.equipmentBrand})` : found.name;
  });

  maxWeightPR = computed(() => {
    const data = this.progressData();
    if (!data.length) return 0;
    return Math.max(...data.map(d => d.maxWeightKg));
  });

  peakVolume = computed(() => {
    const data = this.progressData();
    if (!data.length) return 0;
    return Math.max(...data.map(d => d.totalVolumeKg));
  });

  totalSessions = computed(() => this.progressData().length);

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
        intersect: false
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8' }
      },
      yWeight: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#ec4899' },
        title: { display: true, text: 'Max Weight (kg)', color: '#ec4899' }
      },
      yVolume: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: { display: false },
        ticks: { color: '#10b981' },
        title: { display: true, text: 'Total Volume (kg)', color: '#10b981' }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false
    }
  };

  constructor() {
    // Dynamically update chart whenever theme or accent colors change
    effect(() => {
      this.themeService.themeMode();
      this.themeService.positiveColor();
      this.themeService.negativeColor();
      
      const current = this.progressData();
      if (current.length > 0) {
        this.updateChart(current);
      }
    });
  }

  ngOnInit() {
    this.loadExercises();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen.set(false);
    }
  }

  openDropdown() {
    this.searchTerm.set('');
    this.isDropdownOpen.set(true);
  }

  onSearchInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.searchTerm.set(val);
    this.isDropdownOpen.set(true);
  }

  selectExercise(ex: Exercise) {
    this.selectedExerciseId.set(ex.id);
    this.isDropdownOpen.set(false);
    this.fetchExerciseProgress(ex.id);
  }

  private loadExercises() {
    this.exerciseService.getExercises().subscribe({
      next: (exercises) => {
        const sorted = [...exercises].sort((a, b) => a.name.localeCompare(b.name));
        this.exercises.set(sorted);
        if (sorted.length > 0) {
          this.selectExercise(sorted[0]);
        }
      },
      error: (err) => console.error('Error loading exercises', err)
    });
  }

  private fetchExerciseProgress(exerciseId: string) {
    this.isLoading.set(true);

    this.analyticsService.getExerciseProgress(exerciseId).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (entries) => {
        const sorted = [...entries].sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime());
        this.progressData.set(sorted);
        this.updateChart(sorted);
      },
      error: (err) => {
        console.error('Error loading exercise progress', err);
        this.progressData.set([]);
        this.updateChart([]);
      }
    });
  }

  private updateChart(entries: ExerciseProgressEntry[]) {
    if (!entries.length) {
      this.chartData = { labels: [], datasets: [] };
      return;
    }

    const posColor = this.getCssVariableValue('--color-accent-pos');
    const negColor = this.getCssVariableValue('--color-accent-neg');

    // Update chart scales title and tick colors to match line colors
    if (this.chartOptions && this.chartOptions.scales) {
      const scalesMap = this.chartOptions.scales as Record<string, { ticks?: Record<string, unknown>; title?: Record<string, unknown> }>;
      if (scalesMap['yWeight']) {
        scalesMap['yWeight'].ticks = { ...scalesMap['yWeight'].ticks, color: posColor };
        scalesMap['yWeight'].title = { ...scalesMap['yWeight'].title, color: posColor };
      }
      if (scalesMap['yVolume']) {
        scalesMap['yVolume'].ticks = { ...scalesMap['yVolume'].ticks, color: negColor };
        scalesMap['yVolume'].title = { ...scalesMap['yVolume'].title, color: negColor };
      }
    }

    const labels = entries.map(e => {
      const d = new Date(e.sessionDate);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    });

    const maxWeights = entries.map(e => e.maxWeightKg);
    const volumes = entries.map(e => e.totalVolumeKg);

    this.chartData = {
      labels,
      datasets: [
        {
          label: 'Max Weight (kg)',
          data: maxWeights,
          yAxisID: 'yWeight',
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
        },
        {
          label: 'Total Volume (kg)',
          data: volumes,
          yAxisID: 'yVolume',
          borderColor: negColor,
          backgroundColor: this.hexToRgba(negColor, 0.08),
          borderWidth: 2.5,
          borderDash: [4, 4],
          tension: 0.3,
          fill: false,
          pointBackgroundColor: negColor,
          pointBorderColor: '#0f172a',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    };
  }

  private getCssVariableValue(variableName: string): string {
    if (typeof window === 'undefined') return '#ec4899';
    let val = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
    if (!val) return '#ec4899';
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

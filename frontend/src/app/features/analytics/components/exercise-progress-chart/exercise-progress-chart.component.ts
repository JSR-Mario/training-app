import { Component, OnInit, ElementRef, HostListener, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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
    <div class="solid-card p-6 rounded-2xl animate-fade-in relative border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm space-y-6">
      <!-- Top Bar: Title & Searchable Exercise Selector -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <svg class="w-5 h-5 text-accent-pos" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Exercise Progression
          </h3>
        </div>

        <!-- Right Side Controls -->
        <div class="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto">
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
                  <span class="font-medium truncate inline-flex items-center gap-1">
                    @if (ex.isPublic) {
                      <svg class="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    }
                    {{ ex.name }}
                  </span>
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
        
        <!-- Time Filter Dropdown -->
        <div class="w-full sm:w-40 relative">
          <label for="time-filter-select" class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Time Range
          </label>
          <select
            id="time-filter-select"
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
      @if (selectedExerciseId() && !isLoading()) {
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-lg p-3.5 flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-accent-neg/10 text-accent-neg flex items-center justify-center font-bold text-sm">
              BEST
            </div>
            <div>
              <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">Best Set Volume</div>
              <div class="text-lg font-bold text-slate-900 dark:text-white">
                {{ bestSetVolumeWeight() }}<span class="text-xs text-slate-500 font-normal">kg</span> &times; {{ bestSetVolumeReps() }}
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

        @if (selectedExercise()?.personalRecords?.length) {
          <div class="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl p-4 mt-3">
            <h3 class="text-sm font-bold text-yellow-800 dark:text-yellow-500 mb-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              Personal Records
            </h3>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              @for (pr of selectedExercise()?.personalRecords; track pr.bucket) {
                <div class="bg-white dark:bg-gray-800 rounded-lg p-2.5 border border-yellow-100 dark:border-yellow-500/10 text-center shadow-sm">
                  <div class="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{{ pr.bucket }} Reps</div>
                  <div class="font-bold text-gray-900 dark:text-white">{{ pr.weightKg }}kg &times; {{ pr.reps }}</div>
                </div>
              }
            </div>
          </div>
        }
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
        @if (!isLoading() && (!selectedExerciseId() || filteredProgressData().length === 0)) {
          <div class="text-center py-12 px-4 text-slate-400 dark:text-slate-500">
            <svg class="w-12 h-12 mx-auto mb-3 stroke-current opacity-40" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p class="text-sm font-medium text-slate-600 dark:text-slate-300">
              {{ selectedExerciseId() ? 'No workout history found for this time range' : 'Select an exercise above to view progression' }}
            </p>
          </div>
        }

        <!-- Canvas Chart -->
        @if (!isLoading() && selectedExerciseId() && filteredProgressData().length > 0) {
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
  private route = inject(ActivatedRoute);

  exercises = signal<Exercise[]>([]);
  selectedExerciseId = signal<string>('');
  searchTerm = signal<string>('');
  isDropdownOpen = signal<boolean>(false);
  selectedTimeRange = signal<string>('ALL');

  progressData = signal<ExerciseProgressEntry[]>([]);
  filteredProgressData = computed(() => {
    const data = this.progressData();
    const range = this.selectedTimeRange();
    if (range === 'ALL') return data;

    const now = new Date();
    const cutoff = new Date();
    
    switch (range) {
      case '1W': cutoff.setDate(now.getDate() - 7); break;
      case '1M': cutoff.setMonth(now.getMonth() - 1); break;
      case '3M': cutoff.setMonth(now.getMonth() - 3); break;
      case '6M': cutoff.setMonth(now.getMonth() - 6); break;
      case '1Y': cutoff.setFullYear(now.getFullYear() - 1); break;
    }
    
    return data.filter(d => new Date(d.sessionDate).getTime() >= cutoff.getTime());
  });

  isLoading = signal<boolean>(false);

  selectedExercise = computed(() => {
    return this.exercises().find(e => e.id === this.selectedExerciseId());
  });

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

  bestSetVolumeWeight = computed(() => {
    const data = this.filteredProgressData();
    if (!data.length) return 0;
    
    let bestWeight = 0;
    let maxVol = 0;
    for (const d of data) {
      const weight = d.bestSetVolumeWeightKg ?? 0;
      const reps = d.bestSetVolumeReps ?? 0;
      const vol = weight * reps;
      if (vol > maxVol) {
        maxVol = vol;
        bestWeight = weight;
      }
    }
    return bestWeight;
  });

  bestSetVolumeReps = computed(() => {
    const data = this.filteredProgressData();
    if (!data.length) return 0;
    
    let bestReps = 0;
    let maxVol = 0;
    for (const d of data) {
      const weight = d.bestSetVolumeWeightKg ?? 0;
      const reps = d.bestSetVolumeReps ?? 0;
      const vol = weight * reps;
      if (vol > maxVol) {
        maxVol = vol;
        bestReps = reps;
      }
    }
    return bestReps;
  });

  totalSessions = computed(() => this.filteredProgressData().length);

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
      yReps: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: { display: false },
        ticks: { color: '#10b981' },
        title: { display: true, text: 'Reps', color: '#10b981' }
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
      
      const current = this.filteredProgressData();
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

  onTimeRangeChange(range: string) {
    this.selectedTimeRange.set(range);
    this.updateChart(this.filteredProgressData());
  }

  private loadExercises() {
    this.exerciseService.getExercises().subscribe({
      next: (exercises) => {
        const sorted = [...exercises].sort((a, b) => a.name.localeCompare(b.name));
        this.exercises.set(sorted);
        
        const queryParams = this.route.snapshot.queryParams;
        if (queryParams['exerciseId']) {
          const found = sorted.find(e => e.id === queryParams['exerciseId']);
          if (found) {
            this.selectExercise(found);
            return;
          }
        }
        
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
        // The effect or computed change will trigger an update if needed, but we explicitly update the chart here
        this.updateChart(this.filteredProgressData());
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
      if (scalesMap['yReps']) {
        scalesMap['yReps'].ticks = { ...scalesMap['yReps'].ticks, color: negColor };
        scalesMap['yReps'].title = { ...scalesMap['yReps'].title, color: negColor };
      }
    }

    const labels = entries.map(e => {
      const d = new Date(e.sessionDate);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    });

    const maxWeights = entries.map(e => e.maxWeightKg);
    const reps = entries.map(e => e.maxWeightReps ?? 0);

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
          label: 'Reps',
          data: reps,
          yAxisID: 'yReps',
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

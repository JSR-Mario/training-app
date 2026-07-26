import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { AnalyticsService } from '../../services/analytics.service';
import { ExerciseService } from '../../../exercises/services/exercise.service';
import { ExerciseProgressEntry } from '../../../../core/types/analytics.types';
import { Exercise } from '../../../../core/types/training.types';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-exercise-progress-chart',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  template: `
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
      <!-- Top Bar: Title & Exercise Selector -->
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

        <div class="w-full sm:w-72">
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Select Exercise
          </label>
          <select 
            [ngModel]="selectedExerciseId()" 
            (ngModelChange)="onExerciseChange($event)"
            class="w-full text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent-pos focus:outline-none transition-all">
            <option value="" disabled>-- Select an exercise --</option>
            <option *ngFor="let ex of exercises()" [value]="ex.id">
              {{ ex.name }} {{ ex.equipmentBrand ? '(' + ex.equipmentBrand + ')' : '' }}
            </option>
          </select>
        </div>
      </div>

      <!-- Stat Badges -->
      <div *ngIf="selectedExerciseId() && !isLoading()" class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-lg p-3.5 flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-sm">
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
          <div class="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
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

      <!-- Chart Container -->
      <div class="relative min-h-[320px] flex items-center justify-center">
        <!-- Loading Spinner -->
        <div *ngIf="isLoading()" class="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-slate-900/70 z-10 rounded-lg">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-pos"></div>
        </div>

        <!-- Empty State -->
        <div *ngIf="!isLoading() && (!selectedExerciseId() || progressData().length === 0)" class="text-center py-12 px-4 text-slate-400 dark:text-slate-500">
          <svg class="w-12 h-12 mx-auto mb-3 stroke-current opacity-40" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p class="text-sm font-medium text-slate-600 dark:text-slate-300">
            {{ selectedExerciseId() ? 'No workout history found for this exercise' : 'Select an exercise above to view progression' }}
          </p>
        </div>

        <!-- Canvas Chart -->
        <div *ngIf="!isLoading() && selectedExerciseId() && progressData().length > 0" class="w-full h-[340px]">
          <canvas 
            baseChart
            [data]="chartData"
            [options]="chartOptions"
            [type]="chartType">
          </canvas>
        </div>
      </div>
    </div>
  `,
  styles: ``
})
export class ExerciseProgressChartComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);
  private exerciseService = inject(ExerciseService);

  exercises = signal<Exercise[]>([]);
  selectedExerciseId = signal<string>('');
  progressData = signal<ExerciseProgressEntry[]>([]);
  isLoading = signal<boolean>(false);

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
        ticks: { color: '#8b5cf6' },
        title: { display: true, text: 'Max Weight (kg)', color: '#8b5cf6' }
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

  ngOnInit() {
    this.loadExercises();
  }

  private loadExercises() {
    this.exerciseService.getExercises().subscribe({
      next: (exercises) => {
        const sorted = [...exercises].sort((a, b) => a.name.localeCompare(b.name));
        this.exercises.set(sorted);
        if (sorted.length > 0) {
          this.onExerciseChange(sorted[0].id);
        }
      },
      error: (err) => console.error('Error loading exercises', err)
    });
  }

  onExerciseChange(exerciseId: string) {
    if (!exerciseId) return;
    this.selectedExerciseId.set(exerciseId);
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
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          borderWidth: 3,
          tension: 0.3,
          fill: true,
          pointBackgroundColor: '#8b5cf6',
          pointBorderColor: '#0f172a',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        },
        {
          label: 'Total Volume (kg)',
          data: volumes,
          yAxisID: 'yVolume',
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          borderWidth: 2.5,
          borderDash: [4, 4],
          tension: 0.3,
          fill: false,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#0f172a',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    };
  }
}

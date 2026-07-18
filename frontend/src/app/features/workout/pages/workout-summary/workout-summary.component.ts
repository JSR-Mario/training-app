import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { WorkoutService } from '../../services/workout.service';
import { ProgramService } from '../../../programs/services/program.service';
import { 
  WorkoutSessionResponse, 
  WorkoutSetResponse,
  DayExercise 
} from '../../../../core/types/training.types';
import { ExerciseProgressEntry } from '../../../../core/types/analytics.types';
import { AnalyticsService } from '../../../analytics/services/analytics.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { forkJoin } from 'rxjs';

@Component({
  standalone: true,
    selector: 'app-workout-summary',
    imports: [CommonModule, RouterModule, BaseChartDirective],
    template: `
    <div class="max-w-2xl mx-auto space-y-6 pt-8 pb-24 text-center">
    
      @if (isLoading()) {
        <div class="py-12">
          <div class="animate-pulse flex flex-col items-center">
            <div class="h-8 w-8 bg-accent-pos rounded-full mb-4"></div>
            <p class="text-gray-500 dark:text-gray-400">Loading summary...</p>
          </div>
        </div>
      }
    
      @if (!isLoading() && session()) {
        <div class="space-y-8 animate-fade-in-up">
          <!-- Celebration Header -->
          <div class="flex flex-col items-center">
            <div class="mb-5 flex items-center justify-center w-20 h-20 bg-accent-pos/10 rounded-full border border-accent-pos/20 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-accent-pos" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h1 class="text-4xl font-extrabold text-black dark:text-white text-center tracking-tight">
              Workout Complete
            </h1>
            <p class="text-gray-500 dark:text-gray-400 mt-2 text-lg text-center">Great job crushing your <span class="text-gray-800 dark:text-gray-200 font-semibold">{{ session()?.dayTemplateName }}</span> workout.</p>
          </div>
          <!-- Stats Grid -->
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div class="solid-card p-6 rounded-2xl border border-gray-300 dark:border-gray-700">
              <p class="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Total Volume</p>
              <p class="text-3xl font-bold text-black dark:text-white">{{ totalVolumeKg() | number:'1.0-1' }} <span class="text-gray-500 text-lg">kg</span></p>
            </div>
            <div class="solid-card p-6 rounded-2xl border border-gray-300 dark:border-gray-700">
              <p class="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Sets Completed</p>
              <p class="text-3xl font-bold text-black dark:text-white">{{ loggedSets().length }}</p>
            </div>
            @if (getSessionDurationMinutes()) {
              <div class="solid-card p-6 rounded-2xl border border-gray-300 dark:border-gray-700 col-span-2 md:col-span-1">
                <p class="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Duration</p>
                <p class="text-3xl font-bold text-black dark:text-white">{{ getSessionDurationMinutes() }} <span class="text-gray-500 text-lg">min</span></p>
              </div>
            }
          </div>
          
          <!-- Chart -->
          @if (chartData) {
            <div class="solid-card p-6 border border-gray-300 dark:border-gray-700">
              <h2 class="text-xl font-bold text-black dark:text-white mb-4 text-left">Volume History</h2>
              <div class="h-64 relative">
                <canvas baseChart 
                  [data]="chartData" 
                  [options]="chartOptions" 
                  [type]="'bar'">
                </canvas>
              </div>
            </div>
          }

          <!-- Details -->
          <div class="solid-card p-6 text-left space-y-4 border border-gray-300 dark:border-gray-700">
            <h2 class="text-xl font-bold text-black dark:text-white border-b border-gray-300 dark:border-gray-700 pb-2">Summary</h2>
            @for (ex of exercises(); track ex) {
              <div class="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-800 last:border-0">
                <div>
                  <p class="text-gray-800 dark:text-gray-200 font-medium">
                    {{ ex.exerciseName || 'Exercise ' + ex.exerciseId }}
                    @if (hasPrForExercise(ex.id)) {
                      <span class="ml-2 text-[10px] uppercase font-bold text-accent-pos bg-accent-pos/10 px-1.5 py-0.5 rounded border border-accent-pos/20">PR!</span>
                    }
                  </p>
                  <p class="text-gray-500 text-sm">{{ getSetsForExercise(ex.id).length }} sets completed</p>
                </div>
                <div class="text-right">
                  <p class="text-accent-pos font-bold">{{ getVolumeForExercise(ex.id) | number:'1.0-1' }} kg</p>
                </div>
              </div>
            }
          </div>
          <!-- Actions -->
          <div class="pt-4">
            <a
              routerLink="/workout"
              class="inline-block px-8 py-3 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-black dark:text-white font-bold rounded-xl transition-colors border border-gray-300 dark:border-gray-700 solid-btn"
              >
              Done
            </a>
          </div>
        </div>
      }
    
    </div>
    `,
    styles: [`
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in-up {
      animation: fadeInUp 0.6s ease-out forwards;
    }
  `]
})
export class WorkoutSummaryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private workoutService = inject(WorkoutService);
  private programService = inject(ProgramService);
  private analyticsService = inject(AnalyticsService);

  sessionId = signal<string | null>(null);
  session = signal<WorkoutSessionResponse | null>(null);
  exercises = signal<DayExercise[]>([]);
  loggedSets = signal<WorkoutSetResponse[]>([]);
  
  isLoading = signal<boolean>(true);

  chartData: ChartConfiguration['data'] | null = null;
  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { 
        beginAtZero: true, 
        grid: { color: 'rgba(128, 128, 128, 0.1)' }
      }
    }
  };

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.sessionId.set(params.get('id'));
      if (this.sessionId()) {
        this.loadSummaryData();
      }
    });
  }

  loadSummaryData() {
    const id = this.sessionId();
    if (!id) return;

    this.isLoading.set(true);
    
    this.workoutService.getSession(id).subscribe({
      next: (sess) => {
        this.session.set(sess);
        
        this.workoutService.getSets(id).subscribe({
          next: (sets) => {
            this.loggedSets.set(sets);
            
            this.workoutService.getSessionExercises(id).subscribe({
              next: (exs) => {
                const mappedExercises: DayExercise[] = exs.map(e => ({
                  id: e.id,
                  exerciseId: e.exercise.id,
                  exerciseName: e.exercise.name,
                  sets: e.sets,
                  reps: e.reps,
                  repsMax: e.repsMax,
                  sortOrder: e.sortOrder,
                  isAmrap: e.isAmrap,
                  unilateral: e.exercise.unilateral,
                  isBodyweight: e.exercise.isBodyweight
                }));
                this.exercises.set(mappedExercises.sort((a, b) => a.sortOrder - b.sortOrder));
                this.buildChartData();
                this.isLoading.set(false);
              },
              error: (err) => {
                console.error('Failed to load exercises', err);
                this.isLoading.set(false);
              }
            });
          },
          error: (err) => {
            console.error('Failed to load sets', err);
            this.isLoading.set(false);
          }
        });
      },
      error: (err) => {
        console.error('Failed to load session', err);
        this.isLoading.set(false);
      }
    });
  }

  buildChartData() {
    const exs = this.exercises();
    if (exs.length === 0) return;
    
    const obs = exs.map(ex => this.analyticsService.getExerciseProgress(ex.exerciseId));
    
    forkJoin(obs).subscribe((results: ExerciseProgressEntry[][]) => {
      const dayId = this.session()?.dayTemplateId;
      if (!dayId) return;

      const volumeByDate = new Map<string, number>();
      
      results.forEach((entries: ExerciseProgressEntry[]) => {
        entries.forEach((entry: ExerciseProgressEntry) => {
          if (entry.dayTemplateId === dayId) {
            const current = volumeByDate.get(entry.sessionDate) || 0;
            volumeByDate.set(entry.sessionDate, current + entry.totalVolumeKg);
          }
        });
      });
      
      const sortedDates = Array.from(volumeByDate.keys()).sort();
      if (sortedDates.length === 0) return;
      
      // Get the CSS variable for accent-pos or fallback
      const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-pos').trim() || '#8b5cf6';
      
      const currentSessionAt = this.session()?.startedAt;
      let currentSessionDate: string | null = null;
      if (currentSessionAt) {
        // Safely extract YYYY-MM-DD in local or UTC depending on how it's stored.
        // Assuming sessionDate is YYYY-MM-DD and startedAt is ISO 8601.
        currentSessionDate = currentSessionAt.substring(0, 10);
      }
      
      const bgColors = sortedDates.map(d => 
        d === currentSessionDate ? accentColor : 'rgba(128, 128, 128, 0.3)'
      );

      this.chartData = {
        labels: sortedDates,
        datasets: [{
          data: sortedDates.map(d => volumeByDate.get(d)!),
          backgroundColor: bgColors,
          borderRadius: 4
        }]
      };
    });
  }

  getSetsForExercise(exerciseId: string): WorkoutSetResponse[] {
    return this.loggedSets().filter(s => s.sessionExerciseId === exerciseId);
  }

  getVolumeForExercise(exerciseId: string): number {
    return this.getSetsForExercise(exerciseId)
      .reduce((sum, set) => {
        const reps = Number(set.repsCompleted || 0) + Number(set.repsCompletedRight || 0);
        return sum + (Number(set.weightKg || 0) * reps);
      }, 0);
  }

  hasPrForExercise(exerciseId: string): boolean {
    return this.getSetsForExercise(exerciseId).some(s => s.isNewPr);
  }

  getSessionDurationMinutes(): number | null {
    const session = this.session();
    if (!session || !session.startedAt || !session.completedAt) return null;
    const start = new Date(session.startedAt).getTime();
    const end = new Date(session.completedAt).getTime();
    const diff = end - start;
    return Math.max(1, Math.round(diff / 60000));
  }

  totalVolumeKg() {
    return this.loggedSets()
      .reduce((sum, set) => {
        const reps = Number(set.repsCompleted || 0) + Number(set.repsCompletedRight || 0);
        return sum + (Number(set.weightKg || 0) * reps);
      }, 0);
  }
}

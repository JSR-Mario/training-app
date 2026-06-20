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

@Component({
  selector: 'app-workout-summary',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="max-w-2xl mx-auto space-y-6 pt-8 pb-24 text-center">
      
      <div *ngIf="isLoading()" class="py-12">
        <div class="animate-pulse flex flex-col items-center">
          <div class="h-8 w-8 bg-blue-500 rounded-full mb-4"></div>
          <p class="text-gray-400">Loading summary...</p>
        </div>
      </div>

      <div *ngIf="!isLoading() && session()" class="space-y-8 animate-fade-in-up">
        
        <!-- Celebration Header -->
        <div>
          <div class="text-6xl mb-4">🏆</div>
          <h1 class="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
            Workout Complete!
          </h1>
          <p class="text-gray-400 mt-2 text-lg">Great job crushing your {{ session()?.dayTemplateName }} workout.</p>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-2 gap-4">
          <div class="glass-card p-6 rounded-2xl border border-gray-700/50 bg-gray-800/30">
            <p class="text-gray-400 text-sm font-medium mb-1">Total Volume</p>
            <p class="text-3xl font-bold text-white">{{ totalVolumeKg() | number:'1.0-1' }} <span class="text-gray-500 text-lg">kg</span></p>
          </div>
          
          <div class="glass-card p-6 rounded-2xl border border-gray-700/50 bg-gray-800/30">
            <p class="text-gray-400 text-sm font-medium mb-1">Sets Completed</p>
            <p class="text-3xl font-bold text-white">{{ loggedSets().length }}</p>
          </div>
        </div>

        <!-- Details -->
        <div class="glass-card p-6 text-left space-y-4">
          <h2 class="text-xl font-bold text-white border-b border-gray-700 pb-2">Summary</h2>
          
          <div *ngFor="let ex of exercises()" class="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
            <div>
              <p class="text-gray-200 font-medium">{{ ex.exerciseName || 'Exercise ' + ex.exerciseId }}</p>
              <p class="text-gray-500 text-sm">{{ getSetsForExercise(ex.id).length }} sets completed</p>
            </div>
            <div class="text-right">
              <p class="text-blue-400 font-bold">{{ getVolumeForExercise(ex.id) | number:'1.0-1' }} kg</p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="pt-4">
          <a 
            routerLink="/workout"
            class="inline-block px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-colors border border-gray-700"
          >
            Back to Dashboard
          </a>
        </div>

      </div>

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

  sessionId = signal<string | null>(null);
  session = signal<WorkoutSessionResponse | null>(null);
  exercises = signal<DayExercise[]>([]);
  loggedSets = signal<WorkoutSetResponse[]>([]);
  
  isLoading = signal<boolean>(true);

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
            
            this.programService.getDayExercises(sess.dayTemplateId).subscribe({
              next: (exs) => {
                this.exercises.set(exs.sort((a, b) => a.sortOrder - b.sortOrder));
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

  getSetsForExercise(exerciseId: string): WorkoutSetResponse[] {
    return this.loggedSets().filter(s => s.dayExerciseId === exerciseId);
  }

  getVolumeForExercise(exerciseId: string): number {
    return this.getSetsForExercise(exerciseId)
      .reduce((sum, set) => sum + (Number(set.weightKg) * set.repsCompleted), 0);
  }

  totalVolumeKg() {
    return this.loggedSets()
      .reduce((sum, set) => sum + (Number(set.weightKg) * set.repsCompleted), 0);
  }
}

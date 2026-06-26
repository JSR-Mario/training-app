import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { WorkoutService } from '../../services/workout.service';
import { ProgramService } from '../../../programs/services/program.service';
import { 
  WorkoutSessionResponse, 
  WorkoutSetResponse,
  DayExercise 
} from '../../../../core/types/training.types';

@Component({
  selector: 'app-active-workout',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="max-w-2xl mx-auto space-y-6 pt-4 pb-32">
      
      <!-- Header -->
      <div class="flex items-center justify-between">
        <a routerLink="/workout" class="text-blue-400 hover:text-blue-300 text-sm inline-block">&larr; Back</a>
        <div *ngIf="session()?.completedAt" class="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
          Completed
        </div>
      </div>

      <div *ngIf="isLoading()" class="text-center py-12">
        <div class="animate-pulse flex flex-col items-center">
          <div class="h-8 w-8 bg-blue-500 rounded-full mb-4"></div>
          <p class="text-gray-400">Loading workout...</p>
        </div>
      </div>

      <div *ngIf="!isLoading() && session()">
        <h1 class="text-3xl font-bold text-white mb-1">{{ session()?.dayTemplateName }}</h1>
        <p class="text-gray-400 text-sm mb-6">Week {{ session()?.weekNumber }} &bull; {{ session()?.performedOn | date:'mediumDate' }}</p>

        <!-- Exercises List -->
        <div class="space-y-8">
          
          <div *ngIf="exercises().length === 0" class="text-center py-12 glass-card">
            <p class="text-gray-400">This workout day has no exercises configured.</p>
          </div>

          <div *ngFor="let ex of exercises(); let i = index" class="glass-card p-4 sm:p-6 overflow-hidden relative">
            <!-- Exercise Header -->
            <div class="flex items-start justify-between mb-4 border-b border-gray-700/50 pb-4">
              <div>
                <h2 class="text-xl font-bold text-white"><span class="text-blue-500 mr-2">{{i + 1}}.</span> {{ ex.exerciseName || 'Exercise ' + ex.exerciseId }}</h2>
                <p *ngIf="!ex.durationMinutes" class="text-gray-400 text-sm mt-1">Goal: {{ ex.sets }} sets × {{ ex.reps }} reps</p>
                <p *ngIf="ex.durationMinutes" class="text-gray-400 text-sm mt-1">
                  Goal: {{ ex.durationMinutes }} min 
                  <span *ngIf="ex.incline"> • Inc: {{ ex.incline }}</span> 
                  <span *ngIf="ex.resistance"> • Res: {{ ex.resistance }}</span>
                </p>
              </div>
            </div>

            <!-- Logged Sets -->
            <div class="space-y-3 mb-4">
              <div *ngFor="let set of getSetsForExercise(ex.id)" class="flex items-center justify-between bg-gray-800/40 p-3 rounded-lg border border-gray-700">
                <div class="flex items-center gap-4">
                  <span *ngIf="!ex.durationMinutes" class="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs font-bold border border-blue-500/30">
                    {{ set.setNumber }}
                  </span>
                  <span *ngIf="ex.durationMinutes" class="px-2 py-1 rounded bg-purple-600/20 text-purple-400 text-xs font-bold border border-purple-500/30 uppercase">
                    Log
                  </span>
                  <div class="text-gray-200 font-medium">
                    <ng-container *ngIf="!ex.durationMinutes">
                      {{ set.weightKg }} <span class="text-gray-500 text-xs uppercase">kg</span> × {{ set.repsCompleted }} <span class="text-gray-500 text-xs uppercase">reps</span>
                    </ng-container>
                    <ng-container *ngIf="ex.durationMinutes">
                      {{ set.durationMinutes }} <span class="text-gray-500 text-xs uppercase">min</span>
                      <span *ngIf="set.incline" class="ml-2 text-gray-400 text-xs">Inc: {{ set.incline }}</span>
                      <span *ngIf="set.resistance" class="ml-2 text-gray-400 text-xs">Res: {{ set.resistance }}</span>
                    </ng-container>
                  </div>
                </div>
                <button 
                  *ngIf="!session()?.completedAt"
                  (click)="deleteSet(set.id)"
                  class="text-gray-500 hover:text-red-400 transition-colors p-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Log New Set Form -->
            <div *ngIf="!session()?.completedAt" class="bg-gray-900/50 p-4 rounded-xl border border-gray-700">
              <form [formGroup]="getForm(ex.id)" (ngSubmit)="logSet(ex)" class="flex items-end gap-3 flex-wrap">
                
                <ng-container *ngIf="!ex.durationMinutes">
                  <div class="flex-1 min-w-[80px]">
                    <label [for]="'weight-' + ex.id" class="block text-xs font-medium text-gray-400 mb-1">Weight (kg)</label>
                    <input [id]="'weight-' + ex.id" type="number" inputmode="decimal" step="0.5" min="0" formControlName="weightKg" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white text-lg font-bold text-center">
                  </div>
                  <div class="flex-1 min-w-[80px]">
                    <label [for]="'reps-' + ex.id" class="block text-xs font-medium text-gray-400 mb-1">Reps</label>
                    <input [id]="'reps-' + ex.id" type="number" inputmode="numeric" min="0" formControlName="repsCompleted" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white text-lg font-bold text-center">
                  </div>
                </ng-container>

                <ng-container *ngIf="ex.durationMinutes">
                  <div class="flex-1 min-w-[70px]">
                    <label [for]="'dur-' + ex.id" class="block text-xs font-medium text-gray-400 mb-1">Time(m)</label>
                    <input [id]="'dur-' + ex.id" type="number" min="0" formControlName="durationMinutes" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white text-base font-bold text-center">
                  </div>
                  <div class="flex-1 min-w-[70px]">
                    <label [for]="'inc-' + ex.id" class="block text-xs font-medium text-gray-400 mb-1">Incline</label>
                    <input [id]="'inc-' + ex.id" type="number" step="0.1" formControlName="incline" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white text-base font-bold text-center">
                  </div>
                  <div class="flex-1 min-w-[70px]">
                    <label [for]="'res-' + ex.id" class="block text-xs font-medium text-gray-400 mb-1">Resis.</label>
                    <input [id]="'res-' + ex.id" type="number" step="0.1" formControlName="resistance" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white text-base font-bold text-center">
                  </div>
                </ng-container>

                <div class="w-full sm:w-auto mt-2 sm:mt-0">
                  <button type="submit" [disabled]="getForm(ex.id).invalid || isLoggingSet()" class="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-md disabled:opacity-50 transition-colors h-[42px]">
                    Log
                  </button>
                </div>
              </form>
            </div>
            
            <!-- Progress Bar inside Exercise Card -->
            <div class="mt-4 h-1 w-full bg-gray-800 rounded-full overflow-hidden mb-4">
              <div 
                class="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
                [style.width.%]="(getSetsForExercise(ex.id).length / ex.sets) * 100"
              ></div>
            </div>

            <!-- Rating Section -->
            <div *ngIf="!session()?.completedAt" class="pt-4 border-t border-gray-700/50 mt-4">
              <div class="flex gap-1 sm:gap-1.5 justify-between sm:justify-start w-full">
                <button 
                  *ngFor="let r of [1,2,3,4,5,6,7,8,9,10]" 
                  (click)="setRating(ex.id, r)"
                  [class.bg-blue-600]="getRating(ex.id) === r"
                  [class.text-white]="getRating(ex.id) === r"
                  [class.bg-gray-800]="getRating(ex.id) !== r"
                  [class.text-gray-400]="getRating(ex.id) !== r"
                  class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-xs font-bold hover:bg-blue-500 hover:text-white transition-colors"
                >
                  {{ r }}
                </button>
              </div>
            </div>

          </div>
        </div>

        <!-- Session Notes -->
        <div class="glass-card p-6 mt-8">
          <h3 class="text-xl font-bold text-white mb-2">Session Notes</h3>
          <p class="text-sm text-gray-400 mb-4">Any specific thoughts or things to remember next time?</p>
          <textarea 
            [formControl]="notesControl"
            (blur)="saveNotes()"
            placeholder="Type your notes here..."
            class="w-full h-32 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-white text-sm resize-none"
          ></textarea>
          <div class="flex justify-end mt-2">
            <span *ngIf="isSavingNotes()" class="text-xs text-blue-400">Saving...</span>
            <span *ngIf="savedNotesSuccess()" class="text-xs text-green-400">Saved!</span>
          </div>
        </div>
      </div>
      
      <!-- Fixed Bottom Action Bar -->
      <div *ngIf="!isLoading() && session() && !session()?.completedAt" class="fixed bottom-0 left-0 right-0 p-4 bg-gray-900/90 backdrop-blur-md border-t border-gray-800 shadow-2xl z-50">
        <div class="max-w-2xl mx-auto flex gap-4">
          <button 
            (click)="completeWorkout()"
            [disabled]="isCompleting()"
            class="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold text-lg rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 transition-all transform hover:scale-[1.02] active:scale-95"
          >
            {{ isCompleting() ? 'Completing...' : 'Finish Workout 🎉' }}
          </button>
        </div>
      </div>

    </div>
  `
})
export class ActiveWorkoutComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private workoutService = inject(WorkoutService);
  private programService = inject(ProgramService);
  private fb = inject(FormBuilder);

  sessionId = signal<string | null>(null);
  session = signal<WorkoutSessionResponse | null>(null);
  exercises = signal<DayExercise[]>([]);
  loggedSets = signal<WorkoutSetResponse[]>([]);
  
  isLoading = signal<boolean>(true);
  isLoggingSet = signal<boolean>(false);
  isCompleting = signal<boolean>(false);
  isSavingNotes = signal<boolean>(false);
  savedNotesSuccess = signal<boolean>(false);

  notesControl = new FormControl('');

  // Map of exerciseId -> FormGroup
  forms = new Map<string, FormGroup>();

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.sessionId.set(params.get('id'));
      if (this.sessionId()) {
        this.loadWorkoutData();
      }
    });
  }

  loadWorkoutData() {
    const id = this.sessionId();
    if (!id) return;

    this.isLoading.set(true);
    
    this.workoutService.getSession(id).subscribe({
      next: (sess) => {
        this.session.set(sess);
        if (sess.notes) {
          this.notesControl.setValue(sess.notes, { emitEvent: false });
        }
        
        // Load sets
        this.workoutService.getSets(id).subscribe({
          next: (sets) => {
            this.loggedSets.set(sets);
            
            // Load exercises for the day template
            this.programService.getDayExercises(sess.dayTemplateId).subscribe({
              next: (exs) => {
                const sorted = exs.sort((a, b) => a.sortOrder - b.sortOrder);
                this.exercises.set(sorted);
                this.initForms(sorted);
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

  initForms(exercises: DayExercise[]) {
    exercises.forEach(ex => {
      const setsForEx = this.getSetsForExercise(ex.id);
      
      if (ex.durationMinutes != null) {
        let defaultDuration = ex.durationMinutes;
        let defaultIncline = ex.incline || 0;
        let defaultResistance = ex.resistance || 0;

        if (setsForEx.length > 0) {
          const lastSet = setsForEx[setsForEx.length - 1];
          defaultDuration = lastSet.durationMinutes ?? defaultDuration;
          defaultIncline = lastSet.incline ?? defaultIncline;
          defaultResistance = lastSet.resistance ?? defaultResistance;
        }

        this.forms.set(ex.id, this.fb.group({
          durationMinutes: [defaultDuration, [Validators.required, Validators.min(0)]],
          incline: [defaultIncline],
          resistance: [defaultResistance]
        }));
      } else {
        let defaultWeight = '';
        let defaultReps = ex.reps;

        if (setsForEx.length > 0) {
          const lastSet = setsForEx[setsForEx.length - 1];
          defaultWeight = lastSet.weightKg?.toString() || '';
          defaultReps = lastSet.repsCompleted || ex.reps;
        }

        this.forms.set(ex.id, this.fb.group({
          weightKg: [defaultWeight, [Validators.required, Validators.min(0)]],
          repsCompleted: [defaultReps, [Validators.required, Validators.min(0)]]
        }));
      }
    });
  }

  getForm(exerciseId: string): FormGroup {
    return this.forms.get(exerciseId) as FormGroup;
  }

  getSetsForExercise(exerciseId: string): WorkoutSetResponse[] {
    return this.loggedSets()
      .filter(s => s.dayExerciseId === exerciseId)
      .sort((a, b) => a.setNumber - b.setNumber);
  }

  logSet(ex: DayExercise) {
    const id = this.sessionId();
    if (!id || this.isLoggingSet() || this.session()?.completedAt) return;

    const form = this.getForm(ex.id);
    if (form.invalid) return;

    this.isLoggingSet.set(true);

    const currentSets = this.getSetsForExercise(ex.id);
    const setNumber = currentSets.length > 0 ? currentSets[currentSets.length - 1].setNumber + 1 : 1;

    const request = {
      dayExerciseId: ex.id,
      setNumber: setNumber,
      repsCompleted: ex.durationMinutes != null ? undefined : form.value.repsCompleted,
      weightKg: ex.durationMinutes != null ? undefined : form.value.weightKg,
      durationMinutes: ex.durationMinutes != null ? form.value.durationMinutes : undefined,
      incline: ex.durationMinutes != null ? form.value.incline : undefined,
      resistance: ex.durationMinutes != null ? form.value.resistance : undefined
    };

    this.workoutService.logSet(id, request).subscribe({
      next: (newSet) => {
        this.loggedSets.update(sets => [...sets, newSet]);
        // Keep the form values so the user can easily log the next set with the same weight/reps
        this.isLoggingSet.set(false);
      },
      error: (err) => {
        console.error('Error logging set', err);
        this.isLoggingSet.set(false);
        alert('Failed to log set. Check connection.');
      }
    });
  }

  deleteSet(setId: string) {
    if (confirm('Delete this set?')) {
      this.workoutService.deleteSet(setId).subscribe({
        next: () => {
          this.loggedSets.update(sets => sets.filter(s => s.id !== setId));
        },
        error: (err) => console.error('Error deleting set', err)
      });
    }
  }

  completeWorkout() {
    const id = this.sessionId();
    if (!id) return;

    if (confirm('Are you sure you are done? This will finalize the workout and update analytics.')) {
      this.isCompleting.set(true);
      // Ensure notes are saved before completing if changed
      this.saveNotes();

      this.workoutService.completeSession(id).subscribe({
        next: () => {
          this.isCompleting.set(false);
          this.router.navigate(['/workout', id, 'summary']);
        },
        error: (err) => {
          console.error('Error completing session', err);
          this.isCompleting.set(false);
          alert('Failed to complete session.');
        }
      });
    }
  }

  saveNotes() {
    const id = this.sessionId();
    const notes = this.notesControl.value;
    const currentNotes = this.session()?.notes || '';
    
    if (!id || this.session()?.completedAt) return;
    if (notes === currentNotes && !this.isSavingNotes()) return; // Don't save if no change

    this.isSavingNotes.set(true);
    this.savedNotesSuccess.set(false);

    this.workoutService.updateSessionNotes(id, notes || '').subscribe({
      next: (updatedSession) => {
        this.session.set(updatedSession);
        this.isSavingNotes.set(false);
        this.savedNotesSuccess.set(true);
        setTimeout(() => this.savedNotesSuccess.set(false), 2000);
      },
      error: (err) => {
        console.error('Error saving notes', err);
        this.isSavingNotes.set(false);
      }
    });
  }

  getRating(dayExerciseId: string): number | null {
    const session = this.session();
    if (!session || !session.ratings) return null;
    const ratingObj = session.ratings.find(r => r.dayExerciseId === dayExerciseId);
    return ratingObj ? ratingObj.rating : null;
  }

  setRating(dayExerciseId: string, rating: number) {
    const id = this.sessionId();
    if (!id || this.session()?.completedAt) return;

    this.workoutService.updateExerciseRating(id, dayExerciseId, rating).subscribe({
      next: (updatedSession) => {
        this.session.set(updatedSession);
      },
      error: (err) => {
        console.error('Error saving rating', err);
      }
    });
  }
}

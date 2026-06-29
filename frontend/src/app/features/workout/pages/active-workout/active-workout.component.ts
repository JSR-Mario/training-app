import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { WorkoutService } from '../../services/workout.service';
import { ProgramService } from '../../../programs/services/program.service';
import { 
  WorkoutSessionResponse, 
  WorkoutSetResponse,
  DayExercise,
  Exercise
} from '../../../../core/types/training.types';
import { ExerciseSearchComponent } from '../../../exercises/components/exercise-search/exercise-search.component';

@Component({
  standalone: true,
    selector: 'app-active-workout',
    imports: [CommonModule, RouterModule, ReactiveFormsModule, ExerciseSearchComponent],
    template: `
    <div class="max-w-2xl mx-auto space-y-6 pt-4 pb-32">
    
      <!-- Header -->
      <div class="flex items-center justify-between">
        <a [routerLink]="['/workout']" [queryParams]="{ skipRedirect: true }" class="text-blue-400 hover:text-blue-300 text-sm inline-block">&larr; Back</a>
        @if (session()?.completedAt) {
          <div class="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
            Completed
          </div>
        }
      </div>
    
      @if (isLoading()) {
        <div class="text-center py-12">
          <div class="animate-pulse flex flex-col items-center">
            <div class="h-8 w-8 bg-blue-500 rounded-full mb-4"></div>
            <p class="text-gray-400">Loading workout...</p>
          </div>
        </div>
      }
    
      @if (!isLoading() && session()) {
        <div>
          <h1 class="text-3xl font-bold text-white mb-1">{{ session()?.dayTemplateName }}</h1>
          <p class="text-gray-400 text-sm mb-6">Week {{ session()?.weekNumber }} &bull; {{ session()?.performedOn | date:'mediumDate' }}</p>
          <!-- Exercises List -->
          <div class="space-y-8">
            @if (exercises().length === 0) {
              <div class="text-center py-12 glass-card">
                <p class="text-gray-400">This workout day has no exercises configured.</p>
              </div>
            }
            @for (ex of exercises(); track ex; let i = $index) {
              <div class="glass-card p-4 sm:p-6 overflow-hidden relative">
                <!-- Exercise Header -->
                <div class="flex items-start justify-between mb-4 border-b border-gray-700/50 pb-4">
                  <div>
                    <h2 class="text-xl font-bold text-white"><span class="text-blue-500 mr-2">{{i + 1}}.</span> {{ ex.exerciseName || 'Exercise ' + ex.exerciseId }}</h2>
                    @if (!ex.durationMinutes) {
                      <p class="text-gray-400 text-sm mt-1">Goal: {{ ex.sets }} sets × {{ ex.reps }}{{ ex.repsMax ? '-' + ex.repsMax : '' }} reps</p>
                    }
                    @if (ex.durationMinutes) {
                      <p class="text-gray-400 text-sm mt-1">
                        Goal: {{ ex.durationMinutes }} min
                        @if (ex.incline) {
                          <span> • Inc: {{ ex.incline }}</span>
                        }
                        @if (ex.resistance) {
                          <span> • Res: {{ ex.resistance }}</span>
                        }
                      </p>
                    }
                  </div>
                  <button (click)="toggleCollapse(ex.id)"
                    class="ml-4 p-2 rounded-lg transition-colors border flex items-center justify-center"
                    [ngClass]="isCollapsed(ex.id) ? 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700' : 'bg-green-600/10 border-green-500/30 text-green-500 hover:bg-green-600/20'"
                    [title]="isCollapsed(ex.id) ? 'Expand Exercise' : 'Mark as Done & Collapse'">
                    @if (!isCollapsed(ex.id)) {
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    }
                    @if (isCollapsed(ex.id)) {
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    }
                  </button>
                </div>
                @if (!isCollapsed(ex.id)) {
                  <div>
                    <!-- Last Logged Set -->
                    @if (getLastSetForExercise(ex.id); as set) {
                      <div class="space-y-3 mb-4" [ngStyle]="{'--perf-status': getPerformanceStatus(set, getMaxPerformanceForExercise(ex.id))}">
                        <div class="flex items-center justify-between bg-gray-800/40 p-3 rounded-lg border transition-colors"
                          [ngClass]="getPerfContainerClass(getPerformanceStatus(set, getMaxPerformanceForExercise(ex.id)))">
                          <div class="flex items-center gap-4">
                            @if (!ex.durationMinutes) {
                              <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-colors"
                                [ngClass]="getPerfBadgeClass(getPerformanceStatus(set, getMaxPerformanceForExercise(ex.id)), false)">
                                {{ set.setNumber }}
                              </span>
                            }
                            @if (ex.durationMinutes) {
                              <span class="px-2 py-1 rounded text-xs font-bold border uppercase transition-colors"
                                [ngClass]="getPerfBadgeClass(getPerformanceStatus(set, getMaxPerformanceForExercise(ex.id)), true)">
                                Log
                              </span>
                            }
                            <div class="font-medium transition-colors"
                              [ngClass]="getPerfTextClass(getPerformanceStatus(set, getMaxPerformanceForExercise(ex.id)))">
                              @if (!ex.durationMinutes) {
                                {{ set.weightKg }} <span class="text-xs uppercase" [ngClass]="getPerfSubtextClass(getPerformanceStatus(set, getMaxPerformanceForExercise(ex.id)))">kg</span> ×
                                @if (ex.exercise.unilateral) {
                                  {{ set.repsCompleted }} / {{ set.repsCompletedRight ?? set.repsCompleted }}
                                }
                                @if (!ex.exercise.unilateral) {
                                  {{ set.repsCompleted }}
                                }
                                <span class="text-xs uppercase" [ngClass]="getPerfSubtextClass(getPerformanceStatus(set, getMaxPerformanceForExercise(ex.id)))">reps</span>
                                @if (getPerformanceStatus(set, getMaxPerformanceForExercise(ex.id)) === 'critical') {
                                  <span class="ml-2 text-[10px] uppercase font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">Perf Drop</span>
                                }
                                @if (getPerformanceStatus(set, getMaxPerformanceForExercise(ex.id)) === 'warning') {
                                  <span class="ml-2 text-[10px] uppercase font-bold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">Fatigue</span>
                                }
                              }
                              @if (ex.durationMinutes) {
                                {{ set.durationMinutes }} <span class="text-gray-500 text-xs uppercase">min</span>
                                @if (set.incline) {
                                  <span class="ml-2 text-gray-400 text-xs">Inc: {{ set.incline }}</span>
                                }
                                @if (set.resistance) {
                                  <span class="ml-2 text-gray-400 text-xs">Res: {{ set.resistance }}</span>
                                }
                              }
                            </div>
                          </div>
                          @if (!session()?.completedAt) {
                            <button
                              (click)="deleteSet(set.id)"
                              class="text-gray-500 hover:text-red-400 transition-colors p-2"
                              >
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          }
                        </div>
                      </div>
                    }
                    <!-- Log New Set Form -->
                    @if (!session()?.completedAt) {
                      <div class="bg-gray-900/50 p-4 rounded-xl border border-gray-700">
                        <div class="mb-3 flex items-center justify-between gap-2">
                          <div class="flex items-center gap-2">
                            <span class="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs font-bold border border-blue-500/30">
                              {{ getSetsForExercise(ex.id).length + 1 }}
                            </span>
                            <span class="text-sm font-semibold text-gray-300 uppercase tracking-wide">Next Set</span>
                          </div>
                          @if (getSetsForExercise(ex.id).length >= ex.sets) {
                            <div class="px-2 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-500 text-xs flex items-center gap-1.5">
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                              </svg>
                              Extra set
                            </div>
                          }
                        </div>
                        <form [formGroup]="getForm(ex.id)" (ngSubmit)="logSet(ex)" class="flex items-end gap-3 flex-wrap">
                          @if (!ex.durationMinutes) {
                            <div class="flex-1 min-w-[80px]">
                              <label [for]="'weight-' + ex.id" class="block text-xs font-medium text-gray-400 mb-1">Weight (kg)</label>
                              <input [id]="'weight-' + ex.id" type="number" inputmode="decimal" step="0.5" min="0" formControlName="weightKg" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white text-lg font-bold text-center">
                            </div>
                            <div class="flex-1 min-w-[70px]">
                              <label [for]="'reps-' + ex.id" class="block text-xs font-medium text-gray-400 mb-1">{{ ex.exercise.unilateral ? 'Reps (L)' : 'Reps' }}</label>
                              <input [id]="'reps-' + ex.id" type="number" inputmode="numeric" min="0" formControlName="repsCompleted" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white text-lg font-bold text-center">
                            </div>
                            @if (ex.exercise.unilateral) {
                              <div class="flex-1 min-w-[70px]">
                                <label [for]="'reps-r-' + ex.id" class="block text-xs font-medium text-gray-400 mb-1">Reps (R)</label>
                                <input [id]="'reps-r-' + ex.id" type="number" inputmode="numeric" min="0" formControlName="repsCompletedRight" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white text-lg font-bold text-center" [placeholder]="getForm(ex.id).get('repsCompleted')?.value || ''">
                              </div>
                            }
                          }
                          @if (ex.durationMinutes) {
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
                          }
                          <div class="w-full sm:w-auto mt-2 sm:mt-0">
                            <button type="submit" [disabled]="getForm(ex.id).invalid || isLoggingSet()" class="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-md disabled:opacity-50 transition-colors h-[42px]">
                              Log
                            </button>
                          </div>
                        </form>
                      </div>
                    }
                  </div>
                }
                <!-- Progress Bar inside Exercise Card -->
                <div class="mt-4 h-1 w-full bg-gray-800 rounded-full overflow-hidden mb-4">
                  <div
                    class="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
                    [style.width.%]="(getSetsForExercise(ex.id).length / ex.sets) * 100"
                  ></div>
                </div>
                <!-- Rating Section -->
                @if (!session()?.completedAt) {
                  <div class="pt-4 border-t border-gray-700/50 mt-4">
                    <div class="flex gap-1 sm:gap-1.5 justify-between sm:justify-start w-full">
                      @for (r of [1,2,3,4,5,6,7,8,9,10]; track r) {
                        <button
                          (click)="setRating(ex.id, r)"
                          [class.bg-blue-600]="getRating(ex.id) === r"
                          [class.text-white]="getRating(ex.id) === r"
                          [class.bg-gray-800]="getRating(ex.id) !== r"
                          [class.text-gray-400]="getRating(ex.id) !== r"
                          class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-xs font-bold hover:bg-blue-500 hover:text-white transition-colors"
                          >
                          {{ r }}
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
          <!-- Add Exercise Form -->
          @if (!session()?.completedAt) {
            <div class="mt-8">
              @if (!showAddExercise()) {
                <button
                  (click)="openAddExercise()"
                  class="w-full py-3 bg-gray-800 hover:bg-gray-700 text-blue-400 font-semibold rounded-xl border border-gray-700 hover:border-gray-600 transition-colors border-dashed shadow-md"
                  >
                  + Add Exercise
                </button>
              }
              @if (showAddExercise()) {
                <div class="glass-card p-6 border border-blue-500/30">
                  <h3 class="text-lg font-bold text-white mb-4">Add Exercise to Session</h3>
                  @if (!selectedExercise()) {
                    <app-exercise-search [excludeIds]="existingExerciseIds()" (exerciseSelected)="onExerciseSelected($event)"></app-exercise-search>
                  }
                  @if (selectedExercise()) {
                    <form [formGroup]="exerciseForm" (ngSubmit)="onSubmitExercise()" class="space-y-4">
                      <div class="text-sm font-semibold text-blue-400 mb-1 border-b border-gray-700 pb-2 flex items-center gap-2">
                        Selected: {{ selectedExercise()?.name }}
                        @if (selectedExercise()?.type === 'CARDIO') {
                          <span class="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded uppercase">Cardio</span>
                        }
                      </div>
                      @if (selectedExercise()?.type !== 'CARDIO') {
                        <div class="flex gap-4">
                          <div class="flex-1">
                            <label for="setsInput" class="block text-sm font-medium text-gray-300 mb-1">Sets</label>
                            <input id="setsInput" type="number" formControlName="sets" min="1" class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-white text-sm">
                          </div>
                          <div class="flex-1">
                            <label for="repsInput" class="block text-sm font-medium text-gray-300 mb-1">Min Reps</label>
                            <input id="repsInput" type="number" formControlName="reps" min="1" class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-white text-sm">
                          </div>
                          <div class="flex-1">
                            <label for="repsMaxInput" class="block text-sm font-medium text-gray-300 mb-1">Max Reps (Opt)</label>
                            <input id="repsMaxInput" type="number" formControlName="repsMax" min="1" class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-white text-sm">
                          </div>
                        </div>
                      }
                      @if (selectedExercise()?.type === 'CARDIO') {
                        <div class="flex gap-4">
                          <div class="flex-1">
                            <label for="durationInput" class="block text-sm font-medium text-gray-300 mb-1">Duration (min)</label>
                            <input id="durationInput" type="number" formControlName="durationMinutes" min="1" class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-1 focus:ring-purple-500 outline-none text-white text-sm">
                          </div>
                          <div class="flex-1">
                            <label for="inclineInput" class="block text-sm font-medium text-gray-300 mb-1">Incline</label>
                            <input id="inclineInput" type="number" formControlName="incline" step="0.1" class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-1 focus:ring-purple-500 outline-none text-white text-sm">
                          </div>
                          <div class="flex-1">
                            <label for="resistanceInput" class="block text-sm font-medium text-gray-300 mb-1">Resis.</label>
                            <input id="resistanceInput" type="number" formControlName="resistance" step="0.1" class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-1 focus:ring-purple-500 outline-none text-white text-sm">
                          </div>
                        </div>
                      }
                      <div class="flex justify-end gap-3 pt-2">
                        <button type="button" (click)="cancelAdd()" class="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm">Cancel</button>
                        <button type="submit" [disabled]="exerciseForm.invalid" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm disabled:opacity-50 transition-colors">Save Exercise</button>
                      </div>
                    </form>
                  }
                </div>
              }
            </div>
          }
          <!-- Volume Stats -->
          @if (loggedSets().length > 0) {
            <div class="glass-card p-6 mt-8">
              <h3 class="text-xl font-bold text-white mb-4">Volume Stats</h3>
              <div class="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
                <span class="text-gray-400 font-medium">Total Volume</span>
                <span class="text-2xl font-bold text-blue-400">{{ getTotalVolume() | number:'1.0-1' }} kg</span>
              </div>
              <div class="space-y-3">
                @for (ex of exercises(); track ex) {
                  @if (getVolumeForExercise(ex.id) > 0) {
                    <div class="flex justify-between items-center text-sm">
                      <span class="text-gray-300">{{ ex.exerciseName || 'Exercise ' + ex.exerciseId }}</span>
                      <span class="text-gray-400 font-mono">{{ getVolumeForExercise(ex.id) | number:'1.0-1' }} kg</span>
                    </div>
                  }
                }
              </div>
            </div>
          }
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
              @if (isSavingNotes()) {
                <span class="text-xs text-blue-400">Saving...</span>
              }
              @if (savedNotesSuccess()) {
                <span class="text-xs text-green-400">Saved!</span>
              }
            </div>
          </div>
        </div>
      }
    
      <!-- Fixed Bottom Action Bar -->
      @if (!isLoading() && session() && !session()?.completedAt) {
        <div class="fixed bottom-16 md:bottom-0 left-0 right-0 p-4 bg-gray-900/90 backdrop-blur-md border-t border-gray-800 shadow-2xl z-40">
          <div class="max-w-2xl mx-auto flex gap-4">
            <button
              (click)="completeWorkout()"
              [disabled]="isCompleting()"
              class="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold text-lg rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 transition-all transform hover:scale-[1.02] active:scale-95"
              >
              {{ isCompleting() ? 'Completing...' : 'Finish Workout' }}
            </button>
          </div>
        </div>
      }
    
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
  existingExerciseIds = computed(() => this.exercises().map(e => e.exerciseId));
  loggedSets = signal<WorkoutSetResponse[]>([]);
  
  isLoading = signal<boolean>(true);
  isLoggingSet = signal<boolean>(false);
  isCompleting = signal<boolean>(false);
  isSavingNotes = signal<boolean>(false);
  savedNotesSuccess = signal<boolean>(false);

  showAddExercise = signal<boolean>(false);
  selectedExercise = signal<Exercise | null>(null);

  notesControl = new FormControl('');

  // Map of exerciseId -> FormGroup
  forms = new Map<string, FormGroup>();

  exerciseForm: FormGroup = this.fb.group({
    exerciseId: ['', Validators.required],
    sets: [3],
    reps: [10],
    repsMax: [null],
    durationMinutes: [null],
    incline: [null],
    resistance: [null]
  });

  collapsedExercises = new Set<string>();

  toggleCollapse(exId: string) {
    if (this.collapsedExercises.has(exId)) {
      this.collapsedExercises.delete(exId);
    } else {
      this.collapsedExercises.add(exId);
    }
  }

  isCollapsed(exId: string): boolean {
    return this.collapsedExercises.has(exId);
  }

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
        let defaultRepsRight = ex.reps;

        if (setsForEx.length > 0) {
          const lastSet = setsForEx[setsForEx.length - 1];
          defaultWeight = lastSet.weightKg?.toString() || '';
          defaultReps = lastSet.repsCompleted || ex.reps;
          defaultRepsRight = lastSet.repsCompletedRight || lastSet.repsCompleted || ex.reps;
        }

        this.forms.set(ex.id, this.fb.group({
          weightKg: [defaultWeight, [Validators.required, Validators.min(0)]],
          repsCompleted: [defaultReps, [Validators.required, Validators.min(0)]],
          repsCompletedRight: [defaultRepsRight, [Validators.min(0)]]
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

  getLastSetForExercise(exerciseId: string): WorkoutSetResponse | null {
    const sets = this.getSetsForExercise(exerciseId);
    return sets.length > 0 ? sets[sets.length - 1] : null;
  }

  getMaxPerformanceForExercise(exerciseId: string): number {
    const sets = this.getSetsForExercise(exerciseId);
    let max = 0;
    for (const set of sets) {
      if (set.weightKg != null && set.repsCompleted != null) {
        const reps = set.repsCompleted + (set.repsCompletedRight || 0);
        const perf = set.weightKg * reps;
        if (perf > max) max = perf;
      }
    }
    return max;
  }

  getPerformanceStatus(set: WorkoutSetResponse, maxPerf: number): 'good' | 'warning' | 'critical' {
    if (set.weightKg == null || set.repsCompleted == null || maxPerf === 0) return 'good';
    const reps = set.repsCompleted + (set.repsCompletedRight || 0);
    const perf = set.weightKg * reps;
    const ratio = perf / maxPerf;
    
    if (ratio < 0.75) return 'critical';
    if (ratio < 0.90) return 'warning';
    return 'good';
  }

  getPerfContainerClass(status: 'good' | 'warning' | 'critical'): string {
    if (status === 'critical') return 'border-red-500/50 bg-red-900/20';
    if (status === 'warning') return 'border-yellow-500/50 bg-yellow-900/20';
    return 'border-gray-700';
  }

  getPerfBadgeClass(status: 'good' | 'warning' | 'critical', isDuration: boolean): string {
    if (status === 'critical') return 'bg-red-600/20 text-red-400 border-red-500/30';
    if (status === 'warning') return 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30';
    if (isDuration) return 'bg-purple-600/20 text-purple-400 border-purple-500/30';
    return 'bg-blue-600/20 text-blue-400 border-blue-500/30';
  }

  getPerfTextClass(status: 'good' | 'warning' | 'critical'): string {
    if (status === 'critical') return 'text-red-300';
    if (status === 'warning') return 'text-yellow-300';
    return 'text-gray-200';
  }

  getPerfSubtextClass(status: 'good' | 'warning' | 'critical'): string {
    if (status === 'critical') return 'text-red-400/70';
    if (status === 'warning') return 'text-yellow-400/70';
    return 'text-gray-500';
  }

  openAddExercise() {
    this.showAddExercise.set(true);
    this.selectedExercise.set(null);
    this.exerciseForm.reset({ sets: 3, reps: 10 });
  }

  cancelAdd() {
    this.showAddExercise.set(false);
    this.selectedExercise.set(null);
  }

  onExerciseSelected(ex: Exercise) {
    this.selectedExercise.set(ex);
    this.exerciseForm.patchValue({ exerciseId: ex.id });
    
    if (ex.type === 'CARDIO') {
      this.exerciseForm.get('sets')?.clearValidators();
      this.exerciseForm.get('reps')?.clearValidators();
      this.exerciseForm.get('durationMinutes')?.setValidators([Validators.required, Validators.min(1)]);
    } else {
      this.exerciseForm.get('sets')?.setValidators([Validators.required, Validators.min(1)]);
      this.exerciseForm.get('reps')?.setValidators([Validators.required, Validators.min(1)]);
      this.exerciseForm.get('durationMinutes')?.clearValidators();
    }
    this.exerciseForm.get('sets')?.updateValueAndValidity();
    this.exerciseForm.get('reps')?.updateValueAndValidity();
    this.exerciseForm.get('durationMinutes')?.updateValueAndValidity();
  }

  onSubmitExercise() {
    const session = this.session();
    if (this.exerciseForm.valid && session?.dayTemplateId) {
      const type = this.selectedExercise()?.type;
      const formVal = this.exerciseForm.value;
      const sortOrder = this.exercises().length;

      const sets = type === 'CARDIO' ? undefined : formVal.sets;
      const reps = type === 'CARDIO' ? undefined : formVal.reps;
      const repsMax = type === 'CARDIO' ? undefined : formVal.repsMax;
      const duration = type === 'CARDIO' ? formVal.durationMinutes : undefined;
      const incline = type === 'CARDIO' ? formVal.incline : undefined;
      const resistance = type === 'CARDIO' ? formVal.resistance : undefined;

      this.programService.addDayExercise(
        session.dayTemplateId,
        formVal.exerciseId,
        sets,
        reps,
        sortOrder,
        repsMax,
        duration,
        incline,
        resistance
      ).subscribe({
        next: () => {
          this.cancelAdd();
          // Reload exercises to show the newly added one
          this.programService.getDayExercises(session.dayTemplateId).subscribe(exercises => {
            const sorted = exercises.sort((a, b) => a.sortOrder - b.sortOrder);
            this.exercises.set(sorted);
            this.initForms(sorted);
          });
        },
        error: (err) => console.error('Error adding exercise', err)
      });
    }
  }

  getTotalVolume(): number {
    return this.loggedSets().reduce((sum, set) => {
      const reps = Number(set.repsCompleted || 0) + Number(set.repsCompletedRight || 0);
      return sum + (Number(set.weightKg || 0) * reps);
    }, 0);
  }

  getVolumeForExercise(exerciseId: string): number {
    return this.getSetsForExercise(exerciseId).reduce((sum, set) => {
      const reps = Number(set.repsCompleted || 0) + Number(set.repsCompletedRight || 0);
      return sum + (Number(set.weightKg || 0) * reps);
    }, 0);
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
      repsCompletedRight: ex.durationMinutes != null ? undefined : form.value.repsCompletedRight,
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

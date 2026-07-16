import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { WorkoutService } from '../../services/workout.service';
import { ProgramService } from '../../../programs/services/program.service';
import { ExerciseService } from '../../../exercises/services/exercise.service';
import { 
  WorkoutSessionResponse, 
  DayExercise, 
  WorkoutSetResponse,
  Exercise,
  ExerciseSuggestionResponse
} from '../../../../core/types/training.types';
import { ExerciseSearchComponent } from '../../../exercises/components/exercise-search/exercise-search.component';
import { ExerciseFormComponent, ExerciseFormData } from '../../../exercises/components/exercise-form/exercise-form.component';
import { BodyWeightService } from '../../../analytics/services/body-weight.service';

@Component({
  standalone: true,
    selector: 'app-active-workout',
    imports: [CommonModule, RouterModule, ReactiveFormsModule, ExerciseSearchComponent, ExerciseFormComponent],
  template: `
    <div class="max-w-2xl mx-auto space-y-6 pt-4 pb-32">
    
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div></div>
        <div class="flex items-center gap-3">
          @if (session()?.completedAt) {
            <div class="px-3 py-1 bg-accent-pos/20 text-accent-pos text-xs rounded-full border border-accent-pos/30">
              Completed
            </div>
          } @else {
            <button (click)="cancelWorkout()" class="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors" title="Cancel Workout">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          }
        </div>
      </div>
    
      @if (isLoading()) {
        <div class="text-center py-12">
          <div class="animate-pulse flex flex-col items-center">
            <div class="h-8 w-8 bg-accent-pos rounded-full mb-4"></div>
            <p class="text-gray-500 dark:text-gray-400">Loading workout...</p>
          </div>
        </div>
      }
    
      @if (!isLoading() && session()) {
        <div>
          <h1 class="text-3xl font-bold text-black dark:text-white mb-1">{{ session()?.dayTemplateName }}</h1>
          <p class="text-gray-500 dark:text-gray-400 text-sm mb-6">Week {{ session()?.weekNumber }} &bull; {{ session()?.performedOn | date:'mediumDate' }}</p>
          <!-- Exercises List -->
          <div class="space-y-8">
            @if (exercises().length === 0) {
              <div class="text-center py-12 solid-card">
                <p class="text-gray-500 dark:text-gray-400">This workout day has no exercises configured.</p>
              </div>
            }
            @for (ex of exercises(); track ex; let i = $index) {
              <div [id]="'exercise-' + ex.id" class="solid-card p-4 sm:p-6 overflow-hidden relative">
                <!-- Exercise Header -->
                <div class="flex items-start justify-between mb-4 border-b border-gray-300 dark:border-gray-700 pb-4">
                  <div class="flex-1 pr-4">
                    <h2 class="text-xl font-bold text-black dark:text-white">
                      <span class="text-accent-pos mr-2">{{i + 1}}.</span> {{ ex.exerciseName || 'Exercise ' + ex.exerciseId }}
                      @if (hasFatigueWarning(ex.id)) {
                        <span class="ml-2 text-[10px] uppercase font-bold text-yellow-600 dark:text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded align-middle">Fatigue Warning</span>
                      }
                    </h2>
                    @if (!isCollapsed(ex.id)) {
                      <p class="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Goal: {{ ex.sets }} sets × 
                        @if (ex.isAmrap) {
                          AMRAP
                        } @else {
                          {{ ex.reps }}{{ ex.repsMax ? '-' + ex.repsMax : '' }} reps
                        }
                      </p>
                    }
                  </div>
                  
                  <div class="flex items-center gap-1 border-l border-gray-200 dark:border-gray-700 pl-3">
                    @if (i > 0) {
                      <button (click)="moveExercise(i, -1)" class="p-1 text-gray-400 hover:text-accent-pos hover:bg-accent-pos/10 rounded transition-colors" title="Move Up">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                    }
                    @if (i < exercises().length - 1) {
                      <button (click)="moveExercise(i, 1)" class="p-1 text-gray-400 hover:text-accent-pos hover:bg-accent-pos/10 rounded transition-colors" title="Move Down">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    }
                    <button (click)="toggleCollapse(ex.id)"
                      class="ml-2 p-1.5 rounded-lg transition-colors border flex items-center justify-center"
                      [ngClass]="isCollapsed(ex.id) ? 'bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-700' : 'bg-accent-neg/10 border-accent-neg/30 text-accent-neg hover:bg-accent-neg/20'"
                      [title]="isCollapsed(ex.id) ? 'Expand Exercise' : 'Minimize Exercise'">
                      @if (!isCollapsed(ex.id)) {
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      }
                      @if (isCollapsed(ex.id)) {
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      }
                    </button>
                  </div>
                </div>

                <!-- Progress Bar inside Exercise Card -->
                <div class="flex gap-1 h-1 w-full mt-2 mb-4">
                  @for (s of [].constructor(ex.sets || 1); track $index; let idx = $index) {
                    <div class="flex-1 rounded-full overflow-hidden bg-gray-300 dark:bg-gray-700">
                      <div class="h-full bg-accent-pos transition-all duration-500 ease-out"
                           [style.width.%]="getSetsForExercise(ex.id).length > idx ? 100 : 0"></div>
                    </div>
                  }
                </div>

                @if (!isCollapsed(ex.id)) {
                  <div>
                    <!-- Last Logged Set -->
                    @if (getLastSetForExercise(ex.id); as set) {
                      <div class="space-y-3 mb-4 transition-all duration-300" [class.scale-105]="isLoggingSet()">
                        <div class="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border transition-colors border-gray-200 dark:border-gray-700"
                          [ngClass]="getPerfContainerClass(set.performanceStatus)">
                          <div class="flex items-center gap-4">
                              <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-colors"
                                [ngClass]="getPerfBadgeClass(set.performanceStatus)">
                                {{ set.setNumber }}
                              </span>
                            <div class="font-medium transition-colors"
                              [ngClass]="getPerfTextClass(set.performanceStatus)">
                                {{ set.weightKg }} <span class="text-xs uppercase" [ngClass]="getPerfSubtextClass(set.performanceStatus)">kg</span> ×
                                @if (ex.unilateral) {
                                  {{ set.repsCompleted }} / {{ set.repsCompletedRight ?? set.repsCompleted }}
                                }
                                @if (!ex.unilateral) {
                                  {{ set.repsCompleted }}
                                }
                                <span class="text-xs uppercase" [ngClass]="getPerfSubtextClass(set.performanceStatus)">reps</span>
                                @if (set.isNewPr) {
                                  <span class="ml-2 text-[10px] uppercase font-bold text-accent-pos bg-accent-pos/10 px-1.5 py-0.5 rounded border border-accent-pos/20">PR!</span>
                                }
                                @if (set.performanceStatus === 'CRITICAL') {
                                  <span class="ml-2 text-[10px] uppercase font-bold text-accent-neg bg-accent-neg/10 px-1.5 py-0.5 rounded">Perf Drop</span>
                                }
                                @if (set.performanceStatus === 'WARNING') {
                                  <span class="ml-2 text-[10px] uppercase font-bold text-yellow-600 dark:text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">Fatigue</span>
                                }
                            </div>
                          </div>
                          @if (!session()?.completedAt) {
                            <button
                              (click)="deleteSet(set.id)"
                              class="text-gray-500 hover:text-accent-neg transition-colors p-2"
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
                      <div class="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                        <div class="mb-3 flex items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                          <div class="flex items-center gap-2">
                            <span class="w-6 h-6 rounded-full bg-accent-pos/20 text-accent-pos flex items-center justify-center text-xs font-bold border border-accent-pos/30">
                              {{ getSetsForExercise(ex.id).length + 1 }}
                            </span>
                            <span class="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Next Set</span>
                          </div>
                          @if (getSuggestion(ex.id)) {
                            <div class="text-xs text-gray-500 dark:text-gray-400">
                              Last week: <span class="font-bold text-gray-700 dark:text-gray-300">{{ getSuggestion(ex.id)?.suggestedWeightKg }}kg &times; {{ getSuggestion(ex.id)?.suggestedReps }}</span>
                            </div>
                          }
                        </div>
                        <form [formGroup]="getForm(ex.id)" (ngSubmit)="logSet(ex)" class="flex items-end gap-3 flex-wrap">
                            <div class="flex-1 min-w-[80px]">
                              <label [for]="'weight-' + ex.id" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Weight (kg)</label>
                              <input [id]="'weight-' + ex.id" type="number" inputmode="decimal" step="0.5" min="0" formControlName="weightKg" [placeholder]="getSuggestion(ex.id)?.suggestedWeightKg || '0'" class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-accent-pos outline-none text-black dark:text-white text-lg font-bold text-center placeholder-gray-400 dark:placeholder-gray-500/50">
                            </div>
                            <div class="flex-1 min-w-[70px]">
                              <label [for]="'reps-' + ex.id" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{{ ex.unilateral ? 'Reps (L)' : 'Reps' }}</label>
                              <input [id]="'reps-' + ex.id" type="number" inputmode="numeric" min="0" formControlName="repsCompleted" [placeholder]="getSuggestion(ex.id)?.suggestedReps || ex.reps || '0'" class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-accent-pos outline-none text-black dark:text-white text-lg font-bold text-center placeholder-gray-400 dark:placeholder-gray-500/50">
                            </div>
                            @if (ex.unilateral) {
                              <div class="flex-1 min-w-[70px]">
                                <label [for]="'reps-r-' + ex.id" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Reps (R)</label>
                                <input [id]="'reps-r-' + ex.id" type="number" inputmode="numeric" min="0" formControlName="repsCompletedRight" [placeholder]="getSuggestion(ex.id)?.suggestedReps || ex.reps || '0'" class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-accent-pos outline-none text-black dark:text-white text-lg font-bold text-center placeholder-gray-400 dark:placeholder-gray-500/50">
                              </div>
                            }
                          <div class="w-full sm:w-auto mt-2 sm:mt-0">
                            <button type="submit" [disabled]="getForm(ex.id).invalid || isLoggingSet()" class="px-6 py-2 text-white font-semibold rounded-lg shadow-md disabled:opacity-50 transition-colors h-[42px]"
                              [ngClass]="getSetsForExercise(ex.id).length >= ex.sets ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-accent-pos hover:opacity-90'">
                              {{ getSetsForExercise(ex.id).length >= ex.sets ? 'Log Extra Set' : 'Log' }}
                            </button>
                          </div>
                        </form>
                      </div>
                    }
                    
                    <!-- Rating Section -->
                    @if (!session()?.completedAt) {
                      <div class="pt-4 border-t border-gray-300 dark:border-gray-700/50 mt-4">
                        <div class="flex gap-1 sm:gap-1.5 justify-between sm:justify-start w-full">
                          <button
                            (click)="deleteRating(ex.id)"
                            [class.bg-gray-200]="getRating(ex.id) !== null"
                            [class.dark:bg-gray-800]="getRating(ex.id) !== null"
                            [class.text-gray-500]="getRating(ex.id) !== null"
                            [class.bg-accent-pos]="getRating(ex.id) === null"
                            [class.text-white]="getRating(ex.id) === null"
                            title="Unrated"
                            class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-xs font-bold hover:bg-accent-pos hover:text-white transition-colors"
                            >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          @for (r of [1,2,3,4,5,6,7,8,9,10]; track r) {
                            <button
                              (click)="setRating(ex.id, r)"
                              [class.bg-accent-pos]="getRating(ex.id) === r"
                              [class.text-white]="getRating(ex.id) === r"
                              [class.bg-gray-200]="getRating(ex.id) !== r"
                              [class.dark:bg-gray-800]="getRating(ex.id) !== r"
                              [class.text-gray-500]="getRating(ex.id) !== r"
                              class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-xs font-bold hover:bg-accent-pos hover:text-white transition-colors"
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
            }
          </div>
          <!-- Add Exercise Form -->
          @if (!session()?.completedAt) {
            <div class="mt-8">
              @if (!showAddExercise()) {
                <button
                  (click)="openAddExercise()"
                  class="w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-accent-pos font-semibold rounded-xl border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 transition-colors border-dashed shadow-md"
                  >
                  + Add Exercise
                </button>
              }
              @if (showAddExercise()) {
                <div class="solid-card p-6 border border-accent-pos/30">
                  <h3 class="text-lg font-bold text-black dark:text-white mb-4">Add Exercise to Session</h3>
                  
                  @if (!isCreatingNewExercise()) {
                    @if (!selectedExercise()) {
                      <app-exercise-search [excludeIds]="existingExerciseIds()" (exerciseSelected)="onExerciseSelected($event)"></app-exercise-search>
                      
                      <div class="mt-4 text-center">
                        <button type="button" (click)="isCreatingNewExercise.set(true)" class="text-sm font-medium text-accent-pos hover:opacity-80 border border-accent-pos/30 bg-accent-pos/10 px-4 py-2 rounded-lg transition-colors">
                          + Or create a new exercise
                        </button>
                      </div>
                    }
                    @if (selectedExercise()) {
                      <form [formGroup]="exerciseForm" (ngSubmit)="onSubmitExercise()" class="space-y-4">
                        <div class="text-black dark:text-white">Selected: {{ selectedExercise()?.name }}</div>
                        <div class="flex gap-4">
                          <div class="flex-1">
                            <label for="setsInput" class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Sets</label>
                            <input id="setsInput" type="number" formControlName="sets" min="1" class="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-accent-pos outline-none text-black dark:text-white text-sm">
                          </div>
                          <div class="flex-1">
                            <label for="repsInput" class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Min Reps</label>
                            <input id="repsInput" type="number" formControlName="reps" min="1" class="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-accent-pos outline-none text-black dark:text-white text-sm">
                          </div>
                          <div class="flex-1">
                            <label for="repsMaxInput" class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Max Reps (Opt)</label>
                            <input id="repsMaxInput" type="number" formControlName="repsMax" min="1" class="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-accent-pos outline-none text-black dark:text-white text-sm">
                          </div>
                        </div>

                      <div class="flex justify-end gap-3 pt-2">
                        <button type="button" (click)="cancelAdd()" class="px-4 py-2 text-gray-500 hover:text-black dark:hover:text-white transition-colors text-sm">Cancel</button>
                        <button type="submit" [disabled]="exerciseForm.invalid" class="px-4 py-2 bg-accent-pos hover:opacity-80 text-white rounded-lg text-sm disabled:opacity-50 transition-colors">Save Exercise</button>
                      </div>
                    </form>
                  }
                }

                @if (isCreatingNewExercise()) {
                  <app-exercise-form 
                    (saveExercise)="onSaveNewExercise($event)" 
                    (cancelForm)="isCreatingNewExercise.set(false)">
                  </app-exercise-form>
                  
                  @if (isSavingNewExercise()) {
                    <div class="text-center mt-4 text-sm text-gray-500">Saving new exercise...</div>
                  }
                }
                </div>
              }
            </div>
          }

          <!-- Session Notes -->
          <div class="solid-card p-6 mt-8">
            <h3 class="text-xl font-bold text-black dark:text-white mb-2">Session Notes</h3>
            <textarea
              [formControl]="notesControl"
              (blur)="saveNotes()"
              placeholder="Type your notes here..."
              class="w-full h-32 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-accent-pos outline-none text-black dark:text-white text-sm resize-none placeholder-gray-400"
            ></textarea>
            @if (session()?.previousNotes) {
              <div class="mt-4 p-4 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg">
                <p class="text-xs text-gray-500 font-bold uppercase mb-1">Previous Session Notes</p>
                <p class="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{{ session()?.previousNotes }}</p>
              </div>
            }
            <div class="flex justify-end mt-2">
              @if (isSavingNotes()) {
                <span class="text-xs text-accent-pos">Saving...</span>
              }
              @if (savedNotesSuccess()) {
                <span class="text-xs text-green-500">Saved!</span>
              }
            </div>
          </div>
        </div>
      }
    
      <!-- Sticky Bottom Action Bar -->
      @if (!isLoading() && session()) {
        <div class="sticky bottom-20 md:bottom-6 p-4 mt-8 bg-white/90 dark:bg-black/90 backdrop-blur-md border border-gray-300 dark:border-gray-800 rounded-2xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)] z-40">
          <div class="flex items-center gap-4">
            <div class="flex-1 hidden sm:block">
              <div class="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase mb-1.5 tracking-wider">
                <span>Progress</span>
                <span>{{ getTotalLoggedSets() }} / {{ getTotalExpectedSets() }} Sets</span>
              </div>
              <div class="flex gap-0.5 h-2 w-full">
                @for (s of [].constructor(getTotalExpectedSets()); track $index; let idx = $index) {
                  <div class="flex-1 rounded-full overflow-hidden bg-gray-300 dark:bg-gray-700">
                    <div class="h-full bg-accent-pos transition-all duration-500 ease-out"
                         [style.width.%]="getTotalLoggedSets() > idx ? 100 : 0"></div>
                  </div>
                }
              </div>
            </div>
            <div class="flex-none w-full sm:w-1/2">
              @if (!session()?.completedAt) {
                <button
                  (click)="completeWorkout()"
                  [disabled]="isCompleting()"
                  class="w-full py-4 text-white font-bold text-lg rounded-xl transition-all transform hover:scale-[1.02] active:scale-95 shadow-md disabled:opacity-50 bg-accent-pos hover:opacity-90 flex flex-col items-center justify-center"
                  style="box-shadow: 0 0 20px var(--color-accent-pos);"
                  >
                  <span>{{ isCompleting() ? 'Completing...' : 'Finish Workout' }}</span>
                  <span class="text-[10px] sm:hidden opacity-80 mt-0.5">{{ getTotalLoggedSets() }} / {{ getTotalExpectedSets() }} Sets Completed</span>
                </button>
              } @else {
                <button
                  (click)="uncompleteWorkout()"
                  [disabled]="isCompleting()"
                  class="w-full py-4 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 text-black dark:text-white font-bold text-lg rounded-xl transition-all transform hover:scale-[1.02] active:scale-95"
                  >
                  {{ isCompleting() ? 'Reopening...' : 'Uncomplete & Edit' }}
                </button>
              }
            </div>
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
  private exerciseService = inject(ExerciseService);
  private bodyWeightService = inject(BodyWeightService);

  sessionId = signal<string | null>(null);
  session = signal<WorkoutSessionResponse | null>(null);
  exercises = signal<DayExercise[]>([]);
  existingExerciseIds = computed(() => this.exercises().map(e => e.exerciseId));
  loggedSets = signal<WorkoutSetResponse[]>([]);
  suggestions = signal<Map<string, ExerciseSuggestionResponse>>(new Map());
  latestBodyWeight = signal<number | null>(null);
  isLoading = signal<boolean>(true);
  isLoggingSet = signal<boolean>(false);
  isCompleting = signal<boolean>(false);
  isSavingNotes = signal<boolean>(false);
  savedNotesSuccess = signal<boolean>(false);

  showAddExercise = signal<boolean>(false);
  selectedExercise = signal<Exercise | null>(null);
  isCreatingNewExercise = signal<boolean>(false);
  isSavingNewExercise = signal<boolean>(false);

  notesControl = new FormControl('');

  // Map of exerciseId -> FormGroup
  forms = new Map<string, FormGroup>();

  exerciseForm: FormGroup = this.fb.group({
    exerciseId: ['', Validators.required],
    sets: [3],
    reps: [10],
    repsMax: [null]
  });

  collapsedExercises = new Set<string>();

  toggleCollapse(exId: string) {
    if (this.collapsedExercises.has(exId)) {
      this.collapsedExercises.delete(exId);
    } else {
      this.collapsedExercises.add(exId);
      this.scrollToFirstIncompleteExercise();
    }
  }

  scrollToFirstIncompleteExercise() {
    const exercises = this.exercises();
    for (let ex of exercises) {
      const setsDone = this.getSetsForExercise(ex.id).length;
      const setsExpected = ex.sets || 1;
      if (setsDone < setsExpected && !this.isCollapsed(ex.id)) {
        setTimeout(() => {
          const el = document.getElementById('exercise-' + ex.id);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        return;
      }
    }
  }

  moveExercise(index: number, direction: number) {
    if (this.session()?.completedAt) return;
    const currentExercises = [...this.exercises()];
    if (index < 0 || index >= currentExercises.length) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= currentExercises.length) return;

    // Swap in array
    const temp = currentExercises[index];
    currentExercises[index] = currentExercises[targetIndex];
    currentExercises[targetIndex] = temp;

    // Update sortOrder
    currentExercises.forEach((ex, idx) => ex.sortOrder = idx);
    this.exercises.set(currentExercises);

    // Call backend to persist
    const sessionId = this.sessionId();
    if (sessionId) {
      const requests = currentExercises.map(ex => ({ id: ex.id, sortOrder: ex.sortOrder }));
      this.workoutService.reorderSessionExercises(sessionId, requests).subscribe({
        error: (err) => console.error('Failed to reorder exercises on backend', err)
      });
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
        
        forkJoin({
          sets: this.workoutService.getSets(id),
          exercises: this.workoutService.getSessionExercises(id),
          suggestions: this.workoutService.getSuggestions(id).pipe(catchError(() => of([]))),
          latestBW: this.bodyWeightService.getWeightEntries('2000-01-01', new Date().toISOString().split('T')[0]).pipe(catchError(() => of([])))
        }).subscribe({
          next: (res) => {
            this.loggedSets.set(res.sets);
            
            const suggMap = new Map<string, ExerciseSuggestionResponse>();
            res.suggestions.forEach(s => suggMap.set(s.dayExerciseId, s));
            this.suggestions.set(suggMap);
            
            if (res.latestBW && res.latestBW.length > 0) {
              const sortedBW = [...res.latestBW].sort((a, b) => a.date.localeCompare(b.date));
              this.latestBodyWeight.set(sortedBW[sortedBW.length - 1].weightKg);
            }
            
            // Map SessionExerciseResponse to DayExercise format for frontend compatibility
            const mappedExercises: DayExercise[] = res.exercises.map(e => ({
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
            
            const sorted = mappedExercises.sort((a, b) => a.sortOrder - b.sortOrder);
            this.exercises.set(sorted);
            this.initForms(sorted);
            
            // Auto-collapse completed exercises on load
            sorted.forEach(ex => {
              const setsLogged = this.getSetsForExercise(ex.id).length;
              if (setsLogged >= (ex.sets || 1)) {
                this.collapsedExercises.add(ex.id);
              }
            });

            this.isLoading.set(false);
          },
          error: (err) => {
            console.error('Failed to load workout data', err);
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
      
      let defaultWeight = '';
      let defaultReps: number | '' = '';
      let defaultRepsRight: number | '' = '';

      if (setsForEx.length > 0) {
        const lastSet = setsForEx[setsForEx.length - 1];
        defaultWeight = lastSet.weightKg?.toString() || '';
        defaultReps = lastSet.repsCompleted || '';
        defaultRepsRight = lastSet.repsCompletedRight || '';
      } else {
        const suggestion = this.getSuggestion(ex.id);
        if (suggestion?.suggestedWeightKg != null) {
          defaultWeight = suggestion.suggestedWeightKg.toString();
        } else if (ex.isBodyweight && this.latestBodyWeight() !== null) {
          defaultWeight = this.latestBodyWeight()!.toString();
        }
      }

      this.forms.set(ex.id, this.fb.group({
        weightKg: [defaultWeight, [Validators.required, Validators.min(0)]],
        repsCompleted: [defaultReps, [Validators.required, Validators.min(0)]],
        repsCompletedRight: [defaultRepsRight, [Validators.min(0)]]
      }));
    });
  }

  getForm(exerciseId: string): FormGroup {
    return this.forms.get(exerciseId) as FormGroup;
  }

  getSetsForExercise(exerciseId: string) {
    return this.loggedSets()
      .filter(s => s.sessionExerciseId === exerciseId)
      .sort((a, b) => a.setNumber - b.setNumber);
  }

  getLastSetForExercise(exerciseId: string): WorkoutSetResponse | null {
    const sets = this.getSetsForExercise(exerciseId);
    return sets.length > 0 ? sets[sets.length - 1] : null;
  }

  hasFatigueWarning(exerciseId: string): boolean {
    const sets = this.getSetsForExercise(exerciseId);
    let criticals = 0;
    let warnings = 0;
    for (const s of sets) {
      if (s.performanceStatus === 'CRITICAL') criticals++;
      if (s.performanceStatus === 'WARNING') warnings++;
    }
    return criticals >= 1 || warnings >= 2;
  }

  getSuggestion(dayExerciseId: string) {
    return this.suggestions().get(dayExerciseId);
  }

  getPerfContainerClass(status: 'GOOD' | 'WARNING' | 'CRITICAL' | undefined): string {
    if (status === 'CRITICAL') return 'border-red-500/50 bg-red-900/20';
    if (status === 'WARNING') return 'border-yellow-500/50 bg-yellow-900/20';
    if (status === 'GOOD') return 'border-emerald-500/50 bg-emerald-900/20';
    return 'border-gray-700';
  }

  getPerfBadgeClass(status: 'GOOD' | 'WARNING' | 'CRITICAL' | undefined): string {
    if (status === 'CRITICAL') return 'bg-red-600/20 text-red-400 border-red-500/30';
    if (status === 'WARNING') return 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30';
    if (status === 'GOOD') return 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30';
    return 'bg-blue-600/20 text-blue-400 border-blue-500/30';
  }

  getPerfTextClass(status: 'GOOD' | 'WARNING' | 'CRITICAL' | undefined): string {
    if (status === 'CRITICAL') return 'text-red-300';
    if (status === 'WARNING') return 'text-yellow-300';
    if (status === 'GOOD') return 'text-emerald-300';
    return 'text-gray-200';
  }

  getPerfSubtextClass(status: 'GOOD' | 'WARNING' | 'CRITICAL' | undefined): string {
    if (status === 'CRITICAL') return 'text-red-400/70';
    if (status === 'WARNING') return 'text-yellow-400/70';
    if (status === 'GOOD') return 'text-emerald-400/70';
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
    
    this.exerciseForm.get('sets')?.setValidators([Validators.required, Validators.min(1)]);
    this.exerciseForm.get('reps')?.setValidators([Validators.required, Validators.min(1)]);
    
    this.exerciseForm.get('sets')?.updateValueAndValidity();
    this.exerciseForm.get('reps')?.updateValueAndValidity();
  }

  onSubmitExercise() {
    const session = this.session();
    if (this.exerciseForm.valid && session) {
      const formVal = this.exerciseForm.value;
      const payload = {
        exerciseId: formVal.exerciseId,
        sets: formVal.sets,
        reps: formVal.reps,
        repsMax: formVal.repsMax,
        isAmrap: false
      };

      this.workoutService.addSessionExercise(session.id, payload).subscribe({
        next: () => {
          this.cancelAdd();
          // Reload exercises to show the newly added one
          this.workoutService.getSessionExercises(session.id).subscribe(exercises => {
            const mappedExercises: DayExercise[] = exercises.map(e => ({
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
            const sorted = mappedExercises.sort((a, b) => a.sortOrder - b.sortOrder);
            this.exercises.set(sorted);
            this.initForms(sorted);
          });
        },
        error: (err) => console.error('Error adding exercise', err)
      });
    }
  }

  onSaveNewExercise(formData: ExerciseFormData) {
    this.isSavingNewExercise.set(true);
    
    const exercisePayload = {
      name: formData.name,
      equipmentBrand: formData.equipmentBrand || undefined,
      unilateral: formData.unilateral,
      isPublic: formData.isPublic || false
    };

    this.exerciseService.createExercise(exercisePayload).subscribe({
      next: (newExercise) => {
        if (formData.targets.length > 0) {
          const targetObservables = formData.targets.map(t => 
            this.exerciseService.addTarget(newExercise.id, { bodyPart: t.bodyPart, targetValue: t.targetValue })
          );
          
          forkJoin(targetObservables).subscribe({
            next: () => this.handleNewExerciseCreated(newExercise),
            error: (err) => {
              console.error('Failed to save targets', err);
              this.handleNewExerciseCreated(newExercise); // still select it even if targets fail
            }
          });
        } else {
          this.handleNewExerciseCreated(newExercise);
        }
      },
      error: (err) => {
        console.error('Error creating exercise', err);
        alert(err.error?.message || 'Failed to create exercise.');
        this.isSavingNewExercise.set(false);
      }
    });
  }

  handleNewExerciseCreated(exercise: Exercise) {
    this.isSavingNewExercise.set(false);
    this.isCreatingNewExercise.set(false);
    // Automatically select the newly created exercise to proceed to sets/reps selection
    this.onExerciseSelected(exercise);
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
      sessionExerciseId: ex.id,
      setNumber: setNumber,
      repsCompleted: form.value.repsCompleted,
      repsCompletedRight: ex.unilateral ? form.value.repsCompletedRight : null,
      weightKg: form.value.weightKg
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

  uncompleteWorkout() {
    const id = this.sessionId();
    if (!id) return;

    if (confirm('Are you sure you want to reopen this session? This will temporarily remove it from your analytics until you complete it again.')) {
      this.isCompleting.set(true);
      this.workoutService.uncompleteSession(id).subscribe({
        next: () => {
          this.session.update(s => s ? { ...s, completedAt: null } : s);
          this.isCompleting.set(false);
        },
        error: (err) => {
          console.error('Failed to uncomplete session', err);
          this.isCompleting.set(false);
          alert('Failed to reopen workout. Please try again.');
        }
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

  cancelWorkout() {
    const id = this.sessionId();
    if (!id) return;

    if (confirm('Are you sure you want to cancel and delete this workout session?')) {
      this.workoutService.deleteSession(id).subscribe({
        next: () => {
          this.router.navigate(['/workout']);
        },
        error: (err) => {
          console.error('Error canceling session', err);
          alert('Failed to cancel session.');
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

  deleteRating(dayExerciseId: string) {
    const id = this.sessionId();
    if (!id || this.session()?.completedAt) return;

    this.workoutService.deleteExerciseRating(id, dayExerciseId).subscribe({
      next: (updatedSession) => {
        this.session.set(updatedSession);
      },
      error: (err) => {
        console.error('Error deleting rating', err);
      }
    });
  }

  getTotalExpectedSets(): number {
    return this.exercises().reduce((total, ex) => total + (ex.sets || 1), 0); // fallback to 1 for cardio if needed, but ex.sets should be used
  }

  getTotalLoggedSets(): number {
    return this.exercises().reduce((total, ex) => {
      const logged = this.getSetsForExercise(ex.id).length;
      return total + Math.min(logged, ex.sets || 1);
    }, 0);
  }

  getGlobalProgress(): number {
    const expected = this.getTotalExpectedSets();
    if (expected === 0) return 0;
    return (this.getTotalLoggedSets() / expected) * 100;
  }
}

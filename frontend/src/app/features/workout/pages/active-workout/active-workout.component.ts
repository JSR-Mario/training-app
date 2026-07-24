import { Component, OnInit, HostListener, inject, signal, computed } from '@angular/core';
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
import { AnalyticsService } from '../../../analytics/services/analytics.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { ExerciseProgressEntry } from '../../../../core/types/analytics.types';

@Component({
  standalone: true,
    selector: 'app-active-workout',
    imports: [CommonModule, RouterModule, ReactiveFormsModule, ExerciseSearchComponent, ExerciseFormComponent, BaseChartDirective],
  template: `
    <div class="max-w-2xl mx-auto space-y-6 pt-4 pb-48">
    
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
          <!-- Header -->
          <div class="flex items-start justify-between mb-6">
            <div>
              <h1 class="text-3xl font-bold text-black dark:text-white mb-1">{{ session()?.dayTemplateName }}</h1>
              <p class="text-gray-500 dark:text-gray-400 text-sm">Week {{ session()?.weekNumber }} &bull; {{ session()?.performedOn | date:'mediumDate' }}</p>
            </div>
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
          <!-- Chart for Completed Sessions -->
          @if (session()?.completedAt && chartData) {
            <div class="solid-card p-6 border border-gray-300 dark:border-gray-700 mb-8">
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
                    <h2 class="text-xl font-bold text-black dark:text-white flex flex-wrap items-center gap-2">
                      <span>{{ ex.exerciseName || 'Exercise ' + ex.exerciseId }}</span>
                      @if (getSuggestion(ex.id)?.hadFatigueLastWeek) {
                        <div class="relative ml-2">
                          <button
                            type="button"
                            (click)="$event.stopPropagation(); toggleIconTooltip(ex.id + '-fatigue')"
                            class="w-6 h-6 text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded flex items-center justify-center cursor-pointer">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </button>
                          @if (activeIconTooltip() === ex.id + '-fatigue') {
                            <div class="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs rounded-lg shadow-xl text-center leading-relaxed pointer-events-none">
                              High fatigue detected last session. Maintain current weight and focus on form.
                              <div class="absolute top-full left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900 dark:border-t-white"></div>
                            </div>
                          }
                        </div>
                      }
                      @if (getSuggestion(ex.id)?.suggestAddWeight && !hasPerfDropForExercise(ex.id) && !getSuggestion(ex.id)?.hadFatigueLastWeek) {
                        <div class="relative ml-2">
                          <button
                            type="button"
                            (click)="$event.stopPropagation(); toggleIconTooltip(ex.id + '-weight')"
                            class="w-6 h-6 text-accent-pos bg-accent-pos/10 border border-accent-pos/20 rounded flex items-center justify-center cursor-pointer">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                          </button>
                          @if (activeIconTooltip() === ex.id + '-weight') {
                            <div class="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs rounded-lg shadow-xl text-center leading-relaxed pointer-events-none">
                              You crushed your rep targets last session! Consider adding weight this week.
                              <div class="absolute top-full left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900 dark:border-t-white"></div>
                            </div>
                          }
                        </div>
                      }
                      @if (hasPrForExercise(ex.id)) {
                        <div class="relative ml-2">
                          <button
                            type="button"
                            (click)="$event.stopPropagation(); toggleIconTooltip(ex.id + '-pr')"
                            class="w-6 h-6 text-accent-pos bg-accent-pos/10 border border-accent-pos/20 rounded flex items-center justify-center cursor-pointer animate-pulse text-[10px] font-bold uppercase">
                            PR!
                          </button>
                          @if (activeIconTooltip() === ex.id + '-pr') {
                            <div class="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs rounded-lg shadow-xl text-center leading-relaxed pointer-events-none">
                              Personal Record! You lifted heavier than ever on this exercise.
                              <div class="absolute top-full left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900 dark:border-t-white"></div>
                            </div>
                          }
                        </div>
                      }
                    </h2>
                    @if (!isCollapsed(ex.id) && !session()?.completedAt) {
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
                    @if (!session()?.completedAt) {
                      <button (click)="openOptionsModal(ex.id)" class="p-1.5 text-gray-400 hover:text-accent-pos hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" title="Options">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    }
                    <button (click)="toggleCollapse(ex.id)"
                      class="ml-2 p-1.5 rounded-lg transition-colors border flex items-center justify-center text-gray-500 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700"
                      [ngClass]="isCollapsed(ex.id) ? 'bg-gray-200 dark:bg-gray-800' : 'bg-gray-100 dark:bg-gray-900'"
                      [title]="isCollapsed(ex.id) ? 'Expand Exercise' : 'Minimize Exercise'">
                      <svg xmlns="http://www.w3.org/2000/svg" 
                           class="h-5 w-5 transition-colors" 
                           [class.text-accent-pos]="isCollapsed(ex.id)"
                           fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Progress Bar inside Exercise Card -->
                @if (!session()?.completedAt) {
                  <div class="flex gap-1 h-1 w-full mt-2 mb-4">
                    @for (s of [].constructor(ex.sets || 1); track $index; let idx = $index) {
                      <div class="flex-1 rounded-full overflow-hidden bg-gray-300 dark:bg-gray-700">
                        <div class="h-full bg-accent-pos transition-all duration-500 ease-out"
                             [style.width.%]="getSetsForExercise(ex.id).length > idx ? 100 : 0"></div>
                      </div>
                    }
                  </div>
                }

                @if (!isCollapsed(ex.id)) {
                  <div [class.mt-4]="session()?.completedAt">
                    <!-- Logged Sets -->
                    <div class="space-y-1.5 mb-4">
                      @for (set of getSetsForExercise(ex.id); track set.id; let last = $last) {
                        <div class="transition-all duration-300" [class.scale-105]="isLoggingSet() && last">
                        @if (editingSetId() === set.id) {
                          <div class="flex items-center justify-between bg-white dark:bg-gray-800 py-2 px-3 rounded-lg border border-accent-pos/50 shadow-sm">
                            <form [formGroup]="editSetForm" (ngSubmit)="saveEditSet(ex.id)" class="flex items-center w-full gap-2">
                              <span class="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-black dark:text-white">
                                {{ set.setNumber }}
                              </span>
                              <div class="flex items-center flex-1 gap-2 overflow-hidden">
                                <input type="number" formControlName="weightKg" class="w-16 sm:w-20 px-2 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-sm text-black dark:text-white text-center outline-none focus:border-accent-pos" step="0.5" min="0">
                                <span class="text-xs text-gray-500">{{ getUnit(ex.id) }} ×</span>
                                <input type="number" formControlName="repsCompleted" class="w-12 sm:w-16 px-2 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-sm text-black dark:text-white text-center outline-none focus:border-accent-pos" min="0">
                                @if (ex.unilateral) {
                                  <span class="text-xs text-gray-500">/</span>
                                  <input type="number" formControlName="repsCompletedRight" class="w-12 sm:w-16 px-2 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-sm text-black dark:text-white text-center outline-none focus:border-accent-pos" min="0">
                                }
                              </div>
                              <div class="flex items-center shrink-0">
                                <button type="button" (click)="cancelEditSet()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 transition-colors bg-gray-100 dark:bg-gray-700 rounded mr-1">
                                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                                <button type="submit" [disabled]="editSetForm.invalid || isSavingEdit()" class="text-white bg-accent-pos hover:opacity-80 p-1.5 rounded transition-all disabled:opacity-50">
                                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                                </button>
                              </div>
                            </form>
                          </div>
                        } @else {
                          <div class="flex items-center justify-between bg-gray-100 dark:bg-gray-800 py-2 px-3 rounded-lg border transition-colors border-gray-200 dark:border-gray-700"
                          [ngClass]="getPerfContainerClass(set.performanceStatus)">
                          <div class="flex items-center gap-4">
                              <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-colors"
                                [ngClass]="getPerfBadgeClass(set.performanceStatus)">
                                {{ set.setNumber }}
                              </span>
                            <div class="font-medium transition-colors"
                              [ngClass]="getPerfTextClass(set.performanceStatus)">
                                {{ getDisplayWeight(set.weightKg, ex.id) }} <span class="text-xs uppercase" [ngClass]="getPerfSubtextClass(set.performanceStatus)">{{ getUnit(ex.id) }}</span> ×
                                @if (ex.unilateral) {
                                  {{ set.repsCompleted }} / {{ set.repsCompletedRight ?? set.repsCompleted }}
                                }
                                @if (!ex.unilateral) {
                                  {{ set.repsCompleted }}
                                }
                                <span class="text-xs uppercase" [ngClass]="getPerfSubtextClass(set.performanceStatus)">reps</span>
                                @if (set.performanceStatus === 'CRITICAL') {
                                  <span class="ml-2 text-[10px] uppercase font-bold text-accent-neg bg-accent-neg/10 border border-accent-neg/20 px-1.5 py-0.5 rounded">Perf Drop</span>
                                }
                                @if (set.performanceStatus === 'WARNING') {
                                  <span class="ml-2 text-[10px] uppercase font-bold text-accent-pos bg-accent-pos/10 border border-accent-pos/20 px-1.5 py-0.5 rounded">Fatigue</span>
                                }
                            </div>
                          </div>
                          @if (!session()?.completedAt) {
                            <div class="flex items-center">
                              <button
                                (click)="startEditSet(set, ex.id)"
                                class="text-gray-400 hover:text-accent-pos transition-colors p-2"
                                title="Edit Set"
                                >
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                (click)="deleteSet(set.id)"
                                class="text-gray-400 hover:text-accent-neg transition-colors p-2"
                                title="Delete Set"
                                >
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          }
                        </div>
                        }
                      </div>
                      }
                    </div>
                    <!-- Log New Set Form -->
                    @if (!session()?.completedAt && getSetsForExercise(ex.id).length < (ex.sets || 1)) {
                      <div class="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                        <div class="mb-3 flex items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                          <div class="flex items-center gap-2">
                            <span class="w-6 h-6 rounded-full bg-accent-pos/20 text-accent-pos flex items-center justify-center text-xs font-bold border border-accent-pos/30">
                              {{ getSetsForExercise(ex.id).length + 1 }}
                            </span>
                            <span class="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Next Set</span>
                          </div>
                          @if (getSuggestionForNextSet(ex.id)) {
                            <div class="text-xs text-gray-500 dark:text-gray-400">
                              Last week: <span class="font-bold text-gray-700 dark:text-gray-300">{{ getDisplayWeight(getSuggestionForNextSet(ex.id)?.weightKg, ex.id) }}{{ getUnit(ex.id) }} &times; {{ getSuggestionForNextSet(ex.id)?.reps }}</span>
                            </div>
                          }
                        </div>
                        <form [formGroup]="getForm(ex.id)" (ngSubmit)="logSet(ex)" class="flex items-end gap-3 flex-wrap">
                            <div class="flex-1 min-w-[80px]">
                              <label [for]="'weight-' + ex.id" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Weight ({{ getUnit(ex.id) }})</label>
                              <input [id]="'weight-' + ex.id" type="number" inputmode="decimal" step="0.5" min="0" formControlName="weightKg" [placeholder]="getDisplayWeight(getSuggestionForNextSet(ex.id)?.weightKg || getSuggestion(ex.id)?.suggestedWeightKg, ex.id)" class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-accent-pos outline-none text-black dark:text-white text-lg font-bold text-center placeholder-gray-400 dark:placeholder-gray-500/50">
                            </div>
                            <div class="flex-1 min-w-[70px]">
                              <label [for]="'reps-' + ex.id" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{{ ex.unilateral ? 'Reps (L)' : 'Reps' }}</label>
                              <input [id]="'reps-' + ex.id" type="number" inputmode="numeric" min="0" formControlName="repsCompleted" [placeholder]="getSuggestionForNextSet(ex.id)?.reps || getSuggestion(ex.id)?.suggestedReps || ex.reps || '0'" class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-accent-pos outline-none text-black dark:text-white text-lg font-bold text-center placeholder-gray-400 dark:placeholder-gray-500/50">
                            </div>
                            @if (ex.unilateral) {
                              <div class="flex-1 min-w-[70px]">
                                <label [for]="'reps-r-' + ex.id" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Reps (R)</label>
                                <input [id]="'reps-r-' + ex.id" type="number" inputmode="numeric" min="0" formControlName="repsCompletedRight" [placeholder]="getSuggestionForNextSet(ex.id)?.reps || getSuggestion(ex.id)?.suggestedReps || ex.reps || '0'" class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-accent-pos outline-none text-black dark:text-white text-lg font-bold text-center placeholder-gray-400 dark:placeholder-gray-500/50">
                              </div>
                            }

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
                
                @if (optionsModalOpen() === ex.id) {
                  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 dark:bg-black/80 backdrop-blur-sm">
                    <div class="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative p-6">
                      <button (click)="closeOptionsModal()" class="absolute top-4 right-4 text-gray-500 hover:text-black dark:hover:text-white">✕</button>
                      <h3 class="text-xl font-bold mb-6 text-black dark:text-white">{{ ex.exerciseName }} Options</h3>
                      <div class="space-y-4">
                        <div class="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                          <span class="font-medium text-gray-700 dark:text-gray-300">Unit</span>
                          <button (click)="toggleUnit(ex.id)" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm font-bold transition-colors uppercase w-16">
                            {{ getUnit(ex.id) }}
                          </button>
                        </div>
                        <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl flex flex-col gap-2">
                          <span class="font-medium text-gray-700 dark:text-gray-300 mb-1">Reorder</span>
                          <div class="flex gap-2">
                            <button (click)="moveExercise(ex.id, -1)" [disabled]="i === 0" class="flex-1 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-bold transition-colors text-black dark:text-white">
                              &uarr; Move Up
                            </button>
                            <button (click)="moveExercise(ex.id, 1)" [disabled]="i === exercises().length - 1" class="flex-1 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-bold transition-colors text-black dark:text-white">
                              &darr; Move Down
                            </button>
                          </div>
                        </div>
                        <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl flex flex-col gap-2">
                          <button (click)="startReplaceExercise(ex.id)" class="w-full py-2 bg-accent-neg/10 text-accent-neg hover:bg-accent-neg/20 border border-accent-neg/20 rounded-lg text-sm font-bold transition-colors">
                            Replace Exercise
                          </button>
                          <p class="text-xs text-gray-500 text-center mt-1">Logged sets for this exercise will be removed.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                }
                
                @if (replacingExerciseId() === ex.id) {
                  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 dark:bg-black/80 backdrop-blur-sm">
                    <div class="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative p-6 h-[80vh] flex flex-col">
                      <button (click)="cancelReplace()" class="absolute top-4 right-4 text-gray-500 hover:text-black dark:hover:text-white z-10">✕</button>
                      <h3 class="text-xl font-bold mb-4 text-black dark:text-white shrink-0">Replace {{ ex.exerciseName }}</h3>
                      <div class="flex-1 overflow-y-auto min-h-0">
                        <app-exercise-search [excludeIds]="existingExerciseIds()" (exerciseSelected)="onReplaceExerciseSelected($event)"></app-exercise-search>
                      </div>
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

          <!-- Non-sticky Finish / End Early Button -->
          <div class="mt-8 mb-4 text-center">
            @if (!session()?.completedAt) {
              <button
                (click)="completeWorkout()"
                [disabled]="isCompleting()"
                class="px-6 py-3 text-gray-500 hover:text-accent-pos dark:text-gray-400 dark:hover:text-accent-pos border border-gray-300 dark:border-gray-700 hover:border-accent-pos dark:hover:border-accent-pos rounded-xl transition-colors bg-transparent shadow-sm w-full md:w-auto"
                >
                {{ isCompleting() ? 'Completing...' : 'End Workout Early' }}
              </button>
            } @else {
              <button
                (click)="uncompleteWorkout()"
                [disabled]="isCompleting()"
                class="px-6 py-3 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 text-black dark:text-white font-bold rounded-xl transition-colors shadow-sm w-full md:w-auto"
                >
                {{ isCompleting() ? 'Reopening...' : 'Uncomplete & Edit' }}
              </button>
            }
          </div>
        </div>
      }
    </div>
      <!-- Fixed Bottom Action Bar -->
      @if (!isLoading() && session()) {
        <div class="fixed bottom-16 md:bottom-6 left-0 right-0 md:left-1/2 md:-translate-x-1/2 w-full md:max-w-2xl mx-auto p-4 md:p-6 bg-white/90 dark:bg-black/90 backdrop-blur-md border-t md:border border-gray-300 dark:border-gray-800 rounded-t-2xl md:rounded-2xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)] z-40 flex flex-col items-center">
          <div class="w-full max-w-sm mb-3">
            <div class="w-full h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
              <div class="h-full bg-accent-pos transition-all duration-500 ease-out"
                   [style.width.%]="getTotalExpectedSets() > 0 ? (getTotalLoggedSets() / getTotalExpectedSets()) * 100 : 0"></div>
            </div>
          </div>
          <div class="w-full max-w-sm">
            @if (!session()?.completedAt) {
              @if (getActiveExercise(); as activeEx) {
                <button
                  (click)="logSet(activeEx)"
                  [disabled]="getForm(activeEx.id).invalid || isLoggingSet()"
                  class="w-full py-3 text-white font-bold text-lg rounded-xl transition-all transform hover:scale-[1.02] active:scale-95 shadow-md disabled:opacity-50 bg-accent-pos hover:opacity-90 flex flex-col items-center justify-center"
                  style="box-shadow: 0 0 20px var(--color-accent-pos);"
                  >
                  <span>{{ isLoggingSet() ? 'Logging...' : 'Log Set' }}</span>
                </button>
              } @else {
                <button
                  (click)="completeWorkout()"
                  [disabled]="isCompleting()"
                  class="w-full py-3 text-white font-bold text-lg rounded-xl transition-all transform hover:scale-[1.02] active:scale-95 shadow-md disabled:opacity-50 bg-accent-pos hover:opacity-90 flex flex-col items-center justify-center"
                  style="box-shadow: 0 0 20px var(--color-accent-pos);"
                  >
                  <span>{{ isCompleting() ? 'Completing...' : 'Finish Workout' }}</span>
                </button>
              }
            } @else {
              <div class="text-center font-bold text-lg text-accent-pos">
                Workout Complete!
              </div>
            }
          </div>
        </div>
      }
    
    
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
  private analyticsService = inject(AnalyticsService);

  /** Tracks which icon tooltip is currently visible. Key format: `${dayExerciseId}-${type}`. */
  activeIconTooltip = signal<string | null>(null);

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

  showAddExercise = signal<boolean>(false);
  selectedExercise = signal<Exercise | null>(null);
  isCreatingNewExercise = signal<boolean>(false);
  isSavingNewExercise = signal<boolean>(false);

  editingSetId = signal<string | null>(null);
  isSavingEdit = signal<boolean>(false);
  
  editSetForm: FormGroup = this.fb.group({
    weightKg: [0, [Validators.required, Validators.min(0)]],
    repsCompleted: [0, [Validators.required, Validators.min(0)]],
    repsCompletedRight: [null, [Validators.min(0)]]
  });

  notesControl = new FormControl('');

  // Map of exerciseId -> FormGroup
  forms = new Map<string, FormGroup>();
  
  optionsModalOpen = signal<string | null>(null);
  replacingExerciseId = signal<string | null>(null);
  exerciseUnits = signal<Record<string, 'kg' | 'lb'>>({});

  exerciseForm: FormGroup = this.fb.group({
    exerciseId: ['', Validators.required],
    sets: [3],
    reps: [10],
    repsMax: [null]
  });

  collapsedExercises = new Set<string>();

  /**
   * Closes any open icon tooltip when the user clicks anywhere on the document.
   */
  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.activeIconTooltip()) {
      this.activeIconTooltip.set(null);
    }
  }

  /**
   * Toggles the icon tooltip for the given key.
   * If the same key is clicked again, the tooltip is dismissed.
   *
   * @param key Unique identifier combining dayExerciseId and icon type.
   */
  toggleIconTooltip(key: string): void {
    this.activeIconTooltip.update(current => current === key ? null : key);
  }

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
    for (const ex of exercises) {
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

  openOptionsModal(exId: string) {
    this.optionsModalOpen.set(exId);
  }

  closeOptionsModal() {
    this.optionsModalOpen.set(null);
  }

  startReplaceExercise(exId: string) {
    this.closeOptionsModal();
    this.replacingExerciseId.set(exId);
  }

  cancelReplace() {
    this.replacingExerciseId.set(null);
  }

  onReplaceExerciseSelected(newExercise: Exercise) {
    const sessionExerciseId = this.replacingExerciseId();
    const sessionId = this.sessionId();
    if (!sessionExerciseId || !sessionId) return;
    
    if (!confirm('Are you sure you want to replace this exercise? Any logged sets will be deleted.')) {
      return;
    }

    this.workoutService.replaceSessionExercise(sessionId, sessionExerciseId, { newExerciseId: newExercise.id }).subscribe({
      next: () => {
        this.loadWorkoutData();
        this.replacingExerciseId.set(null);
      },
      error: (err) => {
        console.error('Failed to replace exercise', err);
        alert('Failed to replace exercise');
      }
    });
  }

  startEditSet(set: WorkoutSetResponse, exId: string) {
    this.editingSetId.set(set.id);
    const unit = this.getUnit(exId);
    let displayWeight = set.weightKg;
    if (unit === 'lb' && displayWeight != null) {
      displayWeight = parseFloat((displayWeight * 2.20462).toFixed(1));
    }
    this.editSetForm.patchValue({
      weightKg: displayWeight,
      repsCompleted: set.repsCompleted,
      repsCompletedRight: set.repsCompletedRight
    });
  }

  cancelEditSet() {
    this.editingSetId.set(null);
    this.editSetForm.reset();
  }

  saveEditSet(exId: string) {
    const setId = this.editingSetId();
    if (!setId || this.editSetForm.invalid || this.isSavingEdit()) return;

    this.isSavingEdit.set(true);
    const formVal = this.editSetForm.value;
    const unit = this.getUnit(exId);
    let weightKg = formVal.weightKg;
    
    if (weightKg != null && unit === 'lb') {
      weightKg = parseFloat((weightKg / 2.20462).toFixed(1));
    }

    const originalSet = this.loggedSets().find(s => s.id === setId);
    if (!originalSet) {
       this.isSavingEdit.set(false);
       return;
    }

    const request = {
      sessionExerciseId: originalSet.sessionExerciseId,
      setNumber: originalSet.setNumber,
      weightKg: weightKg,
      repsCompleted: formVal.repsCompleted,
      repsCompletedRight: formVal.repsCompletedRight,
      rpe: null
    };

    this.workoutService.updateSet(setId, request).subscribe({
      next: (updatedSet) => {
        const currentSets = [...this.loggedSets()];
        const idx = currentSets.findIndex(s => s.id === setId);
        if (idx !== -1) {
          currentSets[idx] = updatedSet;
          this.loggedSets.set(currentSets);
        } else {
           this.loadWorkoutData();
        }
        this.cancelEditSet();
        this.isSavingEdit.set(false);
      },
      error: (err) => {
        console.error('Failed to update set', err);
        this.isSavingEdit.set(false);
        alert('Failed to update set.');
      }
    });
  }

  getUnit(exId: string): 'kg' | 'lb' {
    return this.exerciseUnits()[exId] || 'kg';
  }

  toggleUnit(exId: string) {
    const current = this.getUnit(exId);
    const newUnit = current === 'kg' ? 'lb' : 'kg';
    this.exerciseUnits.update(units => ({...units, [exId]: newUnit}));
    
    const form = this.getForm(exId);
    const currentWeight = form.value.weightKg;
    if (currentWeight) {
      if (newUnit === 'lb') {
        form.patchValue({weightKg: parseFloat((currentWeight * 2.20462).toFixed(1))});
      } else {
        form.patchValue({weightKg: parseFloat((currentWeight / 2.20462).toFixed(1))});
      }
    }
  }

  getDisplayWeight(kg: number | undefined | null, exId: string): string {
    if (kg == null) return '0';
    const unit = this.getUnit(exId);
    if (unit === 'lb') {
      return (kg * 2.20462).toFixed(1).replace(/\.0$/, '');
    }
    return kg.toString();
  }

  moveExercise(exId: string, direction: -1 | 1) {
    const currentExercises = [...this.exercises()];
    const idx = currentExercises.findIndex(ex => ex.id === exId);
    if (idx === -1) return;
    if (idx + direction < 0 || idx + direction >= currentExercises.length) return;
    
    // Swap
    const temp = currentExercises[idx];
    currentExercises[idx] = currentExercises[idx + direction];
    currentExercises[idx + direction] = temp;
    
    currentExercises.forEach((ex, i) => ex.sortOrder = i);
    this.exercises.set(currentExercises);
    
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

            if (this.session()?.completedAt) {
              this.buildChartData();
            }

            this.isLoading.set(false);
            setTimeout(() => this.scrollToFirstIncompleteExercise(), 300);
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
        if (lastSet.weightKg != null) {
          const unit = this.getUnit(ex.id);
          defaultWeight = unit === 'lb' 
            ? (lastSet.weightKg * 2.20462).toFixed(1).replace(/\.0$/, '') 
            : lastSet.weightKg.toString();
        }
        defaultReps = lastSet.repsCompleted || '';
        defaultRepsRight = lastSet.repsCompletedRight || '';
      } else {
        const suggestion = this.getSuggestion(ex.id);
        let baseWeightKg: number | null = null;
        if (suggestion?.suggestedWeightKg != null) {
          baseWeightKg = suggestion.suggestedWeightKg;
        } else if (ex.isBodyweight && this.latestBodyWeight() !== null) {
          baseWeightKg = this.latestBodyWeight()!;
        }
        
        if (baseWeightKg != null) {
          const unit = this.getUnit(ex.id);
          defaultWeight = unit === 'lb' 
            ? (baseWeightKg * 2.20462).toFixed(1).replace(/\.0$/, '') 
            : baseWeightKg.toString();
        }
      }

      this.forms.set(ex.id, this.fb.group({
        weightKg: [defaultWeight, [Validators.required, Validators.min(0)]],
        repsCompleted: [defaultReps, [Validators.required, Validators.min(0)]],
        repsCompletedRight: [defaultRepsRight, [Validators.min(0)]]
      }));
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
      let accentColor = '#8b5cf6';
      if (typeof window !== 'undefined') {
        accentColor = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-pos').trim() || '#8b5cf6';
      }
      
      const currentSessionAt = this.session()?.startedAt;
      let currentSessionDate: string | null = null;
      if (currentSessionAt) {
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

  getForm(exerciseId: string): FormGroup {
    return this.forms.get(exerciseId) as FormGroup;
  }

  getSetsForExercise(exerciseId: string) {
    return this.loggedSets()
      .filter(s => s.sessionExerciseId === exerciseId)
      .sort((a, b) => a.setNumber - b.setNumber);
  }

  getActiveExercise(): DayExercise | undefined {
    return this.exercises().find(ex => this.getSetsForExercise(ex.id).length < (ex.sets || 1));
  }

  getLastSetForExercise(exerciseId: string): WorkoutSetResponse | null {
    const sets = this.getSetsForExercise(exerciseId);
    return sets.length > 0 ? sets[sets.length - 1] : null;
  }

  hasPrForExercise(exerciseId: string): boolean {
    return this.getSetsForExercise(exerciseId).some(set => set.isNewPr);
  }

  /**
   * Returns true if any set logged in the current session for the given session-exercise
   * has a CRITICAL performance status (i.e. a "Perf Drop"), meaning the athlete's
   * output fell below 75 % of their best set this session.
   */
  hasPerfDropForExercise(sessionExerciseId: string): boolean {
    return this.getSetsForExercise(sessionExerciseId).some(
      set => set.performanceStatus === 'CRITICAL'
    );
  }

  getSuggestion(dayExerciseId: string) {
    return this.suggestions().get(dayExerciseId);
  }

  getSuggestionForNextSet(dayExerciseId: string) {
    const suggestion = this.getSuggestion(dayExerciseId);
    if (!suggestion || !suggestion.previousSets || suggestion.previousSets.length === 0) return null;
    
    const setsDone = this.getSetsForExercise(dayExerciseId).length;
    const nextSetNumber = setsDone + 1;
    
    // Find the specific set from last week, or fallback to the last set they did if they are doing extra sets
    let targetSet = suggestion.previousSets.find(s => s.setNumber === nextSetNumber);
    if (!targetSet) {
      targetSet = suggestion.previousSets[suggestion.previousSets.length - 1];
    }
    
    return targetSet;
  }

  getPerfContainerClass(status: 'GOOD' | 'WARNING' | 'CRITICAL' | undefined): string {
    if (status === 'CRITICAL') return 'border-accent-neg/50 bg-accent-neg/10';
    if (status === 'WARNING') return 'border-accent-pos/50 bg-accent-pos/10';
    if (status === 'GOOD') return 'border-gray-300 dark:border-gray-600';
    return 'border-gray-300 dark:border-gray-600';
  }

  getPerfBadgeClass(status: 'GOOD' | 'WARNING' | 'CRITICAL' | undefined): string {
    if (status === 'CRITICAL') return 'bg-accent-neg/20 text-accent-neg border-accent-neg/30';
    if (status === 'WARNING') return 'bg-accent-pos/20 text-accent-pos border-accent-pos/30';
    if (status === 'GOOD') return 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600';
    return 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600';
  }

  getPerfTextClass(status: 'GOOD' | 'WARNING' | 'CRITICAL' | undefined): string {
    if (status === 'CRITICAL') return 'text-accent-neg';
    if (status === 'WARNING') return 'text-accent-pos';
    if (status === 'GOOD') return 'text-gray-800 dark:text-gray-200';
    return 'text-gray-800 dark:text-gray-200';
  }

  getPerfSubtextClass(status: 'GOOD' | 'WARNING' | 'CRITICAL' | undefined): string {
    if (status === 'CRITICAL') return 'text-accent-neg/70';
    if (status === 'WARNING') return 'text-accent-pos/70';
    if (status === 'GOOD') return 'text-gray-500';
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

    let weightToLog = form.value.weightKg;
    if (this.getUnit(ex.id) === 'lb' && weightToLog != null) {
      weightToLog = parseFloat((weightToLog / 2.20462).toFixed(2));
    }

    const request = {
      sessionExerciseId: ex.id,
      setNumber: setNumber,
      repsCompleted: form.value.repsCompleted,
      repsCompletedRight: ex.unilateral ? form.value.repsCompletedRight : null,
      weightKg: weightToLog
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

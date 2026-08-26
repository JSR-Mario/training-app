import { Component, OnInit, OnDestroy, HostListener, inject, signal, computed } from '@angular/core';
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
  ExerciseSuggestionResponse,
  SessionExerciseRequest,
  SessionExerciseReplaceRequest,
  SessionExerciseUpdateRequest
} from '../../../../core/types/training.types';
import { ExerciseSearchComponent } from '../../../exercises/components/exercise-search/exercise-search.component';
import { ExerciseFormComponent, ExerciseFormData } from '../../../exercises/components/exercise-form/exercise-form.component';
import { BodyWeightService } from '../../../analytics/services/body-weight.service';
import { AnalyticsService } from '../../../analytics/services/analytics.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { DayVolumeEntry } from '../../../../core/types/analytics.types';

@Component({
  standalone: true,
  selector: 'app-active-workout',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, ExerciseSearchComponent, ExerciseFormComponent, BaseChartDirective],
  template: `
    <div class="max-w-6xl mx-auto space-y-6 pt-2 pb-12">
    
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
          <div class="flex items-start justify-between mb-4">
            <div>
              <h1 class="text-2xl sm:text-3xl font-bold text-black dark:text-white mb-1">{{ session()?.dayTemplateName }}</h1>
              <p class="text-gray-500 dark:text-gray-400 text-sm">Week {{ session()?.weekNumber }} &bull; {{ session()?.performedOn | date:'mediumDate' }}</p>
            </div>
            <div class="flex items-center gap-3">
              @if (!session()?.completedAt) {
                <div class="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-xs font-mono font-medium shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-accent-pos transition-transform duration-300 shrink-0" [class.animate-pulse]="!isPaused()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span class="text-black dark:text-white font-bold text-sm tracking-wider whitespace-nowrap">{{ formattedTimerDisplay() }}</span>
                  
                  <button
                    type="button"
                    (click)="togglePauseWorkout()"
                    [disabled]="isTimerActionLoading()"
                    class="ml-1 px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer border"
                    [class.bg-amber-500/20]="isPaused()"
                    [class.text-amber-500]="isPaused()"
                    [class.border-amber-500/30]="isPaused()"
                    [class.bg-accent-pos/20]="!isPaused()"
                    [class.text-accent-pos]="!isPaused()"
                    [class.border-accent-pos/30]="!isPaused()">
                    @if (isPaused()) {
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <span>RESUME</span>
                    } @else {
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                      <span>PAUSE</span>
                    }
                  </button>
                </div>
              } @else {
                <div class="px-3 py-1 bg-accent-pos/20 text-accent-pos text-xs rounded-xl border border-accent-pos/30 font-medium">
                  Completed
                </div>
              }
            </div>
          </div>

          <!-- Mobile Workout Progress Bar (Sticky on mobile) -->
          @if (!session()?.completedAt) {
            <div class="lg:hidden sticky top-16 z-20 mb-6 p-3.5 sm:p-4 solid-card border border-gray-300 dark:border-gray-700 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-md shadow-md">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Workout Progress</span>
                <span class="text-xs font-bold text-black dark:text-white">{{ getTotalLoggedSets() }} / {{ getTotalExpectedSets() }} Sets ({{ getTotalExpectedSets() > 0 ? Math.round((getTotalLoggedSets() / getTotalExpectedSets()) * 100) : 0 }}%)</span>
              </div>
              <div class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div class="h-full bg-accent-pos transition-all duration-500 ease-out"
                     [style.width.%]="getTotalExpectedSets() > 0 ? (getTotalLoggedSets() / getTotalExpectedSets()) * 100 : 0"></div>
              </div>
            </div>
          }

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

          <!-- Main Layout Grid: Desktop Sidebar (Left) + Exercise Feed (Right) -->
          <div class="lg:flex lg:gap-8 lg:items-start">
            
            <!-- Desktop Left Sticky Sidebar -->
            <aside class="hidden lg:block lg:w-80 shrink-0 sticky top-20 space-y-4">
              <!-- Workout Progress Card -->
              <div class="solid-card p-5 border border-gray-300 dark:border-gray-700">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Workout Progress</span>
                  <span class="text-sm font-bold text-black dark:text-white">{{ getTotalLoggedSets() }} / {{ getTotalExpectedSets() }} Sets</span>
                </div>
                <div class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                  <div class="h-full bg-accent-pos transition-all duration-500 ease-out"
                       [style.width.%]="getTotalExpectedSets() > 0 ? (getTotalLoggedSets() / getTotalExpectedSets()) * 100 : 0"></div>
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                  <span>{{ getTotalExpectedSets() > 0 ? Math.round((getTotalLoggedSets() / getTotalExpectedSets()) * 100) : 0 }}% Complete</span>
                  @if (!session()?.completedAt) {
                    <span class="text-accent-pos font-medium">In Progress</span>
                  } @else {
                    <span class="text-accent-pos font-medium">Finished</span>
                  }
                </div>
              </div>

              <!-- Exercise Quick Navigation List -->
              <div class="solid-card p-4 border border-gray-300 dark:border-gray-700 space-y-2">
                <div class="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-800">
                  <span class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Exercises ({{ exercises().length }})</span>
                </div>
                <div class="space-y-1 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
                  @for (item of exercises(); track item.id; let idx = $index) {
                    <button
                      type="button"
                      (click)="scrollToExercise(item.id)"
                      class="w-full text-left p-2 rounded-xl transition-all flex items-center justify-between gap-2 hover:bg-gray-100 dark:hover:bg-gray-800/60 group"
                      [class.bg-accent-pos/10]="activeLoggingExercise()?.id === item.id && !isExerciseCompleted(item.id, item.sets)">
                      <div class="flex items-center gap-2 min-w-0">
                        @if (isExerciseCompleted(item.id, item.sets)) {
                          <span class="w-5 h-5 rounded-full bg-accent-pos/20 text-accent-pos flex items-center justify-center text-xs shrink-0 font-bold">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        } @else if (activeLoggingExercise()?.id === item.id) {
                          <span class="w-5 h-5 rounded-full bg-accent-pos/20 text-accent-pos flex items-center justify-center text-xs shrink-0 animate-pulse">
                            <div class="w-2 h-2 rounded-full bg-accent-pos"></div>
                          </span>
                        } @else {
                          <span class="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center text-[10px] font-mono text-gray-400 shrink-0">
                            {{ idx + 1 }}
                          </span>
                        }
                        <span class="text-xs font-medium text-black dark:text-white truncate group-hover:text-accent-pos transition-colors inline-flex items-center gap-1 min-w-0">
                          @if (item.isPublic) {
                            <svg class="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          }
                          <span class="truncate">{{ item.exerciseName || 'Exercise ' + (idx + 1) }}</span>
                          @if (item.equipmentBrand) {
                            <span class="text-[10px] text-gray-500 dark:text-gray-400 font-normal shrink-0">({{ item.equipmentBrand }})</span>
                          }
                        </span>
                      </div>
                      <span class="text-[11px] font-mono shrink-0"
                            [class.text-accent-pos]="isExerciseCompleted(item.id, item.sets)"
                            [class.text-gray-400]="!isExerciseCompleted(item.id, item.sets)">
                        {{ getSetsForExercise(item.id).length }}/{{ item.sets || 1 }}
                      </span>
                    </button>
                  }
                </div>
              </div>

              <!-- Finish / Cancel Actions in Sidebar -->
              <div class="pt-2 flex flex-col gap-2">
                @if (!session()?.completedAt) {
                  <button
                    (click)="completeWorkout()"
                    [disabled]="isCompleting()"
                    class="w-full py-3 bg-accent-pos hover:opacity-90 active:scale-95 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{{ isCompleting() ? 'Completing...' : 'Finish Workout' }}</span>
                  </button>
                  <button
                    (click)="cancelWorkout()"
                    class="w-full py-2.5 text-accent-neg hover:bg-accent-neg/10 border border-accent-neg/30 rounded-xl transition-colors text-xs font-medium flex items-center justify-center gap-1.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Cancel Workout</span>
                  </button>
                } @else {
                  <button
                    (click)="uncompleteWorkout()"
                    [disabled]="isCompleting()"
                    class="w-full py-3 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 text-black dark:text-white font-bold rounded-xl transition-colors"
                  >
                    {{ isCompleting() ? 'Reopening...' : 'Uncomplete & Edit' }}
                  </button>
                }
              </div>
            </aside>

            <!-- Main Exercise Cards Feed (Right Column) -->
            <div class="flex-1 min-w-0 space-y-6">
              @if (exercises().length === 0) {
                <div class="text-center py-12 solid-card">
                  <p class="text-gray-500 dark:text-gray-400">This workout day has no exercises configured.</p>
                </div>
              }
              @for (ex of exercises(); track ex.id; let i = $index) {
                <div [id]="'exercise-' + ex.id"
                     class="solid-card p-4 sm:p-6 relative transition-all duration-300 scroll-mt-24"
                     [class.z-20]="activeIconTooltip()?.startsWith(ex.id)">
                  <!-- Exercise Header with Expanded Tappable Area for Minimize/Collapse -->
                  <div (click)="toggleCollapse(ex.id)"
                       (keydown.enter)="toggleCollapse(ex.id)"
                       tabindex="0"
                       role="button"
                       class="flex items-start justify-between mb-4 border-b border-gray-300 dark:border-gray-700 pb-4 cursor-pointer select-none group focus:outline-none">
                    <div class="flex-1 pr-4 min-w-0">
                      <div class="flex flex-wrap items-center gap-2 mb-1">
                        <h2 class="text-xl font-bold text-black dark:text-white group-hover:text-accent-pos transition-colors inline-flex items-center gap-2 flex-wrap">
                          @if (ex.isPublic) {
                            <svg class="w-4 h-4 text-purple-500 dark:text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          }
                          <span>{{ ex.exerciseName || 'Exercise ' + ex.exerciseId }}</span>
                          @if (ex.equipmentBrand) {
                            <span class="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-700 tracking-normal font-normal">
                              {{ ex.equipmentBrand }}
                            </span>
                          }
                        </h2>

                        @if (getSuggestion(ex.id)?.hadFatigueLastWeek) {
                          <div class="relative">
                            <button
                              type="button"
                              (click)="$event.stopPropagation(); toggleIconTooltip(ex.id + '-fatigue', $event)"
                              class="w-6 h-6 text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded flex items-center justify-center cursor-pointer"
                              title="Fatigue detected">
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </button>
                            @if (activeIconTooltip() === ex.id + '-fatigue' && tooltipPosition()) {
                              <div
                                class="fixed z-50 w-52 max-w-[calc(100vw-32px)] p-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs rounded-lg shadow-xl text-center leading-relaxed pointer-events-none"
                                [style.left.px]="tooltipPosition()!.left"
                                [style.top.px]="tooltipPosition()!.top">
                                Fatigue detected in the last session.
                                <div
                                  class="absolute bottom-full border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900 dark:border-b-white -ml-1"
                                  [style.left.px]="tooltipPosition()!.arrowLeft">
                                </div>
                              </div>
                            }
                          </div>
                        }
                        @if (getSuggestion(ex.id)?.suggestAddWeight && !hasPerfDropForExercise(ex.id) && !getSuggestion(ex.id)?.hadFatigueLastWeek) {
                          <div class="relative">
                            <button
                              type="button"
                              (click)="$event.stopPropagation(); toggleIconTooltip(ex.id + '-weight', $event)"
                              class="w-6 h-6 text-accent-pos bg-accent-pos/10 border border-accent-pos/20 rounded flex items-center justify-center cursor-pointer"
                              title="Increase weight">
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                            </button>
                            @if (activeIconTooltip() === ex.id + '-weight' && tooltipPosition()) {
                              <div
                                class="fixed z-50 w-52 max-w-[calc(100vw-32px)] p-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs rounded-lg shadow-xl text-center leading-relaxed pointer-events-none"
                                [style.left.px]="tooltipPosition()!.left"
                                [style.top.px]="tooltipPosition()!.top">
                                Increase weight
                                <div
                                  class="absolute bottom-full border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900 dark:border-b-white -ml-1"
                                  [style.left.px]="tooltipPosition()!.arrowLeft">
                                </div>
                              </div>
                            }
                          </div>
                        }
                        @if (hasPrForExercise(ex.id)) {
                          <div class="relative">
                            <button
                              type="button"
                              (click)="$event.stopPropagation(); toggleIconTooltip(ex.id + '-pr', $event)"
                              class="w-6 h-6 text-accent-pos bg-accent-pos/10 border border-accent-pos/20 rounded flex items-center justify-center cursor-pointer animate-pulse text-[10px] font-bold uppercase"
                              title="PR!">
                              PR!
                            </button>
                            @if (activeIconTooltip() === ex.id + '-pr' && tooltipPosition()) {
                              <div
                                class="fixed z-50 w-52 max-w-[calc(100vw-32px)] p-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs rounded-lg shadow-xl text-center leading-relaxed pointer-events-none"
                                [style.left.px]="tooltipPosition()!.left"
                                [style.top.px]="tooltipPosition()!.top">
                                {{ getPrTooltipText(ex.id) }}
                                <div
                                  class="absolute bottom-full border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900 dark:border-b-white -ml-1"
                                  [style.left.px]="tooltipPosition()!.arrowLeft">
                                </div>
                              </div>
                            }
                          </div>
                        }
                      </div>

                      @if (!isCollapsed(ex.id) && !session()?.completedAt) {
                        <p class="text-gray-500 dark:text-gray-400 text-sm">
                          Goal: {{ ex.sets }} sets &times; 
                          @if (ex.isAmrap) {
                            AMRAP
                          } @else {
                            {{ ex.reps }}{{ ex.repsMax ? '-' + ex.repsMax : '' }} reps
                          }
                        </p>
                      }
                    </div>
                    
                    <div class="flex items-center gap-1 border-l border-gray-200 dark:border-gray-700 pl-3 shrink-0">
                      @if (!session()?.completedAt) {
                        <button (click)="$event.stopPropagation(); openOptionsModal(ex.id)" class="p-2 text-gray-400 hover:text-accent-pos hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" title="Options">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                      }
                      <button (click)="$event.stopPropagation(); toggleCollapse(ex.id)"
                        class="p-2 rounded-lg transition-colors border flex items-center justify-center text-gray-500 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700"
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

                  @if (!isCollapsed(ex.id)) {
                    <div [class.mt-4]="session()?.completedAt">
                      <!-- Logged Sets -->
                      <div class="space-y-1.5 mb-4">
                        @for (set of getSetsForExercise(ex.id); track set.id; let last = $last) {
                          <div class="transition-all duration-300" [class.scale-105]="isLogging(ex.id) && last">
                          @if (editingSetId() === set.id) {
                            <div class="flex items-center justify-between bg-white dark:bg-gray-800 py-2 px-3 rounded-lg border border-accent-pos/50 shadow-sm">
                              <form [formGroup]="editSetForm" (ngSubmit)="saveEditSet(ex.id)" class="flex items-center w-full gap-2">
                                <span class="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-black dark:text-white">
                                  {{ set.setNumber }}
                                </span>
                                <div class="flex items-center flex-1 gap-2 overflow-hidden">
                                  <input type="number" formControlName="weightKg" class="w-16 sm:w-20 px-2 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-sm text-black dark:text-white text-center outline-none focus:border-accent-pos" step="0.5" min="0">
                                  <span class="text-xs text-gray-500">{{ getUnit(ex.id) }} &times;</span>
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
                                  {{ getDisplayWeight(set.weightKg, ex.id) }} <span class="text-xs uppercase" [ngClass]="getPerfSubtextClass(set.performanceStatus)">{{ getUnit(ex.id) }}</span> &times;
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
                                  @if (set.performanceStatus === 'WARMUP') {
                                    <span class="ml-2 text-[10px] uppercase font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-1.5 py-0.5 rounded" title="Build-up Set">!</span>
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

                      <!-- Log New Set Form with Full-Width Log Set Button -->
                      @if (!session()?.completedAt && getSetsForExercise(ex.id).length < (ex.sets || 1)) {
                        <div class="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                          <div class="mb-3 flex items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                            <div class="flex items-center gap-2">
                              <span class="w-6 h-6 rounded-full bg-accent-pos/20 text-accent-pos flex items-center justify-center text-xs font-bold border border-accent-pos/30">
                                {{ getSetsForExercise(ex.id).length + 1 }}
                              </span>
                              <span class="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                                Next Set
                              </span>
                            </div>
                            @if (getSuggestionForNextSet(ex.id)) {
                              <div class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                @if (getSuggestion(ex.id)?.repRangeChanged) {
                                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" title="Rep range changed since last session">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                  <span class="line-through text-gray-400 dark:text-gray-500">Last week: <span class="font-bold">{{ getDisplayWeight(getSuggestionForNextSet(ex.id)?.weightKg, ex.id) }}{{ getUnit(ex.id) }} &times; @if (ex.unilateral) { {{ getSuggestionForNextSet(ex.id)?.reps }} / {{ getSuggestionForNextSet(ex.id)?.repsRight ?? getSuggestionForNextSet(ex.id)?.reps }} } @else { {{ getSuggestionForNextSet(ex.id)?.reps }} }</span></span>
                                } @else {
                                  Last week: <span class="font-bold text-gray-700 dark:text-gray-300">{{ getDisplayWeight(getSuggestionForNextSet(ex.id)?.weightKg, ex.id) }}{{ getUnit(ex.id) }} &times; @if (ex.unilateral) { {{ getSuggestionForNextSet(ex.id)?.reps }} / {{ getSuggestionForNextSet(ex.id)?.repsRight ?? getSuggestionForNextSet(ex.id)?.reps }} } @else { {{ getSuggestionForNextSet(ex.id)?.reps }} }</span>
                                }
                              </div>
                            }
                          </div>
                          <form [formGroup]="getForm(ex.id)" (ngSubmit)="logSet(ex)" class="space-y-3">
                            <div class="flex items-end gap-3 flex-wrap sm:flex-nowrap">
                              <div class="flex-1 min-w-[90px]">
                                <label [for]="'weight-' + ex.id" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Weight ({{ getUnit(ex.id) }})</label>
                                <input [id]="'weight-' + ex.id" type="number" inputmode="decimal" step="0.5" min="0" formControlName="weightKg" (input)="markExerciseTouched(ex.id)" [placeholder]="getDisplayWeight(getSuggestionForNextSet(ex.id)?.weightKg || getSuggestion(ex.id)?.suggestedWeightKg, ex.id) || '0'" class="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-accent-pos outline-none text-black dark:text-white text-lg font-bold text-center placeholder:italic placeholder:text-gray-400 dark:placeholder:text-gray-500/60">
                              </div>
                              <div class="flex-1 min-w-[80px]">
                                <label [for]="'reps-' + ex.id" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{{ ex.unilateral ? 'Reps (L)' : 'Reps' }}</label>
                                <input [id]="'reps-' + ex.id" type="number" inputmode="numeric" min="0" formControlName="repsCompleted" (input)="markExerciseTouched(ex.id)" [placeholder]="getSuggestionForNextSet(ex.id)?.reps || getSuggestion(ex.id)?.suggestedReps || ex.reps || '0'" class="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-accent-pos outline-none text-black dark:text-white text-lg font-bold text-center placeholder:italic placeholder:text-gray-400 dark:placeholder:text-gray-500/60">
                              </div>
                              @if (ex.unilateral) {
                                <div class="flex-1 min-w-[80px]">
                                  <label [for]="'reps-r-' + ex.id" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Reps (R)</label>
                                  <input [id]="'reps-r-' + ex.id" type="number" inputmode="numeric" min="0" formControlName="repsCompletedRight" (input)="markExerciseTouched(ex.id)" [placeholder]="getSuggestionForNextSet(ex.id)?.repsRight ?? getSuggestionForNextSet(ex.id)?.reps || getSuggestion(ex.id)?.suggestedReps || ex.reps || '0'" class="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-accent-pos outline-none text-black dark:text-white text-lg font-bold text-center placeholder:italic placeholder:text-gray-400 dark:placeholder:text-gray-500/60">
                                </div>
                              }
                            </div>
                            
                            <button
                              type="submit"
                              [disabled]="getForm(ex.id).invalid || isLogging(ex.id)"
                              class="w-full py-2.5 sm:py-3 bg-accent-pos hover:opacity-90 active:scale-[0.98] text-white font-bold text-base rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                            >
                              @if (isLogging(ex.id)) {
                                <span>Logging...</span>
                              } @else {
                                <span>Log Set</span>
                              }
                            </button>
                          </form>
                        </div>
                      }
                      
                      <!-- Rating Section (1 to 10 with Outline Circle for Unrated) -->
                      @if (!session()?.completedAt) {
                        <div class="pt-4 border-t border-gray-300 dark:border-gray-700/50 mt-4">
                          <div class="flex gap-1 sm:gap-1.5 justify-between sm:justify-start w-full items-center">
                            <button
                              (click)="deleteRating(ex.id)"
                              [class.bg-gray-200]="getRating(ex.id) !== null"
                              [class.dark:bg-gray-800]="getRating(ex.id) !== null"
                              [class.text-gray-500]="getRating(ex.id) !== null"
                              [class.border-2]="getRating(ex.id) === null"
                              [class.border-gray-400]="getRating(ex.id) === null"
                              [class.dark:border-gray-500]="getRating(ex.id) === null"
                              [class.text-gray-400]="getRating(ex.id) === null"
                              title="Unrated (Click to clear rating)"
                              class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-xs font-bold hover:border-accent-pos hover:text-accent-pos transition-colors"
                              >
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <circle cx="12" cy="12" r="7" stroke="currentColor" stroke-width="2" fill="none" />
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

              <!-- Add Exercise Form -->
              @if (!session()?.completedAt) {
                <div>
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
                            <div class="text-black dark:text-white inline-flex items-center gap-2 flex-wrap text-sm">
                              <span class="font-medium text-gray-500 dark:text-gray-400">Selected:</span>
                              @if (selectedExercise()?.isPublic) {
                                <svg class="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                              }
                              <span class="font-semibold">{{ selectedExercise()?.name }}</span>
                              @if (selectedExercise()?.equipmentBrand) {
                                <span class="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-700">
                                  {{ selectedExercise()?.equipmentBrand }}
                                </span>
                              }
                            </div>
                            <div>
                              <label for="setsInput" class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Sets</label>
                              <input id="setsInput" type="number" formControlName="sets" min="1" class="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-accent-pos outline-none text-black dark:text-white text-sm">
                            </div>

                            <div class="flex items-center gap-3">
                              <label class="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  formControlName="isAmrap"
                                  class="sr-only peer"
                                  id="addExerciseIsAmrap"
                                >
                                <div class="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent-pos rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-pos"></div>
                              </label>
                              <label for="addExerciseIsAmrap" class="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                                AMRAP
                                <span class="text-gray-500 dark:text-gray-400 text-xs ml-1">(As Many Reps As Possible)</span>
                              </label>
                            </div>

                            @if (!exerciseForm.get('isAmrap')?.value) {
                              <div class="flex gap-4">
                                <div class="flex-1">
                                  <label for="repsInput" class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Min Reps</label>
                                  <input id="repsInput" type="number" formControlName="reps" min="1" class="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-accent-pos outline-none text-black dark:text-white text-sm">
                                </div>
                                <div class="flex-1">
                                  <label for="repsMaxInput" class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Max Reps (Opt)</label>
                                  <input id="repsMaxInput" type="number" formControlName="repsMax" min="1" class="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-accent-pos outline-none text-black dark:text-white text-sm">
                                </div>
                              </div>
                            }

                            <div class="flex items-center gap-3 pt-1">
                              <label class="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  formControlName="saveToDayTemplate"
                                  class="sr-only peer"
                                  id="addExerciseSaveToDayTemplate"
                                >
                                <div class="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent-pos rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-pos"></div>
                              </label>
                              <label for="addExerciseSaveToDayTemplate" class="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                                Save to Program Routine (Day Template)
                              </label>
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
              <div class="solid-card p-6">
                <h3 class="text-xl font-bold text-black dark:text-white mb-2">Session Notes</h3>
                <textarea
                  [formControl]="notesControl"
                  (blur)="saveNotes()"
                  placeholder="Type your notes here..."
                  class="w-full h-32 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-accent-pos outline-none text-black dark:text-white text-sm resize-none placeholder-gray-400"
                ></textarea>
                @if (session()?.previousNotes && !hasCurrentNotes()) {
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

              <!-- Non-sticky Finish / Cancel Workout Buttons (Bottom of feed) -->
              <div class="mt-8 mb-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                @if (!session()?.completedAt) {
                  <button
                    (click)="completeWorkout()"
                    [disabled]="isCompleting()"
                    class="px-6 py-3 bg-accent-pos hover:opacity-90 active:scale-95 text-white font-bold rounded-xl transition-all shadow-md w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{{ isCompleting() ? 'Completing...' : 'Finish Workout' }}</span>
                  </button>
                  <button
                    (click)="cancelWorkout()"
                    class="px-6 py-3 text-accent-neg hover:bg-accent-neg/10 border border-accent-neg/30 rounded-xl transition-colors bg-transparent shadow-sm w-full sm:w-auto font-medium flex items-center justify-center gap-2"
                    >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Cancel Workout</span>
                  </button>
                } @else {
                  <button
                    (click)="uncompleteWorkout()"
                    [disabled]="isCompleting()"
                    class="px-6 py-3 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 text-black dark:text-white font-bold rounded-xl transition-colors shadow-sm w-full sm:w-auto"
                    >
                    {{ isCompleting() ? 'Reopening...' : 'Uncomplete & Edit' }}
                  </button>
                }
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Exercise Options Modal (Root Level Overlay) -->
      @if (optionsExercise(); as ex) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-sm">
          <div class="solid-card rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative p-6">
            <button (click)="closeOptionsModal()" class="absolute top-4 right-4 text-gray-500 hover:text-black dark:hover:text-white text-lg">✕</button>
            <h3 class="text-xl font-bold mb-5 text-black dark:text-white pr-6 inline-flex items-center gap-2 flex-wrap">
              @if (ex.isPublic) {
                <svg class="w-4 h-4 text-purple-500 dark:text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              }
              <span>{{ ex.exerciseName }}</span>
              @if (ex.equipmentBrand) {
                <span class="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-700 font-normal">
                  {{ ex.equipmentBrand }}
                </span>
              }
              <span class="text-gray-500 dark:text-gray-400 font-normal">Options</span>
            </h3>
            <div class="space-y-4">
              <!-- Unit Preference -->
              <div class="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                <div>
                  <span class="font-medium text-gray-700 dark:text-gray-300 block">Weight Unit</span>
                  <span class="text-xs text-gray-500">Selected for this exercise</span>
                </div>
                <button (click)="toggleUnit(ex.id)" class="px-4 py-2 bg-accent-pos/10 text-accent-pos border border-accent-pos/30 hover:bg-accent-pos/20 rounded-lg text-sm font-bold transition-colors uppercase w-16">
                  {{ getUnit(ex.id) }}
                </button>
              </div>

              <!-- Workout Order Reorder Block -->
              <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl flex flex-col gap-3">
                <div class="flex items-center justify-between">
                  <span class="font-medium text-gray-700 dark:text-gray-300">Workout Order</span>
                  <span class="text-xs font-semibold text-accent-pos">
                    Position {{ getExerciseIndex(ex.id) + 1 }} of {{ exercises().length }}
                  </span>
                </div>
                
                <!-- Direct Move Up / Move Down for Current Exercise -->
                <div class="grid grid-cols-2 gap-2">
                  <button 
                    (click)="moveExercise(ex.id, -1)" 
                    [disabled]="getExerciseIndex(ex.id) === 0" 
                    class="py-2 px-3 flex items-center justify-center gap-1.5 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 text-sm font-semibold text-black dark:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm">
                    <span>&uarr; Move Up</span>
                  </button>
                  <button 
                    (click)="moveExercise(ex.id, 1)" 
                    [disabled]="getExerciseIndex(ex.id) === exercises().length - 1" 
                    class="py-2 px-3 flex items-center justify-center gap-1.5 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 text-sm font-semibold text-black dark:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm">
                    <span>&darr; Move Down</span>
                  </button>
                </div>

                <!-- Sequence Preview List -->
                <div class="max-h-44 overflow-y-auto space-y-1.5 pr-1 border-t border-gray-200 dark:border-gray-700/60 pt-2">
                  @for (item of exercises(); track item.id; let idx = $index) {
                    <div 
                      [id]="'reorder-item-' + item.id"
                      class="flex items-center justify-between p-2 rounded-lg text-xs transition-colors text-black dark:text-white"
                      [class.bg-accent-pos/15]="item.id === ex.id"
                      [class.border]="item.id === ex.id"
                      [class.border-accent-pos/40]="item.id === ex.id"
                      [class.font-bold]="item.id === ex.id"
                      [class.bg-white]="item.id !== ex.id"
                      [class.dark:bg-gray-900/60]="item.id !== ex.id">
                      
                      <div class="flex items-center gap-2 min-w-0 pr-2">
                        <span class="font-bold px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 shrink-0">
                          {{ idx + 1 }}
                        </span>
                        <span class="truncate inline-flex items-center gap-1" [class.text-accent-pos]="item.id === ex.id">
                          @if (item.isPublic) {
                            <svg class="w-3 h-3 text-purple-500 dark:text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          }
                          <span>{{ item.exerciseName }}</span>
                          @if (item.equipmentBrand) {
                            <span class="text-[10px] text-gray-500 dark:text-gray-400 font-normal">({{ item.equipmentBrand }})</span>
                          }
                        </span>
                      </div>
                      
                      <div class="flex items-center gap-1 shrink-0">
                        <button 
                          (click)="moveExercise(item.id, -1)" 
                          [disabled]="idx === 0" 
                          title="Move Up"
                          class="w-6 h-6 flex items-center justify-center rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-colors text-black dark:text-white">
                          &uarr;
                        </button>
                        <button 
                          (click)="moveExercise(item.id, 1)" 
                          [disabled]="idx === exercises().length - 1" 
                          title="Move Down"
                          class="w-6 h-6 flex items-center justify-center rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-colors text-black dark:text-white">
                          &darr;
                        </button>
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Actions: Edit Targets, Replace, Remove, Analytics -->
              <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl flex flex-col gap-2">
                <button (click)="startEditTargets(ex.id)" class="w-full py-2 bg-accent-pos/10 text-accent-pos hover:bg-accent-pos/20 border border-accent-pos/30 rounded-lg text-sm font-bold transition-colors">
                  Edit Targets (Sets & Reps)
                </button>
                <button (click)="startReplaceExercise(ex.id)" class="w-full py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm font-bold transition-colors">
                  Replace Exercise
                </button>
                <button (click)="promptRemoveExercise(ex.id)" class="w-full py-2 bg-accent-neg/10 text-accent-neg hover:bg-accent-neg/20 border border-accent-neg/30 rounded-lg text-sm font-bold transition-colors">
                  Remove from Workout
                </button>
                <a [routerLink]="['/analytics']" [queryParams]="{ exerciseId: ex.exerciseId }" (click)="closeOptionsModal()" class="w-full py-1.5 text-gray-500 hover:text-accent-pos rounded-lg text-xs font-medium transition-colors text-center block pt-1">
                  View Analytics
                </a>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Replace Exercise Modal (Root Level Overlay) -->
      @if (replacingExercise(); as ex) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-sm">
          <div class="solid-card rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative p-6 max-h-[85vh] flex flex-col">
            <button (click)="cancelReplace()" class="absolute top-4 right-4 text-gray-500 hover:text-black dark:hover:text-white z-10 text-lg">✕</button>
            
            @if (!replaceTargetExercise()) {
              <h3 class="text-xl font-bold mb-4 text-black dark:text-white shrink-0 inline-flex items-center gap-2 flex-wrap">
                <span>Replace</span>
                @if (ex.isPublic) {
                  <svg class="w-4 h-4 text-purple-500 dark:text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                }
                <span>{{ ex.exerciseName }}</span>
                @if (ex.equipmentBrand) {
                  <span class="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-700 font-normal">
                    {{ ex.equipmentBrand }}
                  </span>
                }
              </h3>
              <div class="flex-1 overflow-y-auto min-h-0">
                <app-exercise-search [excludeIds]="existingExerciseIds()" (exerciseSelected)="onReplaceExerciseSelected($event)"></app-exercise-search>
              </div>
            } @else {
              <h3 class="text-xl font-bold mb-4 text-black dark:text-white shrink-0">Confirm Replacement</h3>
              
              <div class="flex-1 overflow-y-auto min-h-0 space-y-5">
                <div class="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700/60 text-sm space-y-1.5">
                  <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <span class="text-xs uppercase font-bold tracking-wider">Replacing:</span>
                    <span class="font-semibold text-gray-700 dark:text-gray-300 line-through inline-flex items-center gap-1.5">
                      @if (ex.isPublic) {
                        <svg class="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      }
                      <span>{{ ex.exerciseName }}</span>
                      @if (ex.equipmentBrand) {
                        <span class="text-xs text-gray-400 dark:text-gray-500 font-normal">({{ ex.equipmentBrand }})</span>
                      }
                    </span>
                  </div>
                  <div class="flex items-center gap-2 text-accent-pos font-bold">
                    <span class="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-normal">With:</span>
                    <span class="inline-flex items-center gap-1.5">
                      @if (replaceTargetExercise()?.isPublic) {
                        <svg class="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      }
                      <span>{{ replaceTargetExercise()?.name }}</span>
                      @if (replaceTargetExercise()?.equipmentBrand) {
                        <span class="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-700 font-normal">
                          {{ replaceTargetExercise()?.equipmentBrand }}
                        </span>
                      }
                    </span>
                  </div>
                </div>

                <div class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
                  <svg class="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                  </svg>
                  <span>Any logged sets for this exercise will be deleted upon replacement.</span>
                </div>

                <form [formGroup]="replaceForm" (ngSubmit)="confirmReplaceExercise()" class="space-y-4">
                  <div class="flex items-center gap-3">
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        formControlName="keepExistingTargets"
                        class="sr-only peer"
                        id="keepTargetsCheckbox"
                      >
                      <div class="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent-pos rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-pos"></div>
                    </label>
                    <label for="keepTargetsCheckbox" class="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                      Keep same sets & reps ({{ ex.sets }} sets &times; {{ ex.reps }}{{ ex.repsMax ? '-' + ex.repsMax : '' }} reps)
                    </label>
                  </div>

                  @if (!replaceForm.get('keepExistingTargets')?.value) {
                    <div class="grid grid-cols-3 gap-3 pt-1">
                      <div>
                        <label for="replaceSetsInput" class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Sets</label>
                        <input id="replaceSetsInput" type="number" formControlName="sets" min="1" class="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-accent-pos outline-none text-black dark:text-white text-sm">
                      </div>
                      <div>
                        <label for="replaceRepsInput" class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Min Reps</label>
                        <input id="replaceRepsInput" type="number" formControlName="reps" min="1" class="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-accent-pos outline-none text-black dark:text-white text-sm">
                      </div>
                      <div>
                        <label for="replaceRepsMaxInput" class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Max Reps (Opt)</label>
                        <input id="replaceRepsMaxInput" type="number" formControlName="repsMax" min="1" class="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-accent-pos outline-none text-black dark:text-white text-sm">
                      </div>
                    </div>
                  }

                  <div class="flex items-center gap-3 pt-1">
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        formControlName="saveToDayTemplate"
                        class="sr-only peer"
                        id="replaceSaveToDayTemplate"
                      >
                      <div class="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent-pos rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-pos"></div>
                    </label>
                    <label for="replaceSaveToDayTemplate" class="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                      Update Program Routine (Day Template)
                    </label>
                  </div>

                  <div class="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700/60">
                    <button type="button" (click)="cancelReplaceTarget()" class="px-4 py-2 text-gray-500 hover:text-black dark:hover:text-white transition-colors text-sm">Back</button>
                    <button type="submit" [disabled]="replaceForm.invalid && !replaceForm.get('keepExistingTargets')?.value" class="px-5 py-2 bg-accent-pos hover:opacity-80 text-white font-semibold rounded-xl text-sm disabled:opacity-50 transition-colors solid-btn">Replace Exercise</button>
                  </div>
                </form>
              </div>
            }
          </div>
        </div>
      }

      <!-- Edit Targets Modal (Root Level Overlay) -->
      @if (editingTargetExercise(); as ex) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-sm">
          <div class="solid-card rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative p-6">
            <button (click)="cancelEditTargets()" class="absolute top-4 right-4 text-gray-500 hover:text-black dark:hover:text-white text-lg">✕</button>
            <h3 class="text-xl font-bold mb-4 text-black dark:text-white pr-6">Edit Targets &bull; {{ ex.exerciseName }}</h3>
            
            <form [formGroup]="editTargetForm" (ngSubmit)="confirmEditTargets()" class="space-y-4">
              <div>
                <label for="editTargetSetsInput" class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Target Sets</label>
                <input id="editTargetSetsInput" type="number" formControlName="sets" min="1" class="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-accent-pos outline-none text-black dark:text-white text-sm">
              </div>

              <div class="flex items-center gap-3 pt-1">
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    formControlName="isAmrap"
                    class="sr-only peer"
                    id="editTargetIsAmrap"
                  >
                  <div class="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent-pos rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-pos"></div>
                </label>
                <label for="editTargetIsAmrap" class="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  AMRAP
                  <span class="text-gray-500 dark:text-gray-400 text-xs ml-1">(As Many Reps As Possible)</span>
                </label>
              </div>

              @if (!editTargetForm.get('isAmrap')?.value) {
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label for="editTargetRepsInput" class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Min Reps</label>
                    <input id="editTargetRepsInput" type="number" formControlName="reps" min="1" class="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-accent-pos outline-none text-black dark:text-white text-sm">
                  </div>
                  <div>
                    <label for="editTargetRepsMaxInput" class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Max Reps (Opt)</label>
                    <input id="editTargetRepsMaxInput" type="number" formControlName="repsMax" min="1" class="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-accent-pos outline-none text-black dark:text-white text-sm">
                  </div>
                </div>
              }

              <div class="flex items-center gap-3 pt-1">
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    formControlName="saveToDayTemplate"
                    class="sr-only peer"
                    id="editTargetSaveToDayTemplate"
                  >
                  <div class="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent-pos rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-pos"></div>
                </label>
                <label for="editTargetSaveToDayTemplate" class="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Update Program Routine (Day Template)
                </label>
              </div>

              <div class="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700/60">
                <button type="button" (click)="cancelEditTargets()" class="px-4 py-2 text-gray-500 hover:text-black dark:hover:text-white transition-colors text-sm">Cancel</button>
                <button type="submit" [disabled]="editTargetForm.invalid || isSavingTargets()" class="px-5 py-2 bg-accent-pos hover:opacity-80 text-white font-semibold rounded-xl text-sm disabled:opacity-50 transition-colors solid-btn">
                  {{ isSavingTargets() ? 'Saving...' : 'Save Targets' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Remove Exercise Confirmation Modal (Root Level Overlay) -->
      @if (confirmRemoveExerciseId(); as exId) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-sm">
          <div class="solid-card rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative p-6">
            <button (click)="cancelRemoveExercise()" class="absolute top-4 right-4 text-gray-500 hover:text-black dark:hover:text-white text-lg">✕</button>
            <h3 class="text-xl font-bold mb-3 text-accent-neg">Remove Exercise</h3>
            <p class="text-sm text-gray-700 dark:text-gray-300 mb-4">
              Are you sure you want to remove <span class="font-bold text-black dark:text-white">{{ getExerciseName(exId) }}</span> from this workout session?
            </p>
            @if (getSetsForExercise(exId).length > 0) {
              <div class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-600 dark:text-amber-400 mb-4">
                Warning: {{ getSetsForExercise(exId).length }} logged set(s) for this exercise will also be deleted.
              </div>
            }
            <div class="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700/60">
              <button type="button" (click)="cancelRemoveExercise()" class="px-4 py-2 text-gray-500 hover:text-black dark:hover:text-white transition-colors text-sm">Cancel</button>
              <button type="button" (click)="confirmRemoveExercise(exId)" [disabled]="isRemovingExercise()" class="px-5 py-2 bg-accent-neg hover:opacity-80 text-white font-semibold rounded-xl text-sm disabled:opacity-50 transition-colors">
                {{ isRemovingExercise() ? 'Removing...' : 'Remove' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
    
    
    `
})
export class ActiveWorkoutComponent implements OnInit, OnDestroy {
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
  tooltipPosition = signal<{ left: number; top: number; arrowLeft: number } | null>(null);

  /** ID of the last exercise card the user explicitly touched (input change/rating). */
  activeLoggingExerciseId = signal<string | null>(null);

  sessionId = signal<string | null>(null);
  session = signal<WorkoutSessionResponse | null>(null);
  exercises = signal<DayExercise[]>([]);
  existingExerciseIds = computed(() => this.exercises().map(e => e.exerciseId));
  loggedSets = signal<WorkoutSetResponse[]>([]);

  /**
   * DayExercise targeted by the sticky Log Set button.
   * Priority:
   * 1. Last explicitly touched exercise (if still incomplete).
   * 2. First incomplete exercise (fallback for initial load or after completion).
   */
  activeLoggingExercise = computed<DayExercise | undefined>(() => {
    const touchedId = this.activeLoggingExerciseId();
    const exercises = this.exercises();
    const isIncomplete = (ex: DayExercise) =>
      this.getSetsForExercise(ex.id).length < (ex.sets || 1);

    if (touchedId) {
      const touched = exercises.find(ex => ex.id === touchedId);
      if (touched && isIncomplete(touched)) {
        return touched;
      }
    }
    return exercises.find(isIncomplete);
  });
  suggestions = signal<Map<string, ExerciseSuggestionResponse>>(new Map());
  latestBodyWeight = signal<number | null>(null);
  isLoading = signal<boolean>(true);
  isLoggingSet = signal<boolean>(false);
  isLoggingExercise = signal<Set<string>>(new Set());
  isCompleting = signal<boolean>(false);
  isSavingNotes = signal<boolean>(false);
  savedNotesSuccess = signal<boolean>(false);

  protected readonly Math = Math;

  isLogging(exId: string): boolean {
    return this.isLoggingExercise().has(exId);
  }

  isExerciseCompleted(exId: string, targetSets?: number): boolean {
    return this.getSetsForExercise(exId).length >= (targetSets || 1);
  }

  scrollToExercise(exId: string): void {
    const el = document.getElementById('exercise-' + exId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  nowTimestamp = signal<number>(Date.now());
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  isTimerActionLoading = signal<boolean>(false);

  isPaused = computed(() => {
    const s = this.session();
    return !!(s && !s.completedAt && s.pausedAt);
  });

  liveDurationSeconds = computed(() => {
    const s = this.session();
    if (!s) return 0;
    if (s.completedAt) return s.durationSeconds || 0;
    const base = s.durationSeconds || 0;
    if (s.pausedAt) {
      return base;
    }
    const lastResumedStr = s.lastResumedAt || s.startedAt;
    if (!lastResumedStr) return base;
    const lastResumedMs = new Date(lastResumedStr).getTime();
    const currentMs = this.nowTimestamp();
    const elapsedSegmentSec = Math.max(0, Math.floor((currentMs - lastResumedMs) / 1000));
    return base + elapsedSegmentSec;
  });

  formattedTimerDisplay = computed(() => {
    const totalSec = this.liveDurationSeconds();
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    const pad = (num: number) => num.toString().padStart(2, '0');
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  });

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

  hasCurrentNotes = signal<boolean>(false);

  notesControl = new FormControl('');

  constructor() {
    this.notesControl.valueChanges.subscribe(val => {
      this.hasCurrentNotes.set(!!(val && val.trim().length > 0));
    });
  }

  // Map of exerciseId -> FormGroup
  forms = new Map<string, FormGroup>();
  
  optionsModalOpen = signal<string | null>(null);
  replacingExerciseId = signal<string | null>(null);
  replaceTargetExercise = signal<Exercise | null>(null);
  exerciseUnits = signal<Record<string, 'kg' | 'lb'>>({});

  optionsExercise = computed(() => {
    const id = this.optionsModalOpen();
    return id ? this.exercises().find(e => e.id === id) || null : null;
  });

  replacingExercise = computed(() => {
    const id = this.replacingExerciseId();
    return id ? this.exercises().find(e => e.id === id) || null : null;
  });

  getExerciseIndex(exId: string): number {
    return this.exercises().findIndex(e => e.id === exId);
  }

  editingTargetExerciseId = signal<string | null>(null);
  isSavingTargets = signal<boolean>(false);
  confirmRemoveExerciseId = signal<string | null>(null);
  isRemovingExercise = signal<boolean>(false);

  editingTargetExercise = computed(() => {
    const id = this.editingTargetExerciseId();
    return id ? this.exercises().find(e => e.id === id) || null : null;
  });

  editTargetForm: FormGroup = this.fb.group({
    sets: [3, [Validators.required, Validators.min(1)]],
    reps: [10, [Validators.required, Validators.min(1)]],
    repsMax: [null as number | null],
    isAmrap: [false],
    saveToDayTemplate: [true]
  });

  replaceForm: FormGroup = this.fb.group({
    keepExistingTargets: [true],
    sets: [3, [Validators.required, Validators.min(1)]],
    reps: [10, [Validators.required, Validators.min(1)]],
    repsMax: [null as number | null],
    saveToDayTemplate: [true]
  });

  exerciseForm: FormGroup = this.fb.group({
    exerciseId: ['', Validators.required],
    sets: [3],
    reps: [10],
    repsMax: [null],
    isAmrap: [false],
    saveToDayTemplate: [true]
  });

  collapsedExercises = new Set<string>();

  /**
   * Closes any open icon tooltip when the user clicks anywhere on the document, scrolls, or resizes window.
   */
  @HostListener('document:click')
  @HostListener('window:scroll')
  @HostListener('window:resize')
  onDocumentClickOrScroll(): void {
    if (this.activeIconTooltip()) {
      this.activeIconTooltip.set(null);
      this.tooltipPosition.set(null);
    }
  }

  /**
   * Toggles the icon tooltip for the given key and calculates viewport-safe position.
   * If the same key is clicked again, the tooltip is dismissed.
   *
   * @param key Unique identifier combining dayExerciseId and icon type.
   * @param event Optional MouseEvent/Event from trigger button click.
   */
  toggleIconTooltip(key: string, event?: Event): void {
    if (this.activeIconTooltip() === key) {
      this.activeIconTooltip.set(null);
      this.tooltipPosition.set(null);
    } else {
      this.activeIconTooltip.set(key);
      if (event && event.currentTarget) {
        const button = event.currentTarget as HTMLElement;
        const rect = button.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const tooltipWidth = Math.min(208, viewportWidth - 32);

        const buttonCenter = rect.left + rect.width / 2;
        const idealLeft = buttonCenter - tooltipWidth / 2;
        const margin = 16;

        let finalLeft = idealLeft;
        if (idealLeft < margin) {
          finalLeft = margin;
        } else if (idealLeft + tooltipWidth > viewportWidth - margin) {
          finalLeft = viewportWidth - tooltipWidth - margin;
        }

        const arrowLeft = Math.max(12, Math.min(buttonCenter - finalLeft, tooltipWidth - 12));

        this.tooltipPosition.set({
          left: finalLeft,
          top: rect.bottom + 8,
          arrowLeft
        });
      }
    }
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
        requestAnimationFrame(() => {
          const el = document.getElementById('exercise-' + ex.id);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
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
    this.replaceTargetExercise.set(null);
  }

  cancelReplace() {
    this.replacingExerciseId.set(null);
    this.replaceTargetExercise.set(null);
  }

  cancelReplaceTarget() {
    this.replaceTargetExercise.set(null);
  }

  getReplacingExercise(): DayExercise | undefined {
    const id = this.replacingExerciseId();
    return this.exercises().find(e => e.id === id);
  }

  onReplaceExerciseSelected(newExercise: Exercise) {
    const current = this.getReplacingExercise();
    this.replaceTargetExercise.set(newExercise);
    this.replaceForm.reset({
      keepExistingTargets: true,
      sets: current?.sets || 3,
      reps: current?.reps || 10,
      repsMax: current?.repsMax ?? null,
      saveToDayTemplate: true
    });
  }

  confirmReplaceExercise() {
    const sessionExerciseId = this.replacingExerciseId();
    const sessionId = this.sessionId();
    const newExercise = this.replaceTargetExercise();
    if (!sessionExerciseId || !sessionId || !newExercise) return;

    if (this.replaceForm.invalid && !this.replaceForm.value.keepExistingTargets) {
      return;
    }

    const formVal = this.replaceForm.value;
    const current = this.getReplacingExercise();
    const payload: SessionExerciseReplaceRequest = {
      newExerciseId: newExercise.id,
      sets: formVal.keepExistingTargets ? (current?.sets ?? 3) : (formVal.sets || 3),
      reps: formVal.keepExistingTargets ? (current?.reps ?? 10) : (formVal.reps || 10),
      repsMax: formVal.keepExistingTargets ? (current?.repsMax ?? undefined) : (formVal.repsMax || undefined),
      saveToDayTemplate: !!formVal.saveToDayTemplate
    };

    this.workoutService.replaceSessionExercise(sessionId, sessionExerciseId, payload).subscribe({
      next: () => {
        this.loadWorkoutData();
        this.replacingExerciseId.set(null);
        this.replaceTargetExercise.set(null);
      },
      error: (err) => {
        console.error('Failed to replace exercise', err);
        alert(err.error?.detail || err.error?.message || 'Failed to replace exercise');
      }
    });
  }

  startEditTargets(exId: string) {
    this.closeOptionsModal();
    const ex = this.exercises().find(e => e.id === exId);
    if (!ex) return;
    this.editingTargetExerciseId.set(exId);
    this.editTargetForm.reset({
      sets: ex.sets || 3,
      reps: ex.reps || 10,
      repsMax: ex.repsMax ?? null,
      isAmrap: !!ex.isAmrap,
      saveToDayTemplate: true
    });
  }

  cancelEditTargets() {
    this.editingTargetExerciseId.set(null);
  }

  confirmEditTargets() {
    const sessionExerciseId = this.editingTargetExerciseId();
    const sessionId = this.sessionId();
    if (!sessionExerciseId || !sessionId || this.isSavingTargets()) return;

    const isAmrap = !!this.editTargetForm.value.isAmrap;
    if (this.editTargetForm.invalid && !isAmrap) {
      return;
    }

    this.isSavingTargets.set(true);
    const formVal = this.editTargetForm.value;
    const req: SessionExerciseUpdateRequest = {
      sets: formVal.sets || 3,
      reps: isAmrap ? undefined : (formVal.reps || 10),
      repsMax: isAmrap ? undefined : (formVal.repsMax || undefined),
      isAmrap: isAmrap,
      saveToDayTemplate: !!formVal.saveToDayTemplate
    };

    this.workoutService.updateSessionExercise(sessionId, sessionExerciseId, req).subscribe({
      next: () => {
        this.isSavingTargets.set(false);
        this.editingTargetExerciseId.set(null);
        this.loadWorkoutData();
      },
      error: (err) => {
        console.error('Failed to update exercise targets', err);
        this.isSavingTargets.set(false);
        alert(err.error?.detail || err.error?.message || 'Failed to update exercise targets');
      }
    });
  }

  promptRemoveExercise(exId: string) {
    this.closeOptionsModal();
    this.confirmRemoveExerciseId.set(exId);
  }

  cancelRemoveExercise() {
    this.confirmRemoveExerciseId.set(null);
  }

  getExerciseName(exId: string): string {
    return this.exercises().find(e => e.id === exId)?.exerciseName || 'this exercise';
  }

  confirmRemoveExercise(exId: string) {
    const sessionId = this.sessionId();
    if (!sessionId || !exId || this.isRemovingExercise()) return;

    this.isRemovingExercise.set(true);
    this.workoutService.removeSessionExercise(sessionId, exId).subscribe({
      next: () => {
        this.isRemovingExercise.set(false);
        this.confirmRemoveExerciseId.set(null);
        this.loadWorkoutData();
      },
      error: (err) => {
        console.error('Failed to remove exercise', err);
        this.isRemovingExercise.set(false);
        alert(err.error?.detail || err.error?.message || 'Failed to remove exercise');
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

    if (typeof window !== 'undefined') {
      setTimeout(() => {
        document.getElementById('reorder-item-' + exId)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 50);
    }
  }

  isCollapsed(exId: string): boolean {
    return this.collapsedExercises.has(exId);
  }

  ngOnInit() {
    this.startTimerTicker();
    this.route.paramMap.subscribe(params => {
      this.sessionId.set(params.get('id'));
      if (this.sessionId()) {
        this.loadWorkoutData();
      }
    });

    this.exerciseForm.get('isAmrap')?.valueChanges.subscribe(isAmrap => {
      const repsControl = this.exerciseForm.get('reps');
      if (isAmrap) {
        repsControl?.clearValidators();
      } else if (this.selectedExercise()) {
        repsControl?.setValidators([Validators.required, Validators.min(1)]);
      }
      repsControl?.updateValueAndValidity();
    });

    this.editTargetForm.get('isAmrap')?.valueChanges.subscribe(isAmrap => {
      const repsControl = this.editTargetForm.get('reps');
      if (isAmrap) {
        repsControl?.clearValidators();
      } else {
        repsControl?.setValidators([Validators.required, Validators.min(1)]);
      }
      repsControl?.updateValueAndValidity();
    });
  }

  ngOnDestroy() {
    this.stopTimerTicker();
  }

  private startTimerTicker() {
    if (!this.timerInterval) {
      this.nowTimestamp.set(Date.now());
      this.timerInterval = setInterval(() => {
        this.nowTimestamp.set(Date.now());
      }, 1000);
    }
  }

  private stopTimerTicker() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  togglePauseWorkout() {
    const s = this.session();
    if (!s || s.completedAt || this.isTimerActionLoading()) return;

    this.isTimerActionLoading.set(true);
    if (s.pausedAt) {
      this.workoutService.resumeSession(s.id).subscribe({
        next: (updated) => {
          this.session.set(updated);
          this.nowTimestamp.set(Date.now());
          this.isTimerActionLoading.set(false);
        },
        error: () => this.isTimerActionLoading.set(false)
      });
    } else {
      this.workoutService.pauseSession(s.id).subscribe({
        next: (updated) => {
          this.session.set(updated);
          this.nowTimestamp.set(Date.now());
          this.isTimerActionLoading.set(false);
        },
        error: () => this.isTimerActionLoading.set(false)
      });
    }
  }

  loadWorkoutData() {
    const id = this.sessionId();
    if (!id) return;

    this.isLoading.set(true);
    
    this.workoutService.getSession(id).subscribe({
      next: (sess) => {
        const sync$ = sess.completedAt
          ? of(sess)
          : this.workoutService.syncSession(id).pipe(catchError(() => of(sess)));

        sync$.subscribe({
          next: (syncedSess) => {
            this.session.set(syncedSess);
            if (syncedSess.notes) {
              this.notesControl.setValue(syncedSess.notes, { emitEvent: false });
              this.hasCurrentNotes.set(!!(syncedSess.notes && syncedSess.notes.trim().length > 0));
            } else {
              this.notesControl.setValue('', { emitEvent: false });
              this.hasCurrentNotes.set(false);
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
                  equipmentBrand: e.exercise.equipmentBrand,
                  isPublic: e.exercise.isPublic,
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
                this.scrollToFirstIncompleteExercise();
              },
              error: (err) => {
                console.error('Failed to load workout data', err);
                this.isLoading.set(false);
              }
            });
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
      }

      this.forms.set(ex.id, this.fb.group({
        weightKg: [defaultWeight, [Validators.required, Validators.min(0)]],
        repsCompleted: [defaultReps, [Validators.required, Validators.min(0)]],
        repsCompletedRight: [defaultRepsRight, [Validators.min(0)]]
      }));
    });
  }

  /**
   * Builds the Volume History chart data by requesting aggregated session volumes
   * from the server, grouped by dayTemplateId.
   *
   * Uses a single GET /api/v1/analytics/day-volume request instead of one request
   * per exercise, making historical bars resilient to exercises being added or removed.
   *
   * The current session bar is highlighted by comparing each entry's sessionId UUID
   * against this.session()?.id — both values originate from the same session_id column,
   * so the comparison is always an exact UUID string match with no date ambiguity.
   */
  buildChartData() {
    const dayId = this.session()?.dayTemplateId;
    if (!dayId) return;

    this.analyticsService.getDayVolume(dayId).subscribe((entries: DayVolumeEntry[]) => {
      if (entries.length === 0) return;

      // UUID of the session currently being viewed — used to highlight its bar.
      // Sourced from WorkoutSessionResponse.id (same UUID as session_id in DB).
      const currentSessionId = this.session()?.id;

      let accentColor = '#8b5cf6';
      if (typeof window !== 'undefined') {
        accentColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-accent-pos').trim() || '#8b5cf6';
        if (/^\d+\s+\d+\s+\d+$/.test(accentColor)) {
          accentColor = `rgb(${accentColor.split(/\s+/).join(', ')})`;
        }
      }

      this.chartData = {
        labels: entries.map(e => e.sessionDate),
        datasets: [{
          data: entries.map(e => e.totalVolumeKg),
          backgroundColor: entries.map(e =>
            e.sessionId === currentSessionId ? accentColor : 'rgba(128, 128, 128, 0.3)'
          ),
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
    return this.activeLoggingExercise();
  }

  /**
   * Marks an exercise card as touched by user interaction (input change or rating tap),
   * updating the target for the sticky Log Set button.
   */
  markExerciseTouched(exId: string): void {
    this.activeLoggingExerciseId.set(exId);
  }

  getLastSetForExercise(exerciseId: string): WorkoutSetResponse | null {
    const sets = this.getSetsForExercise(exerciseId);
    return sets.length > 0 ? sets[sets.length - 1] : null;
  }

  hasPrForExercise(exerciseId: string): boolean {
    return this.getSetsForExercise(exerciseId).some(set => set.isNewPr);
  }

  getPrTooltipText(exerciseId: string): string {
    const prSet = this.getSetsForExercise(exerciseId).find(set => set.isNewPr);
    if (!prSet) return 'Personal Record!';
    
    const unit = this.getUnit(exerciseId);
    let currentReps = prSet.repsCompleted?.toString() || '';
    if (prSet.repsCompletedRight) currentReps += ' / ' + prSet.repsCompletedRight;
    
    const currentText = `${this.getDisplayWeight(prSet.weightKg, exerciseId)}${unit} × ${currentReps}`;
    
    if (prSet.previousPrWeight != null && prSet.previousPrReps != null) {
      return `Previous PR: ${this.getDisplayWeight(prSet.previousPrWeight, exerciseId)}${unit} × ${prSet.previousPrReps} → Current PR: ${currentText}`;
    }
    
    return `New PR! ${currentText}`;
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

  getPerfContainerClass(status: 'GOOD' | 'WARNING' | 'CRITICAL' | 'WARMUP' | undefined): string {
    if (status === 'CRITICAL') return 'border-accent-neg/50 bg-accent-neg/10';
    if (status === 'WARNING') return 'border-accent-pos/50 bg-accent-pos/10';
    if (status === 'WARMUP') return 'border-gray-300 dark:border-gray-600';
    if (status === 'GOOD') return 'border-gray-300 dark:border-gray-600';
    return 'border-gray-300 dark:border-gray-600';
  }

  getPerfBadgeClass(status: 'GOOD' | 'WARNING' | 'CRITICAL' | 'WARMUP' | undefined): string {
    if (status === 'CRITICAL') return 'bg-accent-neg/20 text-accent-neg border-accent-neg/30';
    if (status === 'WARNING') return 'bg-accent-pos/20 text-accent-pos border-accent-pos/30';
    if (status === 'WARMUP') return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600';
    if (status === 'GOOD') return 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600';
    return 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600';
  }

  getPerfTextClass(status: 'GOOD' | 'WARNING' | 'CRITICAL' | 'WARMUP' | undefined): string {
    if (status === 'CRITICAL') return 'text-accent-neg';
    if (status === 'WARNING') return 'text-accent-pos';
    if (status === 'WARMUP') return 'text-gray-600 dark:text-gray-400 font-medium';
    if (status === 'GOOD') return 'text-gray-800 dark:text-gray-200';
    return 'text-gray-800 dark:text-gray-200';
  }

  getPerfSubtextClass(status: 'GOOD' | 'WARNING' | 'CRITICAL' | 'WARMUP' | undefined): string {
    if (status === 'CRITICAL') return 'text-accent-neg/70';
    if (status === 'WARNING') return 'text-accent-pos/70';
    if (status === 'WARMUP') return 'text-gray-400 dark:text-gray-500';
    if (status === 'GOOD') return 'text-gray-500';
    return 'text-gray-500';
  }

  openAddExercise() {
    this.showAddExercise.set(true);
    this.selectedExercise.set(null);
    this.exerciseForm.reset({ sets: 3, reps: 10, repsMax: null, isAmrap: false, saveToDayTemplate: true });
  }

  cancelAdd() {
    this.showAddExercise.set(false);
    this.selectedExercise.set(null);
  }

  onExerciseSelected(ex: Exercise) {
    this.selectedExercise.set(ex);
    this.exerciseForm.patchValue({ exerciseId: ex.id });
    
    this.exerciseForm.get('sets')?.setValidators([Validators.required, Validators.min(1)]);
    if (!this.exerciseForm.get('isAmrap')?.value) {
      this.exerciseForm.get('reps')?.setValidators([Validators.required, Validators.min(1)]);
    } else {
      this.exerciseForm.get('reps')?.clearValidators();
    }
    
    this.exerciseForm.get('sets')?.updateValueAndValidity();
    this.exerciseForm.get('reps')?.updateValueAndValidity();
  }

  onSubmitExercise() {
    const session = this.session();
    if (this.exerciseForm.valid && session) {
      const formVal = this.exerciseForm.value;
      const isAmrap = !!formVal.isAmrap;
      const payload: SessionExerciseRequest = {
        exerciseId: formVal.exerciseId,
        sets: formVal.sets,
        reps: isAmrap ? undefined : (formVal.reps ?? undefined),
        repsMax: isAmrap ? undefined : (formVal.repsMax ?? undefined),
        isAmrap: isAmrap,
        saveToDayTemplate: !!formVal.saveToDayTemplate
      };

      this.workoutService.addSessionExercise(session.id, payload).subscribe({
        next: () => {
          this.cancelAdd();
          this.loadWorkoutData();
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
        alert(err.error?.detail || err.error?.message || 'Failed to create exercise.');
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
    if (!id || this.isLogging(ex.id) || this.session()?.completedAt) return;

    const form = this.getForm(ex.id);
    if (form.invalid) return;

    this.isLoggingExercise.update(set => new Set(set).add(ex.id));
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
        this.isLoggingExercise.update(set => {
          const next = new Set(set);
          next.delete(ex.id);
          return next;
        });
        this.isLoggingSet.set(false);
      },
      error: (err) => {
        console.error('Error logging set', err);
        this.isLoggingExercise.update(set => {
          const next = new Set(set);
          next.delete(ex.id);
          return next;
        });
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

    this.markExerciseTouched(dayExerciseId);

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

    this.markExerciseTouched(dayExerciseId);

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

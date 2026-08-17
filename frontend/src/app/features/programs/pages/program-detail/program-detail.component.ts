import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProgramService } from '../../services/program.service';
import { TrainingProgram, DayTemplate, Exercise, getBodyPartPath, BodyPart } from '../../../../core/types/training.types';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { forkJoin } from 'rxjs';
import { ExerciseSearchComponent } from '../../../exercises/components/exercise-search/exercise-search.component';
import { ExerciseService } from '../../../exercises/services/exercise.service';
import { AuthService } from '../../../../core/auth/auth.service';

import { ExerciseDisplayNamePipe } from '../../../../shared/pipes/exercise-display-name.pipe';

@Component({
  standalone: true,
  selector: 'app-program-detail',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, ExerciseSearchComponent, DragDropModule, ExerciseDisplayNamePipe],
  template: `
    <div class="max-w-7xl mx-auto space-y-6">
    
      <!-- Back Link & Header -->
      <div>
        <div class="mb-3">
          <a routerLink="/programs" class="text-xs sm:text-sm font-semibold text-gray-500 hover:text-black dark:hover:text-white transition-colors inline-flex items-center gap-1.5">
            &larr; Back to Programs
          </a>
        </div>

        @if (isLoading()) {
          <div class="text-gray-500 dark:text-gray-400">Loading program details...</div>
        }
    
        @if (!isLoading() && program()) {
          <!-- Public Read-Only Banner -->
          @if (isReadOnly()) {
            <div class="p-4 rounded-2xl bg-accent-pos/10 border border-accent-pos/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 text-xs font-bold rounded-md bg-accent-pos text-white">Public Template</span>
                  <h2 class="text-sm sm:text-base font-bold text-black dark:text-white">Read-only Preview</h2>
                </div>
                <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  You are inspecting this template. Import it into your account to customize days, add exercises, and start logging workouts.
                </p>
              </div>
              <button
                (click)="useThisProgram()"
                [disabled]="isImporting()"
                class="px-6 py-2.5 bg-accent-pos hover:opacity-80 text-white font-semibold rounded-xl shadow-lg transition-all solid-btn shrink-0 flex items-center gap-2 text-sm"
              >
                @if (isImporting()) {
                  <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Importing...</span>
                } @else {
                  <span>Use This Program</span>
                }
              </button>
            </div>
          }

          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
            <div class="space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="text-2xl sm:text-3xl font-bold text-black dark:text-white">{{ program()?.name }}</h1>
                <span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                  {{ formatGoal(program()?.goal) }}
                </span>
                @if (program()?.isPublic) {
                  <span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-accent-pos/20 text-accent-pos border border-accent-pos/30">
                    Public Template
                  </span>
                }
              </div>

              <!-- Rating Badge & Rate Button -->
              <div class="flex flex-wrap items-center gap-3">
                @if (program()?.averageRating !== undefined && program()?.averageRating !== null) {
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                    <span>★</span>
                    <span>{{ program()?.averageRating | number:'1.1-1' }}</span>
                    @if ((program()?.ratingsCount ?? 0) > 0) {
                      <span class="text-[11px] text-gray-400">({{ program()?.ratingsCount }} ratings)</span>
                    }
                  </span>
                } @else {
                  <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700">
                    Unrated
                  </span>
                }

                <button
                  (click)="openRateModal()"
                  class="px-3 py-1 text-xs font-semibold rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-black dark:text-white transition-colors border border-gray-300 dark:border-gray-700 flex items-center gap-1"
                >
                  <span>★</span>
                  <span>{{ program()?.userRating !== undefined && program()?.userRating !== null ? 'Update Rating (' + program()?.userRating + '/10)' : 'Rate Program' }}</span>
                </button>

                <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  Duration: <span class="font-medium text-black dark:text-white">{{ program()?.durationWeeks }} weeks</span>
                </p>
              </div>

              <!-- Description -->
              @if (program()?.description) {
                <div class="p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-800 text-xs sm:text-sm text-gray-600 dark:text-gray-300 max-w-3xl leading-relaxed">
                  {{ program()?.description }}
                </div>
              }
            </div>

            @if (weekTemplateId() && !isReadOnly()) {
              <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
                @if (reorderModeActive()) {
                  <button
                    (click)="toggleReorderMode()"
                    class="px-3.5 py-2 bg-accent-pos hover:opacity-80 text-white font-semibold rounded-xl transition-all text-xs sm:text-sm shadow-md solid-btn flex items-center gap-1.5 shrink-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Done Reordering</span>
                  </button>
                }

                <!-- Options Dropdown Menu -->
                <div class="relative">
                  <button 
                    (click)="showOptionsMenu.update(v => !v)"
                    class="px-3 py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-all text-xs sm:text-sm flex items-center gap-1.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                    <span>Options</span>
                  </button>

                  @if (showOptionsMenu()) {
                    <div 
                      class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl z-30 py-1"
                      (mouseleave)="showOptionsMenu.set(false)"
                    >
                      <button
                        (click)="openEditProgram(); showOptionsMenu.set(false)"
                        class="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Program
                      </button>

                      <button
                        (click)="toggleReorderMode(); showOptionsMenu.set(false)"
                        class="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                        </svg>
                        {{ reorderModeActive() ? 'Exit Reordering' : 'Reorder Days' }}
                      </button>
                    </div>
                  }
                </div>

                <!-- Primary Action Button -->
                <button
                  (click)="openAddDay()"
                  class="px-4 py-2 bg-accent-pos hover:opacity-80 text-white rounded-xl transition-colors text-xs sm:text-sm font-semibold shadow-lg solid-btn shrink-0"
                >
                  + Add Day
                </button>
              </div>
            }
          </div>
        }
      </div>
    
      @if (!isLoading() && program()) {
        <div class="space-y-6">
          <!-- Edit Program Modal Overlay -->
          @if (showEditProgram()) {
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div class="solid-card rounded-2xl w-full max-w-lg p-6 shadow-2xl relative border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <button
                  (click)="cancelEditProgram()"
                  class="absolute top-4 right-4 text-gray-400 hover:text-black dark:hover:text-white text-xl transition-colors p-1"
                  title="Close"
                >
                  ✕
                </button>
                <div class="mb-6">
                  <h2 class="text-2xl font-bold text-black dark:text-white">Edit Program</h2>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Update your training program settings, description, and goal.</p>
                </div>

                <form [formGroup]="programForm" (ngSubmit)="onSubmitProgram()" class="space-y-4">
                  <div>
                    <label for="editNameInput" class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Program Name</label>
                    <input
                      id="editNameInput"
                      type="text"
                      formControlName="name"
                      class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-pos outline-none text-black dark:text-white text-sm solid-input"
                    >
                  </div>

                  <div>
                    <label for="editDescriptionInput" class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Description (Optional)</label>
                    <textarea
                      id="editDescriptionInput"
                      formControlName="description"
                      rows="3"
                      class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-pos outline-none text-black dark:text-white text-sm solid-input resize-none"
                    ></textarea>
                  </div>

                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label for="editDurationInput" class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Duration (Weeks)</label>
                      <input
                        id="editDurationInput"
                        type="number"
                        min="1"
                        max="52"
                        formControlName="durationWeeks"
                        class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-pos outline-none text-black dark:text-white text-sm solid-input"
                      >
                    </div>

                    <div>
                      <label for="editGoalInput" class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Goal</label>
                      <select
                        id="editGoalInput"
                        formControlName="goal"
                        class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-pos outline-none text-black dark:text-white text-sm solid-input"
                      >
                        <option value="MAINTENANCE">Maintenance</option>
                        <option value="CUT">Cut (Lose Weight)</option>
                        <option value="BULK">Bulk (Gain Weight)</option>
                      </select>
                    </div>
                  </div>

                  @if (authService.isAdmin) {
                    <div class="flex items-center gap-3 pt-2">
                      <input
                        id="editIsPublicInput"
                        type="checkbox"
                        formControlName="isPublic"
                        class="w-4 h-4 text-accent-pos rounded focus:ring-accent-pos border-gray-300 dark:border-gray-700"
                      >
                      <label for="editIsPublicInput" class="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Make this a public template
                      </label>
                    </div>
                  }

                  <div class="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-800 mt-6">
                    <button
                      type="button"
                      (click)="cancelEditProgram()"
                      class="px-5 py-2.5 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white font-medium text-sm transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      [disabled]="programForm.invalid"
                      class="px-6 py-2.5 bg-accent-pos hover:opacity-80 text-white font-semibold rounded-xl disabled:opacity-50 transition-colors text-sm shadow-lg solid-btn"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          }

          <!-- Rate Program Modal -->
          @if (showRateModal()) {
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div class="solid-card rounded-2xl w-full max-w-md p-6 shadow-2xl relative border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <button
                  (click)="showRateModal.set(false)"
                  class="absolute top-4 right-4 text-gray-400 hover:text-black dark:hover:text-white text-xl transition-colors p-1"
                  title="Close"
                >
                  ✕
                </button>
                <div class="text-center mb-6">
                  <div class="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
                    ★
                  </div>
                  <h2 class="text-xl font-bold text-black dark:text-white">Rate {{ program()?.name }}</h2>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Select a rating from 1 to 10 for this program.
                  </p>
                </div>

                <div class="space-y-4">
                  <!-- 1-10 selector buttons -->
                  <div class="grid grid-cols-5 gap-2">
                    @for (r of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; track r) {
                      <button
                        type="button"
                        (click)="selectedRating.set(r)"
                        class="py-2.5 rounded-xl font-bold text-sm transition-all border"
                        [class.bg-accent-pos]="selectedRating() === r"
                        [class.text-white]="selectedRating() === r"
                        [class.border-accent-pos]="selectedRating() === r"
                        [class.shadow-md]="selectedRating() === r"
                        [class.bg-gray-100]="selectedRating() !== r"
                        [class.dark:bg-gray-800]="selectedRating() !== r"
                        [class.text-gray-700]="selectedRating() !== r"
                        [class.dark:text-gray-300]="selectedRating() !== r"
                        [class.border-gray-300]="selectedRating() !== r"
                        [class.dark:border-gray-700]="selectedRating() !== r"
                      >
                        {{ r }}
                      </button>
                    }
                  </div>

                  <div class="text-center text-xs font-semibold text-gray-400 dark:text-gray-500">
                    Selected Rating: <span class="text-accent-pos font-bold text-sm">{{ selectedRating() }}/10</span>
                  </div>

                  <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                    <button
                      type="button"
                      (click)="showRateModal.set(false)"
                      class="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      (click)="submitRating()"
                      [disabled]="isSubmittingRating()"
                      class="px-6 py-2 bg-accent-pos hover:opacity-80 text-white font-semibold rounded-xl text-sm transition-all solid-btn"
                    >
                      {{ isSubmittingRating() ? 'Saving...' : 'Submit Rating' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }

          <!-- Add Day Form -->
          @if (showAddDay() && !isReadOnly()) {
            <div class="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-300 dark:border-gray-700 shadow-sm">
              <form [formGroup]="dayForm" (ngSubmit)="onSubmitDay()" class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <input
                  type="text"
                  formControlName="dayName"
                  placeholder="e.g., Push Day"
                  class="flex-1 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-pos outline-none text-black dark:text-white text-sm solid-input"
                >
                <div class="flex items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    (click)="showAddDay.set(false)"
                    class="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    [disabled]="dayForm.invalid"
                    class="px-6 py-2 bg-accent-pos hover:opacity-80 text-white font-semibold rounded-xl text-sm disabled:opacity-50 transition-colors shadow-md solid-btn shrink-0"
                  >
                    Save Day
                  </button>
                </div>
              </form>
            </div>
          }

          <!-- Days Grid -->
          @if (days().length === 0 && !showAddDay()) {
            <div class="text-center py-16 solid-card border border-dashed border-gray-300 dark:border-gray-700">
              <div class="w-14 h-14 bg-accent-pos/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-accent-pos" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 class="text-lg font-bold text-black dark:text-white mb-2">No training days configured</h3>
              <p class="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
                {{ isReadOnly() ? 'This public template does not have any training days yet.' : 'Each day represents a workout session in your weekly split (e.g., "Push Day", "Pull Day", "Legs").' }}
              </p>
              @if (!isReadOnly()) {
                <button (click)="openAddDay()" class="px-6 py-2.5 bg-accent-pos hover:opacity-80 text-white font-semibold rounded-xl transition-all solid-btn">
                  + Add Day
                </button>
              }
            </div>
          }

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" cdkDropList [cdkDropListDisabled]="!reorderModeActive() || isReadOnly()" (cdkDropListDropped)="dropDay($event)">
            @for (day of days(); track day) {
              <div cdkDrag class="solid-card p-5 group flex flex-col hover:border-gray-400 dark:hover:border-gray-600 transition-all cursor-pointer" [routerLink]="['/programs', program()?.id, 'days', day.id]">
                <div class="flex justify-between items-start mb-4">
                  <div class="flex items-center gap-3">
                    @if (reorderModeActive() && !isReadOnly()) {
                      <button type="button" cdkDragHandle class="text-gray-400 hover:text-accent-pos cursor-grab active:cursor-grabbing p-1" title="Drag to reorder" (click)="$event.stopPropagation()">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                        </svg>
                      </button>
                    }
                    <h3 class="text-xl font-bold text-gray-800 dark:text-gray-200 group-hover:text-accent-pos transition-colors">{{ day.name }}</h3>
                  </div>

                  @if (!isReadOnly()) {
                    <button
                      (click)="deleteDay(day.id, $event)"
                      class="text-accent-neg hover:opacity-80 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete Day"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                      </svg>
                    </button>
                  }
                </div>

                <div class="text-sm text-gray-500 dark:text-gray-400 flex-1">
                  @if (day.exercises && day.exercises.length > 0) {
                    <p>{{ day.exercises.length }} exercises</p>
                    <p class="mt-1 text-xs font-semibold text-accent-pos uppercase tracking-wide">Expected Volume: {{ getTotalSets(day) }} sets</p>
                  }
                  @if (!day.exercises || day.exercises.length === 0) {
                    <p class="italic">No exercises</p>
                  }
                </div>

                <div class="mt-4 pt-4 border-t border-gray-300 dark:border-gray-800 flex justify-between items-center text-sm font-medium">
                  <span class="text-accent-pos group-hover:opacity-80">
                    {{ isReadOnly() ? 'View Exercises →' : 'Edit Exercises →' }}
                  </span>
                  @if (!isReadOnly()) {
                    <button
                      (click)="openQuickAdd(day.id, $event)"
                      class="px-3 py-1.5 bg-accent-pos/10 hover:bg-accent-pos/20 text-accent-pos rounded-lg transition-colors z-10"
                    >
                      + Quick Add
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }
 
      <!-- Program Volume Breakdown -->
      @if (!isLoading() && programVolumeBreakdown().length > 0) {
        <div class="mt-12 pt-8 border-t border-gray-300 dark:border-gray-800">
          <h3 class="text-xl font-bold text-black dark:text-white mb-6 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-accent-pos" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Weekly Program Volume
          </h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            @for (item of programVolumeBreakdown(); track item.part) {
              <div class="bg-gray-100 dark:bg-gray-800/40 rounded-xl p-4 flex flex-col items-center justify-center border border-gray-300 dark:border-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
                <span class="text-3xl font-black text-accent-pos">{{ item.sets }}</span>
                <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1 text-center">{{ item.part }}</span>
              </div>
            }
          </div>
        </div>
      }
    </div>
    
    <!-- Quick Add Modal -->
    @if (addingExerciseToDayId() && !isReadOnly()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-sm">
        <div class="solid-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
          <button (click)="cancelQuickAdd()" class="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white text-xl">✕</button>
          <h2 class="text-2xl font-bold text-black dark:text-white mb-6">Quick Add Exercise</h2>
          @if (!selectedExercise()) {
            <app-exercise-search [excludeIds]="getExistingExerciseIds()" (exerciseSelected)="onExerciseSelected($event)"></app-exercise-search>
          }
          @if (selectedExercise()) {
            <form [formGroup]="exerciseForm" (ngSubmit)="onSubmitExercise()" class="space-y-4 mt-4">
              <div class="text-sm font-semibold text-accent-pos mb-1 border-b border-gray-300 dark:border-gray-700 pb-2 flex items-center gap-2">
                Selected:
                @if (selectedExercise()?.isPublic) {
                  <svg class="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                }
                {{ selectedExercise()?.name | exerciseDisplayName:selectedExercise()?.equipmentBrand }}
              </div>
              <div class="flex gap-4">
                <div class="flex-1">
                  <label for="qa-sets" class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Sets</label>
                  <input id="qa-sets" type="number" formControlName="sets" min="1" class="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-accent-pos outline-none text-black dark:text-white text-sm solid-input">
                </div>
                <div class="flex-1">
                  <label for="qa-reps" class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Min Reps</label>
                  <input id="qa-reps" type="number" formControlName="reps" min="1" class="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-accent-pos outline-none text-black dark:text-white text-sm solid-input">
                </div>
                <div class="flex-1">
                  <label for="qa-repsMax" class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Max Reps</label>
                  <input id="qa-repsMax" type="number" formControlName="repsMax" min="1" class="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-accent-pos outline-none text-black dark:text-white text-sm solid-input">
                </div>
              </div>

              <div class="flex justify-end gap-3 pt-4">
                <button type="button" (click)="cancelQuickAdd()" class="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors text-sm">Cancel</button>
                <button type="submit" [disabled]="exerciseForm.invalid" class="px-4 py-2 bg-accent-pos hover:opacity-80 text-white rounded-lg text-sm disabled:opacity-50 transition-colors solid-btn">Save Exercise</button>
              </div>
            </form>
          }
        </div>
      </div>
    }
  `
})
export class ProgramDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private programService = inject(ProgramService);
  private exerciseService = inject(ExerciseService);
  private fb = inject(FormBuilder);

  public authService = inject(AuthService);
  programId = signal<string | null>(null);
  program = signal<TrainingProgram | null>(null);
  weekTemplateId = signal<string | null>(null);
  days = signal<DayTemplate[]>([]);
  availableExercises = signal<Exercise[]>([]);
  isLoading = signal<boolean>(true);
  showAddDay = signal<boolean>(false);
  showEditProgram = signal<boolean>(false);
  showOptionsMenu = signal<boolean>(false);
  showRateModal = signal<boolean>(false);
  selectedRating = signal<number>(10);
  isSubmittingRating = signal<boolean>(false);
  isImporting = signal<boolean>(false);
  reorderModeActive = signal<boolean>(false);
  isReordering = signal<boolean>(false);

  isReadOnly = computed(() => {
    const prog = this.program();
    if (!prog) return false;
    if (!prog.isPublic) return false;
    const currentUserId = this.authService.currentUserId;
    const isOwner = !!currentUserId && prog.userId === currentUserId;
    return !isOwner && !this.authService.isAdmin;
  });

  programForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: [''],
    durationWeeks: [4, [Validators.required, Validators.min(1), Validators.max(52)]],
    goal: ['MAINTENANCE', Validators.required],
    isPublic: [false]
  });

  formatGoal(goal?: string): string {
    if (!goal) return '';
    switch (goal) {
      case 'MAINTENANCE': return 'Maintenance';
      case 'CUT': return 'Cut';
      case 'BULK': return 'Bulk';
      default: return goal;
    }
  }

  openEditProgram() {
    const prog = this.program();
    if (prog) {
      this.programForm.patchValue({
        name: prog.name,
        description: prog.description || '',
        durationWeeks: prog.durationWeeks,
        goal: prog.goal,
        isPublic: prog.isPublic || false
      });
      this.showEditProgram.set(true);
    }
  }

  cancelEditProgram() {
    this.showEditProgram.set(false);
  }

  onSubmitProgram() {
    const prog = this.program();
    if (this.programForm.valid && prog) {
      const { name, durationWeeks, goal, isPublic, description } = this.programForm.value;
      this.programService.updateProgram(
        prog.id,
        name,
        durationWeeks,
        prog.isActive,
        goal,
        isPublic,
        description
      ).subscribe({
        next: (updatedProgram) => {
          this.program.set(updatedProgram);
          this.showEditProgram.set(false);
        },
        error: (err) => console.error('Error updating program', err)
      });
    }
  }

  openRateModal() {
    const prog = this.program();
    this.selectedRating.set(prog?.userRating ?? 10);
    this.showRateModal.set(true);
  }

  submitRating() {
    const prog = this.program();
    if (!prog) return;

    this.isSubmittingRating.set(true);
    this.programService.rateProgram(prog.id, this.selectedRating()).subscribe({
      next: (updated) => {
        this.program.set(updated);
        this.isSubmittingRating.set(false);
        this.showRateModal.set(false);
      },
      error: (err) => {
        console.error('Error rating program', err);
        this.isSubmittingRating.set(false);
      }
    });
  }

  useThisProgram() {
    const prog = this.program();
    if (!prog) return;

    if (confirm(`Import "${prog.name}" as your active program?`)) {
      this.isImporting.set(true);
      this.programService.copyPublicProgram(prog.id).subscribe({
        next: (copied) => {
          this.isImporting.set(false);
          this.router.navigate(['/programs', copied.id]);
        },
        error: (err) => {
          console.error('Error importing program', err);
          this.isImporting.set(false);
        }
      });
    }
  }

  toggleReorderMode() {
    this.reorderModeActive.update(v => !v);
  }

  dayForm: FormGroup = this.fb.group({
    dayName: ['', Validators.required]
  });

  addingExerciseToDayId = signal<string | null>(null);
  selectedExercise = signal<Exercise | null>(null);

  programVolumeBreakdown = computed(() => {
    const breakdown = new Map<string, number>();
    for (const day of this.days()) {
      if (!day.exercises) continue;
      for (const ex of day.exercises) {
        if (!ex.sets) continue;
        const fullEx = this.availableExercises().find(e => e.id === ex.exerciseId);
        if (fullEx && fullEx.targets) {
          for (const t of fullEx.targets) {
            const path = getBodyPartPath(t.bodyPart as BodyPart);
            const name = path ? path.group : t.bodyPart.replace(/_/g, ' ');
            breakdown.set(name, (breakdown.get(name) || 0) + ex.sets);
          }
        }
      }
    }
    return Array.from(breakdown.entries())
      .map(([part, sets]) => ({ part, sets }))
      .sort((a, b) => b.sets - a.sets);
  });
  
  getExistingExerciseIds(): string[] {
    const dayId = this.addingExerciseToDayId();
    if (!dayId) return [];
    const day = this.days().find(d => d.id === dayId);
    return day?.exercises?.map(e => e.exerciseId) || [];
  }

  exerciseForm: FormGroup = this.fb.group({
    exerciseId: ['', Validators.required],
    sets: [3],
    reps: [10],
    repsMax: [null],
    durationMinutes: [null],
    incline: [null],
    resistance: [null]
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.programId.set(params.get('id'));
      if (this.programId()) {
        this.loadProgramData();
      }
    });
  }

  loadProgramData() {
    const id = this.programId();
    if (!id) return;
    
    this.isLoading.set(true);
    
    forkJoin({
      program: this.programService.getProgram(id),
      weeks: this.programService.getWeeks(id),
      exercises: this.exerciseService.getExercises()
    }).subscribe({
      next: (data) => {
        this.program.set(data.program);
        this.availableExercises.set(data.exercises);
        
        const weeksData = data.weeks;
        if (weeksData.length === 0) {
          if (!this.isReadOnly()) {
            // Auto-create the single week template if owned
            this.programService.createWeek(id, 'Training Week').subscribe({
              next: (newWeek) => {
                this.weekTemplateId.set(newWeek.id);
                this.days.set([]);
                this.isLoading.set(false);
              },
              error: (err) => {
                console.error('Failed to auto-create week template', err);
                this.isLoading.set(false);
              }
            });
          } else {
            this.days.set([]);
            this.isLoading.set(false);
          }
        } else {
          // Use the first week template
          const week = weeksData[0];
          this.weekTemplateId.set(week.id);
          this.loadDays(week.id);
        }
      },
      error: (err) => {
        console.error('Failed to load program data', err);
        this.isLoading.set(false);
      }
    });
  }

  loadDays(weekId: string) {
    this.programService.getDays(weekId).subscribe({
      next: (daysData) => {
        if (daysData.length === 0) {
          this.days.set([]);
          this.isLoading.set(false);
          return;
        }

        const exerciseRequests = daysData.map(day => 
          this.programService.getDayExercises(day.id)
        );

        forkJoin(exerciseRequests).subscribe({
          next: (exerciseArrays) => {
            const enrichedDays: DayTemplate[] = daysData.map((day, index) => ({
              ...day,
              exercises: exerciseArrays[index].sort((a, b) => a.sortOrder - b.sortOrder)
            }));
            this.days.set(enrichedDays);
            this.isLoading.set(false);
          },
          error: (err) => {
            console.error('Failed to load day exercises', err);
            const daysWithEmptyExercises = daysData.map(day => ({
              ...day,
              exercises: day.exercises || []
            }));
            this.days.set(daysWithEmptyExercises);
            this.isLoading.set(false);
          }
        });
      },
      error: (err) => {
        console.error('Failed to load days', err);
        this.isLoading.set(false);
      }
    });
  }

  openAddDay() {
    const nextDayNumber = this.days().length + 1;
    this.dayForm.patchValue({ dayName: `Day ${nextDayNumber}` });
    this.showAddDay.set(true);
  }

  cancelAddDay() {
    this.showAddDay.set(false);
    this.dayForm.reset();
  }

  getTotalSets(day: DayTemplate): number {
    if (!day.exercises) return 0;
    return day.exercises.reduce((total, ex) => total + (ex.sets || 0), 0);
  }

  onSubmitDay() {
    const weekId = this.weekTemplateId();
    if (this.dayForm.valid && weekId) {
      this.programService.createDay(weekId, this.dayForm.value.dayName).subscribe({
        next: () => {
          this.showAddDay.set(false);
          this.loadDays(weekId);
        },
        error: (err) => console.error('Error adding day', err)
      });
    }
  }

  deleteDay(dayId: string, event: Event) {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this day? This cannot be undone.')) {
      this.programService.deleteDay(dayId).subscribe({
        next: () => {
          this.days.update(days => days.filter(d => d.id !== dayId));
        },
        error: (err) => console.error('Failed to delete day', err)
      });
    }
  }

  dropDay(event: CdkDragDrop<DayTemplate[]>) {
    if (this.isReordering()) return;
    
    this.isReordering.set(true);
    const currentDays = [...this.days()];
    
    moveItemInArray(currentDays, event.previousIndex, event.currentIndex);
    this.days.set(currentDays);

    const weekId = this.weekTemplateId();
    if (!weekId) {
      this.isReordering.set(false);
      return;
    }

    const requests = currentDays.map((t, i) => ({
      id: t.id,
      sortOrder: i + 1
    }));

    this.programService.reorderDays(weekId, requests).subscribe({
      next: () => {
        this.isReordering.set(false);
        this.loadDays(weekId);
      },
      error: (err) => {
        console.error('Failed to reorder', err);
        this.isReordering.set(false);
      }
    });
  }

  openQuickAdd(dayId: string, event: Event) {
    event.stopPropagation();
    this.addingExerciseToDayId.set(dayId);
    this.selectedExercise.set(null);
    this.exerciseForm.reset({ sets: 3, reps: 10 });
  }

  cancelQuickAdd() {
    this.addingExerciseToDayId.set(null);
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
    const dayId = this.addingExerciseToDayId();
    if (this.exerciseForm.valid && dayId) {
      const formVal = this.exerciseForm.value;
      const day = this.days().find(d => d.id === dayId);
      const sortOrder = day?.exercises?.length || 0;

      const sets = formVal.sets;
      const reps = formVal.reps;
      const repsMax = formVal.repsMax;

      this.programService.addDayExercise(
        dayId,
        formVal.exerciseId,
        sets,
        reps,
        sortOrder,
        repsMax
      ).subscribe({
        next: () => {
          this.cancelQuickAdd();
          this.loadProgramData();
        },
        error: (err) => console.error('Error adding exercise', err)
      });
    }
  }
}

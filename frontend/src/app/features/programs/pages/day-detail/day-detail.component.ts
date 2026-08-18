import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProgramService } from '../../services/program.service';
import { ExerciseService } from '../../../exercises/services/exercise.service';
import { DayTemplate, DayExercise, Exercise, TrainingProgram } from '../../../../core/types/training.types';
import { ExerciseSearchComponent } from '../../../exercises/components/exercise-search/exercise-search.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { Observable, forkJoin } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-day-detail',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, ExerciseSearchComponent],
  template: `
    <div class="max-w-7xl mx-auto space-y-6 pb-24">
    
      <!-- Back Link & Header -->
      <div>
        <div class="mb-3">
          <a [routerLink]="['/programs', programId()]" class="text-xs sm:text-sm font-semibold text-gray-500 hover:text-black dark:hover:text-white transition-colors inline-flex items-center gap-1.5">
            &larr; Back to Program Overview
          </a>
        </div>

        @if (isLoading()) {
          <div class="text-gray-500 dark:text-gray-400">Loading day details...</div>
        }
    
        @if (!isLoading() && day()) {
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-gray-300 dark:border-gray-800 pb-4 gap-4">
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-2xl sm:text-3xl font-bold text-black dark:text-white">{{ day()?.name }}</h1>
                @if (isReadOnly()) {
                  <span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-accent-pos/20 text-accent-pos border border-accent-pos/30">
                    Preview Mode
                  </span>
                }
              </div>
              <p class="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
                {{ exercises().length }} exercises configured &bull; Expected Volume: {{ totalVolumeSets() }} sets
              </p>
            </div>

            @if (!isReadOnly()) {
              <button
                (click)="openAddExercise()"
                class="px-4 py-2 bg-accent-pos hover:opacity-80 text-white rounded-xl transition-colors text-sm font-semibold shadow-lg solid-btn shrink-0"
              >
                + Add Exercise
              </button>
            }
          </div>
        }
      </div>
    
      <!-- Add Exercise Form -->
      @if (showAddExercise() && !isLoading() && !isReadOnly()) {
        <div class="solid-card p-6 border border-accent-pos/30">
          <h3 class="text-lg font-bold text-black dark:text-white mb-4">Add Exercise to {{ day()?.name }}</h3>
          @if (!selectedExercise()) {
            <app-exercise-search [excludeIds]="existingExerciseIds()" [publicOnly]="program()?.isPublic || false" (exerciseSelected)="onExerciseSelected($event)"></app-exercise-search>
          }
          @if (selectedExercise()) {
            <form [formGroup]="exerciseForm" (ngSubmit)="onSubmitExercise()" class="space-y-4">
              <div class="text-sm font-semibold text-accent-pos mb-1 border-b border-gray-300 dark:border-gray-700 pb-2 flex items-center gap-2">
                Selected:
                @if (selectedExercise()?.isPublic) {
                  <svg class="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                }
                <span>{{ selectedExercise()?.name }}</span>
                @if (selectedExercise()?.equipmentBrand) {
                  <span class="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-700">
                    {{ selectedExercise()?.equipmentBrand }}
                  </span>
                }
              </div>
              <div class="flex gap-4">
                <div class="flex-1">
                  <label for="setsInput" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sets</label>
                  <input
                    id="setsInput"
                    type="number"
                    formControlName="sets"
                    min="1"
                    class="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-accent-pos outline-none text-black dark:text-white text-sm solid-input"
                  >
                </div>
              </div>
              <div class="mt-4 flex items-center gap-3">
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    formControlName="isAmrap"
                    class="sr-only peer"
                    id="isAmrap"
                  >
                  <div class="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent-pos rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-pos"></div>
                </label>
                <label for="isAmrap" class="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  AMRAP
                  <span class="text-gray-500 dark:text-gray-400 text-xs ml-1">(As Many Reps As Possible)</span>
                </label>
              </div>

              @if (!exerciseForm.get('isAmrap')?.value) {
                <div class="flex gap-4 mt-4">
                  <div class="flex-1">
                    <label for="repsInput" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Reps</label>
                    <input
                      id="repsInput"
                      type="number"
                      formControlName="reps"
                      min="1"
                      class="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-accent-pos outline-none text-black dark:text-white text-sm solid-input"
                    >
                  </div>
                  <div class="flex-1">
                    <label for="repsMaxInput" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Reps (Optional)</label>
                    <input
                      id="repsMaxInput"
                      type="number"
                      formControlName="repsMax"
                      min="1"
                      class="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-accent-pos outline-none text-black dark:text-white text-sm solid-input"
                    >
                  </div>
                </div>
              }
              <div class="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  (click)="cancelAdd()"
                  class="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  [disabled]="exerciseForm.invalid"
                  class="px-4 py-2 bg-accent-pos hover:opacity-80 text-white rounded-lg text-sm disabled:opacity-50 transition-colors solid-btn"
                >
                  Save Exercise
                </button>
              </div>
            </form>
          }
        </div>
      }
    
      <!-- Exercises List -->
      @if (!isLoading() && day()) {
        <div class="space-y-6 mt-4">
          @if (exercises().length === 0 && !showAddExercise()) {
            <div class="text-center py-16 solid-card border border-dashed border-gray-300 dark:border-gray-700">
              <div class="w-14 h-14 bg-accent-pos/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-accent-pos" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 class="text-lg font-bold text-black dark:text-white mb-2">No exercises configured</h3>
              <p class="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
                {{ isReadOnly() ? 'This public template day has no exercises assigned.' : 'Pick exercises from your catalog and specify target sets and reps for this training day.' }}
              </p>
              @if (!isReadOnly()) {
                <button (click)="openAddExercise()" class="px-6 py-2.5 bg-accent-pos hover:opacity-80 text-white font-semibold rounded-xl transition-all solid-btn">
                  + Add Exercise
                </button>
              }
            </div>
          }

          @if (exercises().length > 0) {
            <div class="space-y-3">
              <h4 class="text-gray-700 dark:text-gray-300 font-semibold mb-2">Exercises Routine</h4>
              @for (ex of exercises(); track ex.id; let i = $index) {
                <div class="solid-card p-4 flex flex-col group hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                      <!-- Reorder handles (only in edit mode) -->
                      @if (!isReadOnly()) {
                        <div class="flex flex-col gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                          <button
                            (click)="moveStrengthExercise(ex.id, -1)"
                            [disabled]="i === 0"
                            class="text-gray-400 hover:text-black dark:hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 p-1"
                            title="Move Up"
                          >
                            &uarr;
                          </button>
                          <button
                            (click)="moveStrengthExercise(ex.id, 1)"
                            [disabled]="i === exercises().length - 1"
                            class="text-gray-400 hover:text-black dark:hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 p-1"
                            title="Move Down"
                          >
                            &darr;
                          </button>
                        </div>
                      }

                      <div>
                        <h4 class="font-semibold text-lg text-black dark:text-white flex items-center flex-wrap gap-2">
                          @if (ex.isPublic) {
                            <svg class="w-4 h-4 text-purple-500 dark:text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          }
                          <span>{{ ex.exerciseName }}</span>
                          @if (ex.equipmentBrand) {
                            <span class="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-700 font-sans tracking-normal font-normal">
                              {{ ex.equipmentBrand }}
                            </span>
                          }
                          @for (target of getExerciseTargets(ex.exerciseId); track target) {
                            <span class="text-[10px] bg-gray-200 dark:bg-gray-700/60 text-gray-800 dark:text-gray-300 px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600/50 uppercase">{{ target }}</span>
                          }
                        </h4>
                        <p class="text-gray-500 dark:text-gray-400 text-sm">
                          {{ ex.sets }} sets &times;
                          @if (ex.isAmrap) {
                            AMRAP
                          } @else {
                            {{ ex.reps }}{{ ex.repsMax ? '-' + ex.repsMax : '' }} reps
                          }
                        </p>
                      </div>
                    </div>

                    @if (!isReadOnly()) {
                      <div class="flex items-center gap-1">
                        <button
                          (click)="startEditExercise(ex)"
                          class="text-accent-pos hover:opacity-80 p-2 opacity-50 group-hover:opacity-100 transition-opacity"
                          title="Edit Parameters"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          (click)="deleteExercise(ex.id)"
                          class="text-accent-neg hover:opacity-80 p-2 opacity-50 group-hover:opacity-100 transition-opacity"
                          title="Remove"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    }
                  </div>

                  @if (editingExerciseId() === ex.id && !isReadOnly()) {
                    <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                      <div class="text-sm font-semibold text-accent-pos">
                        Edit Exercise Parameters
                      </div>
                      <form [formGroup]="editForm" (ngSubmit)="onSubmitEdit(ex)" class="space-y-4">
                        <div class="flex gap-4">
                          <div class="flex-1">
                            <label for="editSetsInput_{{ex.id}}" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sets</label>
                            <input
                              id="editSetsInput_{{ex.id}}"
                              type="number"
                              formControlName="sets"
                              min="1"
                              class="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-accent-pos outline-none text-black dark:text-white text-sm solid-input"
                            >
                          </div>
                        </div>
                        <div class="flex items-center gap-3">
                          <label class="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              formControlName="isAmrap"
                              class="sr-only peer"
                              id="editIsAmrap_{{ex.id}}"
                            >
                            <div class="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent-pos rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-pos"></div>
                          </label>
                          <label for="editIsAmrap_{{ex.id}}" class="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                            AMRAP
                            <span class="text-gray-500 dark:text-gray-400 text-xs ml-1">(As Many Reps As Possible)</span>
                          </label>
                        </div>

                        @if (!editForm.get('isAmrap')?.value) {
                          <div class="flex gap-4">
                            <div class="flex-1">
                              <label for="editRepsInput_{{ex.id}}" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Reps</label>
                              <input
                                id="editRepsInput_{{ex.id}}"
                                type="number"
                                formControlName="reps"
                                min="1"
                                class="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-accent-pos outline-none text-black dark:text-white text-sm solid-input"
                              >
                            </div>
                            <div class="flex-1">
                              <label for="editRepsMaxInput_{{ex.id}}" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Reps (Optional)</label>
                              <input
                                id="editRepsMaxInput_{{ex.id}}"
                                type="number"
                                formControlName="repsMax"
                                min="1"
                                class="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-accent-pos outline-none text-black dark:text-white text-sm solid-input"
                              >
                            </div>
                          </div>
                        }

                        <div class="flex justify-end gap-3 pt-2">
                          <button
                            type="button"
                            (click)="cancelEdit()"
                            class="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            [disabled]="editForm.invalid"
                            class="px-4 py-2 bg-accent-pos hover:opacity-80 text-white rounded-lg text-sm disabled:opacity-50 transition-colors solid-btn"
                          >
                            Save Changes
                          </button>
                        </div>
                      </form>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `
})
export class DayDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private programService = inject(ProgramService);
  private exerciseService = inject(ExerciseService);
  public authService = inject(AuthService);
  private fb = inject(FormBuilder);

  programId = signal<string | null>(null);
  dayId = signal<string | null>(null);
  program = signal<TrainingProgram | null>(null);
  day = signal<DayTemplate | null>(null);
  exercises = signal<DayExercise[]>([]);
  availableExercises = signal<Exercise[]>([]);

  isReadOnly = computed(() => {
    const prog = this.program();
    if (!prog) return false;
    if (!prog.isPublic) return false;
    const currentUserId = this.authService.currentUserId;
    const isOwner = !!currentUserId && prog.userId === currentUserId;
    return !isOwner && !this.authService.isAdmin;
  });

  totalVolumeSets = computed(() => {
    return this.exercises().reduce((total, ex) => total + (ex.sets || 0), 0);
  });

  isLoading = signal<boolean>(true);
  showAddExercise = signal<boolean>(false);
  selectedExercise = signal<Exercise | null>(null);
  editingExerciseId = signal<string | null>(null);

  exerciseForm: FormGroup = this.fb.group({
    exerciseId: ['', Validators.required],
    sets: [3],
    reps: [10],
    repsMax: [null],
    isAmrap: [false],
    durationMinutes: [null],
    incline: [null],
    resistance: [null]
  });

  editForm: FormGroup = this.fb.group({
    sets: [3, [Validators.required, Validators.min(1)]],
    reps: [10, [Validators.required, Validators.min(1)]],
    repsMax: [null],
    isAmrap: [false]
  });

  existingExerciseIds(): string[] {
    return this.exercises().map(e => e.exerciseId);
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.programId.set(params.get('programId'));
      this.dayId.set(params.get('dayId'));
      
      if (this.dayId()) {
        this.loadData();
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

    this.editForm.get('isAmrap')?.valueChanges.subscribe(isAmrap => {
      const repsControl = this.editForm.get('reps');
      if (isAmrap) {
        repsControl?.clearValidators();
      } else {
        repsControl?.setValidators([Validators.required, Validators.min(1)]);
      }
      repsControl?.updateValueAndValidity();
    });
  }

  loadData() {
    this.isLoading.set(true);
    const dayId = this.dayId();
    const programId = this.programId();
    if (!dayId) return;

    const requests: {
      day: Observable<DayTemplate>;
      dayExercises: Observable<DayExercise[]>;
      library: Observable<Exercise[]>;
      program?: Observable<TrainingProgram>;
    } = {
      day: this.programService.getDay(dayId),
      dayExercises: this.programService.getDayExercises(dayId),
      library: this.exerciseService.getExercises()
    };

    if (programId) {
      requests.program = this.programService.getProgram(programId);
    }

    forkJoin(requests).subscribe({
      next: (data) => {
        this.day.set(data.day);
        const sorted = data.dayExercises.sort((a, b) => a.sortOrder - b.sortOrder);
        this.exercises.set(sorted);
        if (data.program) {
          this.program.set(data.program);
        }
        const available = data.program?.isPublic
          ? data.library.filter(e => e.isPublic)
          : data.library;
        this.availableExercises.set(available);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load day details', err);
        this.isLoading.set(false);
      }
    });
  }

  openAddExercise() {
    this.showAddExercise.set(true);
    this.selectedExercise.set(null);
    this.exerciseForm.reset({ sets: 3, reps: 10, repsMax: null, isAmrap: false });
  }

  cancelAdd() {
    this.showAddExercise.set(false);
    this.selectedExercise.set(null);
  }

  startEditExercise(ex: DayExercise) {
    this.editingExerciseId.set(ex.id);
    this.editForm.patchValue({
      sets: ex.sets || 3,
      isAmrap: !!ex.isAmrap,
      reps: ex.reps || 10,
      repsMax: ex.repsMax || null
    });
  }

  cancelEdit() {
    this.editingExerciseId.set(null);
  }

  onSubmitEdit(ex: DayExercise) {
    if (this.editForm.valid && ex.id) {
      const formVal = this.editForm.value;
      const sets = formVal.sets;
      const isAmrap = !!formVal.isAmrap;
      const reps = isAmrap ? undefined : formVal.reps;
      const repsMax = isAmrap ? undefined : formVal.repsMax;

      this.programService.updateDayExercise(
        ex.id,
        sets,
        reps,
        ex.sortOrder,
        repsMax,
        undefined,
        undefined,
        undefined,
        isAmrap
      ).subscribe({
        next: () => {
          this.cancelEdit();
          this.loadData();
        },
        error: (err) => console.error('Error updating exercise', err)
      });
    }
  }

  getExerciseTargets(exerciseId: string): string[] {
    const ex = this.availableExercises().find(e => e.id === exerciseId);
    return ex ? ex.targets.map(t => t.bodyPart.replace(/_/g, ' ')) : [];
  }

  onExerciseSelected(ex: Exercise) {
    this.selectedExercise.set(ex);
    this.exerciseForm.patchValue({ exerciseId: ex.id });

    this.exerciseForm.get('sets')?.setValidators([Validators.required, Validators.min(1)]);
    if (this.exerciseForm.get('isAmrap')?.value) {
      this.exerciseForm.get('reps')?.clearValidators();
    } else {
      this.exerciseForm.get('reps')?.setValidators([Validators.required, Validators.min(1)]);
    }
    
    this.exerciseForm.get('sets')?.updateValueAndValidity();
    this.exerciseForm.get('reps')?.updateValueAndValidity();
  }

  onSubmitExercise() {
    const dayId = this.dayId();
    if (this.exerciseForm.valid && dayId) {
      const formVal = this.exerciseForm.value;
      const sortOrder = this.exercises().length;

      const sets = formVal.sets;
      const reps = formVal.isAmrap ? undefined : formVal.reps;
      const repsMax = formVal.isAmrap ? undefined : formVal.repsMax;
      const isAmrap = formVal.isAmrap;

      this.programService.addDayExercise(
        dayId, 
        formVal.exerciseId, 
        sets, 
        reps, 
        sortOrder, 
        repsMax,
        undefined,
        undefined,
        undefined,
        isAmrap
      ).subscribe({
        next: () => {
          this.cancelAdd();
          this.loadData();
        },
        error: (err) => console.error('Error adding exercise', err)
      });
    }
  }

  deleteExercise(id: string) {
    if (confirm('Delete this exercise from the day?')) {
      this.programService.deleteDayExercise(id).subscribe({
        next: () => this.loadData(),
        error: (err) => console.error('Error deleting exercise', err)
      });
    }
  }

  moveStrengthExercise(id: string, direction: number) {
    const dayId = this.dayId();
    if (!dayId) return;

    const strengthExs = this.exercises();

    const index = strengthExs.findIndex(e => e.id === id);
    if (index === -1) return;
    if (index + direction < 0 || index + direction >= strengthExs.length) return;

    // Swap elements
    const temp = strengthExs[index];
    strengthExs[index] = strengthExs[index + direction];
    strengthExs[index + direction] = temp;

    const orderedItems = strengthExs.map((ex, idx) => ({ id: ex.id, sortOrder: idx }));

    this.programService.reorderDayExercises(dayId, orderedItems).subscribe({
      next: () => this.loadData(),
      error: (err) => console.error('Failed to reorder exercises', err)
    });
  }
}

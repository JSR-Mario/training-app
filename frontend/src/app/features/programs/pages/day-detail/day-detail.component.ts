import { Component, OnInit, signal, computed, inject } from '@angular/core';

import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProgramService } from '../../services/program.service';
import { ExerciseService } from '../../../exercises/services/exercise.service';
import { DayTemplate, DayExercise, Exercise } from '../../../../core/types/training.types';
import { ExerciseSearchComponent } from '../../../exercises/components/exercise-search/exercise-search.component';
import { forkJoin } from 'rxjs';

@Component({
  standalone: true,
    selector: 'app-day-detail',
    imports: [RouterModule, ReactiveFormsModule, ExerciseSearchComponent],
    template: `
    <div class="max-w-7xl mx-auto space-y-6 pb-24">
    
      <!-- Header -->
      <div>
        @if (isLoading()) {
          <div class="text-gray-400">Loading day details...</div>
        }
    
        @if (!isLoading() && day()) {
          <div class="flex justify-between items-end border-b border-gray-800 pb-4">
            <div>
              <h1 class="text-3xl font-bold text-white">{{ day()?.name }}</h1>
              <p class="text-gray-400 mt-1">{{ exercises().length }} exercises configured</p>
            </div>
            <button
              (click)="openAddExercise()"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm font-medium shadow-lg"
              >
              + Add Exercise
            </button>
          </div>
        }
      </div>
    
      <!-- Add Exercise Form -->
      @if (showAddExercise() && !isLoading()) {
        <div class="glass-card p-6 border border-blue-500/30">
          <h3 class="text-lg font-bold text-white mb-4">Add Exercise to {{ day()?.name }}</h3>
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
                    <input
                      id="setsInput"
                      type="number"
                      formControlName="sets"
                      min="1"
                      class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-white text-sm"
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
                    <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <label for="isAmrap" class="text-sm font-medium text-gray-300 cursor-pointer">
                    AMRAP
                    <span class="text-gray-500 text-xs ml-1">(As Many Reps As Possible)</span>
                  </label>
                </div>

                @if (!exerciseForm.get('isAmrap')?.value) {
                  <div class="flex gap-4 mt-4">
                    <div class="flex-1">
                      <label for="repsInput" class="block text-sm font-medium text-gray-300 mb-1">Min Reps</label>
                      <input
                        id="repsInput"
                        type="number"
                        formControlName="reps"
                        min="1"
                        class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-white text-sm"
                        >
                    </div>
                    <div class="flex-1">
                      <label for="repsMaxInput" class="block text-sm font-medium text-gray-300 mb-1">Max Reps (Optional)</label>
                      <input
                        id="repsMaxInput"
                        type="number"
                        formControlName="repsMax"
                        min="1"
                        class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-white text-sm"
                        >
                    </div>
                  </div>
                }
              }
              @if (selectedExercise()?.type === 'CARDIO') {
                <div class="flex gap-4">
                  <div class="flex-1">
                    <label for="durationInput" class="block text-sm font-medium text-gray-300 mb-1">Duration (min)</label>
                    <input
                      id="durationInput"
                      type="number"
                      formControlName="durationMinutes"
                      min="1"
                      class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-1 focus:ring-purple-500 outline-none text-white text-sm"
                      >
                  </div>
                  <div class="flex-1">
                    <label for="inclineInput" class="block text-sm font-medium text-gray-300 mb-1">Incline <span class="text-xs text-gray-500">(Optional)</span></label>
                    <input
                      id="inclineInput"
                      type="number"
                      formControlName="incline"
                      step="0.1"
                      class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-1 focus:ring-purple-500 outline-none text-white text-sm"
                      >
                  </div>
                  <div class="flex-1">
                    <label for="resistanceInput" class="block text-sm font-medium text-gray-300 mb-1">Speed / Resistance <span class="text-xs text-gray-500">(Optional)</span></label>
                    <input
                      id="resistanceInput"
                      type="number"
                      formControlName="resistance"
                      step="0.1"
                      class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-1 focus:ring-purple-500 outline-none text-white text-sm"
                      >
                  </div>
                </div>
              }
              <div class="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  (click)="cancelAdd()"
                  class="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
                  >
                  Cancel
                </button>
                <button
                  type="submit"
                  [disabled]="exerciseForm.invalid"
                  class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm disabled:opacity-50 transition-colors"
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
            <div class="text-center py-12 glass-card border border-dashed border-gray-700">
              <p class="text-gray-400">No exercises added yet.</p>
              <button (click)="openAddExercise()" class="mt-4 text-blue-400 hover:text-blue-300 text-sm">Add your first exercise</button>
            </div>
          }
          @if (strengthExs().length > 0) {
            <div class="space-y-3">
              <h4 class="text-gray-300 font-semibold mb-2">Strength Exercises</h4>
              @for (ex of strengthExs(); track ex; let i = $index) {
                <div class="glass-card p-4 flex items-center justify-between group hover:border-gray-600 transition-colors">
                  <div class="flex items-center gap-4">
                    <!-- Reorder handles -->
                    <div class="flex flex-col gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button
                        (click)="moveStrengthExercise(ex.id, -1)"
                        [disabled]="i === 0"
                        class="text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 p-1"
                        title="Move Up"
                        >
                        &uarr;
                      </button>
                      <button
                        (click)="moveStrengthExercise(ex.id, 1)"
                        [disabled]="i === strengthExs().length - 1"
                        class="text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 p-1"
                        title="Move Down"
                        >
                        &darr;
                      </button>
                    </div>
                    <div>
                      <h4 class="font-semibold text-lg text-white flex items-center flex-wrap gap-2">
                        {{ ex.exerciseName }}
                        @for (target of getExerciseTargets(ex.exerciseId); track target) {
                          <span class="text-[10px] bg-slate-700/60 text-slate-300 px-1.5 py-0.5 rounded border border-slate-600/50 uppercase">{{ target }}</span>
                        }
                      </h4>
                      <p class="text-gray-400 text-sm">
                        {{ ex.sets }} sets &times;
                        @if (ex.isAmrap) {
                          AMRAP
                        } @else {
                          {{ ex.reps }}{{ ex.repsMax ? '-' + ex.repsMax : '' }} reps
                        }
                      </p>
                    </div>
                  </div>
                  <button
                    (click)="deleteExercise(ex.id)"
                    class="text-red-400 hover:text-red-300 p-2 opacity-50 group-hover:opacity-100 transition-opacity"
                    title="Remove"
                    >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>
              }
            </div>
          }
          @if (cardioExs().length > 0) {
            <div class="space-y-3">
              <h4 class="text-purple-400 font-semibold mb-2 mt-6">Cardio</h4>
              @for (ex of cardioExs(); track ex) {
                <div class="glass-card p-4 flex items-center justify-between group border border-purple-500/20 bg-purple-900/10">
                  <div class="flex items-center gap-4 pl-8"> <!-- Pl-8 to align with strength exercises text which have move buttons -->
                    <div>
                      <h4 class="font-semibold text-lg text-white flex items-center gap-2">
                        {{ ex.exerciseName }}
                        <span class="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded uppercase">Cardio</span>
                      </h4>
                      <p class="text-gray-400 text-sm">
                        {{ ex.durationMinutes }} min
                        @if (ex.incline) {
                          <span> &bull; Inc: {{ ex.incline }}</span>
                        }
                        @if (ex.resistance) {
                          <span> &bull; Spd/Res: {{ ex.resistance }}</span>
                        }
                      </p>
                    </div>
                  </div>
                  <button
                    (click)="deleteExercise(ex.id)"
                    class="text-red-400 hover:text-red-300 p-2 opacity-50 group-hover:opacity-100 transition-opacity"
                    title="Remove"
                    >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>
              }
            </div>
          }
        </div>
      }

      @if (!isLoading() && volumeBreakdown().length > 0) {
        <div class="mt-8 pt-8 border-t border-gray-800">
          <h3 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Volume Breakdown
          </h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            @for (item of volumeBreakdown(); track item.part) {
              <div class="bg-gray-800/40 rounded-xl p-4 flex flex-col items-center justify-center border border-gray-700/50 hover:bg-gray-800 transition-colors">
                <span class="text-3xl font-black text-blue-400">{{ item.sets }}</span>
                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-1 text-center">{{ item.part }}</span>
              </div>
            }
          </div>
        </div>
      }
    </div>
    `
})
export class DayDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private programService = inject(ProgramService);
  private exerciseService = inject(ExerciseService);
  private fb = inject(FormBuilder);

  programId = signal<string | null>(null);
  dayId = signal<string | null>(null);
  day = signal<DayTemplate | null>(null);
  exercises = signal<DayExercise[]>([]);
  existingExerciseIds = computed(() => this.exercises().map(e => e.exerciseId));
  availableExercises = signal<Exercise[]>([]);
  
  strengthExs = computed(() => this.exercises().filter(e => !e.durationMinutes));
  cardioExs = computed(() => this.exercises().filter(e => !!e.durationMinutes));

  volumeBreakdown = computed(() => {
    const breakdown = new Map<string, number>();
    for (const ex of this.strengthExs()) {
      if (!ex.sets) continue;
      const fullEx = this.availableExercises().find(e => e.id === ex.exerciseId);
      if (fullEx && fullEx.targets) {
        for (const t of fullEx.targets) {
          const name = t.bodyPart.replace(/_/g, ' ');
          breakdown.set(name, (breakdown.get(name) || 0) + ex.sets);
        }
      }
    }
    return Array.from(breakdown.entries())
      .map(([part, sets]) => ({ part, sets }))
      .sort((a, b) => b.sets - a.sets);
  });

  isLoading = signal<boolean>(true);
  showAddExercise = signal<boolean>(false);
  selectedExercise = signal<Exercise | null>(null);

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

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.programId.set(params.get('programId'));
      this.dayId.set(params.get('dayId'));
      
      if (this.dayId()) {
        this.loadData();
      }
    });
  }

  loadData() {
    this.isLoading.set(true);
    const dayId = this.dayId();
    if (!dayId) return;

    forkJoin({
      day: this.programService.getDay(dayId),
      dayExercises: this.programService.getDayExercises(dayId),
      library: this.exerciseService.getExercises()
    }).subscribe({
      next: (data) => {
        this.day.set(data.day);
        const sorted = data.dayExercises.sort((a, b) => a.sortOrder - b.sortOrder);
        this.exercises.set(sorted);
        this.availableExercises.set(data.library);
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
    this.exerciseForm.reset({ sets: 3, reps: 10, repsMax: null });
  }

  cancelAdd() {
    this.showAddExercise.set(false);
    this.selectedExercise.set(null);
  }

  getExerciseTargets(exerciseId: string): string[] {
    const ex = this.availableExercises().find(e => e.id === exerciseId);
    return ex ? ex.targets.map(t => t.bodyPart.replace(/_/g, ' ')) : [];
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
    const dayId = this.dayId();
    if (this.exerciseForm.valid && dayId) {
      const type = this.selectedExercise()?.type;
      const formVal = this.exerciseForm.value;
      const sortOrder = this.exercises().length;

      const sets = type === 'CARDIO' ? undefined : formVal.sets;
      const reps = (type === 'CARDIO' || formVal.isAmrap) ? undefined : formVal.reps;
      const repsMax = (type === 'CARDIO' || formVal.isAmrap) ? undefined : formVal.repsMax;
      const isAmrap = type === 'CARDIO' ? false : formVal.isAmrap;
      const duration = type === 'CARDIO' ? formVal.durationMinutes : undefined;
      const incline = type === 'CARDIO' ? formVal.incline : undefined;
      const resistance = type === 'CARDIO' ? formVal.resistance : undefined;

      this.programService.addDayExercise(
        dayId, 
        formVal.exerciseId, 
        sets, 
        reps, 
        sortOrder, 
        repsMax, 
        duration, 
        incline, 
        resistance,
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

    const currentEx = this.exercises();
    const strengthExs = currentEx.filter(e => !e.durationMinutes);
    const cardioExs = currentEx.filter(e => !!e.durationMinutes);

    const index = strengthExs.findIndex(e => e.id === id);
    if (index === -1) return;
    if (index + direction < 0 || index + direction >= strengthExs.length) return;

    // Swap elements
    const temp = strengthExs[index];
    strengthExs[index] = strengthExs[index + direction];
    strengthExs[index + direction] = temp;

    // Recombine keeping cardio at the bottom
    const combined = [...strengthExs, ...cardioExs];
    const orderedItems = combined.map((ex, idx) => ({ id: ex.id, sortOrder: idx }));

    this.programService.reorderDayExercises(dayId, orderedItems).subscribe({
      next: () => this.loadData(),
      error: (err) => console.error('Failed to reorder exercises', err)
    });
  }
}

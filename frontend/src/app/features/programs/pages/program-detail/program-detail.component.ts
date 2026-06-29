import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProgramService } from '../../services/program.service';
import { TrainingProgram, DayTemplate, Exercise } from '../../../../core/types/training.types';
import { forkJoin } from 'rxjs';
import { ExerciseSearchComponent } from '../../../exercises/components/exercise-search/exercise-search.component';
import { ExerciseService } from '../../../exercises/services/exercise.service';

@Component({
  standalone: true,
    selector: 'app-program-detail',
    imports: [CommonModule, RouterModule, ReactiveFormsModule, ExerciseSearchComponent],
    template: `
    <div class="max-w-7xl mx-auto space-y-6">
    
      <!-- Back Link & Header -->
      <div>
        <a routerLink="/programs" class="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block">&larr; Back to Programs</a>
    
        @if (isLoading()) {
          <div class="text-gray-400">Loading program details...</div>
        }
    
        @if (!isLoading() && program()) {
          <div class="flex justify-between items-end border-b border-gray-800 pb-4">
            <div>
              <h1 class="text-3xl font-bold text-white">{{ program()?.name }}</h1>
              <p class="text-gray-400 mt-1">This template repeats for {{ program()?.durationWeeks }} weeks</p>
            </div>
            @if (weekTemplateId()) {
              <button
                (click)="openAddDay()"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm font-medium shadow-lg"
                >
                + Add Day
              </button>
            }
          </div>
        }
      </div>
    
      @if (!isLoading() && program()) {
        <div class="space-y-6">
          <!-- Add Day Form -->
          @if (showAddDay()) {
            <div class="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
              <form [formGroup]="dayForm" (ngSubmit)="onSubmitDay()" class="flex gap-3">
                <input
                  type="text"
                  formControlName="dayName"
                  placeholder="e.g., Push Day"
                  class="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-white text-sm"
                  >
                <button
                  type="button"
                  (click)="showAddDay.set(false)"
                  class="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
                  >
                  Cancel
                </button>
                <button
                  type="submit"
                  [disabled]="dayForm.invalid"
                  class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm disabled:opacity-50 transition-colors"
                  >
                  Save
                </button>
              </form>
            </div>
          }
          <!-- Days Grid -->
          @if (days().length === 0 && !showAddDay()) {
            <div class="text-center py-12 glass-card border border-dashed border-gray-700">
              <p class="text-gray-400">No days configured for this program.</p>
              <button (click)="openAddDay()" class="mt-4 text-blue-400 hover:text-blue-300 text-sm">Add your first day</button>
            </div>
          }
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (day of days(); track day) {
              <div class="glass-card p-5 group flex flex-col hover:border-gray-600 transition-all cursor-pointer" [routerLink]="['/programs', program()?.id, 'days', day.id]">
                <div class="flex justify-between items-start mb-4">
                  <h3 class="text-xl font-bold text-gray-200 group-hover:text-blue-400 transition-colors">{{ day.name }}</h3>
                  <button
                    (click)="deleteDay(day.id, $event)"
                    class="text-red-400 hover:text-red-300 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Day"
                    >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>
                <div class="text-sm text-gray-400 flex-1">
                  @if (day.exercises && day.exercises.length > 0) {
                    <p>{{ day.exercises.length }} exercises</p>
                  }
                  @if (!day.exercises || day.exercises.length === 0) {
                    <p class="italic">No exercises</p>
                  }
                </div>
                <div class="mt-4 pt-4 border-t border-gray-800 flex justify-between items-center text-sm font-medium">
                  <span class="text-blue-400 group-hover:text-blue-300">Edit Exercises &rarr;</span>
                  <button
                    (click)="openQuickAdd(day.id, $event)"
                    class="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg transition-colors z-10"
                    >
                    + Quick Add
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
    
    <!-- Quick Add Modal -->
    @if (addingExerciseToDayId()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div class="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
          <button (click)="cancelQuickAdd()" class="absolute top-4 right-4 text-gray-400 hover:text-white text-xl">✕</button>
          <h2 class="text-2xl font-bold text-white mb-6">Quick Add Exercise</h2>
          @if (!selectedExercise()) {
            <app-exercise-search [excludeIds]="getExistingExerciseIds()" (exerciseSelected)="onExerciseSelected($event)"></app-exercise-search>
          }
          @if (selectedExercise()) {
            <form [formGroup]="exerciseForm" (ngSubmit)="onSubmitExercise()" class="space-y-4 mt-4">
              <div class="text-sm font-semibold text-blue-400 mb-1 border-b border-gray-700 pb-2 flex items-center gap-2">
                Selected: {{ selectedExercise()?.name }}
                @if (selectedExercise()?.type === 'CARDIO') {
                  <span class="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded uppercase">Cardio</span>
                }
              </div>
              @if (selectedExercise()?.type !== 'CARDIO') {
                <div class="flex gap-4">
                  <div class="flex-1">
                    <label for="qa-sets" class="block text-sm font-medium text-gray-300 mb-1">Sets</label>
                    <input id="qa-sets" type="number" formControlName="sets" min="1" class="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-white text-sm">
                  </div>
                  <div class="flex-1">
                    <label for="qa-reps" class="block text-sm font-medium text-gray-300 mb-1">Min Reps</label>
                    <input id="qa-reps" type="number" formControlName="reps" min="1" class="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-white text-sm">
                  </div>
                  <div class="flex-1">
                    <label for="qa-repsMax" class="block text-sm font-medium text-gray-300 mb-1">Max Reps</label>
                    <input id="qa-repsMax" type="number" formControlName="repsMax" min="1" class="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-white text-sm">
                  </div>
                </div>
              }
              @if (selectedExercise()?.type === 'CARDIO') {
                <div class="flex gap-4">
                  <div class="flex-1">
                    <label for="qa-duration" class="block text-sm font-medium text-gray-300 mb-1">Duration (min)</label>
                    <input id="qa-duration" type="number" formControlName="durationMinutes" min="1" class="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-1 focus:ring-purple-500 outline-none text-white text-sm">
                  </div>
                  <div class="flex-1">
                    <label for="qa-incline" class="block text-sm font-medium text-gray-300 mb-1">Incline</label>
                    <input id="qa-incline" type="number" formControlName="incline" step="0.1" class="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-1 focus:ring-purple-500 outline-none text-white text-sm">
                  </div>
                  <div class="flex-1">
                    <label for="qa-resistance" class="block text-sm font-medium text-gray-300 mb-1">Resis.</label>
                    <input id="qa-resistance" type="number" formControlName="resistance" step="0.1" class="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-1 focus:ring-purple-500 outline-none text-white text-sm">
                  </div>
                </div>
              }
              <div class="flex justify-end gap-3 pt-4">
                <button type="button" (click)="cancelQuickAdd()" class="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm">Cancel</button>
                <button type="submit" [disabled]="exerciseForm.invalid" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm disabled:opacity-50 transition-colors">Save Exercise</button>
              </div>
            </form>
          }
        </div>
        <!-- Expected Weekly Volume Table -->
        @if (expectedWeeklyVolume().length > 0) {
          <div class="glass-card p-6 mt-8">
            <h2 class="text-xl font-bold text-white mb-4">Expected Weekly Volume</h2>
            <div class="overflow-hidden rounded-xl border border-gray-800">
              <table class="min-w-full divide-y divide-gray-800">
                <thead class="bg-gray-900/50">
                  <tr>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Body Part</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Sets per Week</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-800 bg-gray-800/20">
                  @for (vol of expectedWeeklyVolume(); track vol) {
                    <tr>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{{ vol.bodyPart }}</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-blue-400 font-bold">{{ vol.sets | number:'1.0-1' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      </div>
    }
    `
})
export class ProgramDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private programService = inject(ProgramService);
  private exerciseService = inject(ExerciseService);
  private fb = inject(FormBuilder);

  programId = signal<string | null>(null);
  program = signal<TrainingProgram | null>(null);
  weekTemplateId = signal<string | null>(null);
  days = signal<DayTemplate[]>([]);
  availableExercises = signal<Exercise[]>([]);
  isLoading = signal<boolean>(true);
  showAddDay = signal<boolean>(false);

  expectedWeeklyVolume = computed(() => {
    const allExercises = this.availableExercises();
    const currentDays = this.days();
    
    if (allExercises.length === 0 || currentDays.length === 0) return [];
    
    const volumeMap = new Map<string, number>();
    
    for (const day of currentDays) {
      for (const dayEx of day.exercises) {
        if (!dayEx.sets) continue; 
        
        const catalogEx = allExercises.find(e => e.id === dayEx.exerciseId);
        if (catalogEx && catalogEx.targets) {
          for (const target of catalogEx.targets) {
            const bodyPart = target.bodyPart;
            const volume = dayEx.sets * target.targetValue;
            volumeMap.set(bodyPart, (volumeMap.get(bodyPart) || 0) + volume);
          }
        }
      }
    }
    
    return Array.from(volumeMap.entries()).map(([bodyPart, sets]) => ({
      bodyPart,
      sets
    })).sort((a, b) => b.sets - a.sets);
  });

  dayForm: FormGroup = this.fb.group({
    dayName: ['', Validators.required]
  });

  addingExerciseToDayId = signal<string | null>(null);
  selectedExercise = signal<Exercise | null>(null);
  
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
          // Auto-create the single week template
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
          // Use the first (and only) week template
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
        // Fetch exercises for each day in parallel
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
            // Still show days even if exercises fail
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
    const dayId = this.addingExerciseToDayId();
    if (this.exerciseForm.valid && dayId) {
      const type = this.selectedExercise()?.type;
      const formVal = this.exerciseForm.value;
      const day = this.days().find(d => d.id === dayId);
      const sortOrder = day?.exercises?.length || 0;

      const sets = type === 'CARDIO' ? undefined : formVal.sets;
      const reps = type === 'CARDIO' ? undefined : formVal.reps;
      const repsMax = type === 'CARDIO' ? undefined : formVal.repsMax;
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
        resistance
      ).subscribe({
        next: () => {
          this.cancelQuickAdd();
          // Reload the program data to refresh the day's exercise count
          this.loadProgramData();
        },
        error: (err) => console.error('Error adding exercise', err)
      });
    }
  }
}

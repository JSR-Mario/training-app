import { Component, Input, OnInit, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProgramService } from '../../services/program.service';
import { ExerciseService } from '../../../exercises/services/exercise.service';
import { DayTemplate, DayExercise, Exercise } from '../../../../core/types/training.types';
import { ExerciseSearchComponent } from '../../../exercises/components/exercise-search/exercise-search.component';

@Component({
  selector: 'app-day-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ExerciseSearchComponent],
  template: `
    <div class="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50 mt-4">
      <div class="flex justify-between items-center mb-4">
        <h4 class="text-lg font-bold text-gray-200 flex items-center gap-2">
          {{ day.name }}
          <button (click)="deleteDay.emit()" class="text-red-400 hover:text-red-300 text-xs ml-2">Delete Day</button>
        </h4>
        
        <button 
          *ngIf="!showAddExercise()"
          (click)="showAddExercise.set(true)"
          class="text-xs px-3 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg transition-colors"
        >
          + Add Exercise
        </button>
      </div>

      <!-- Add Exercise Form -->
      <div *ngIf="showAddExercise()" class="bg-gray-800 p-3 rounded-lg mb-4 border border-gray-700 space-y-4">
        <app-exercise-search *ngIf="!selectedExercise()" (select)="onExerciseSelected($event)"></app-exercise-search>

        <form *ngIf="selectedExercise()" [formGroup]="exerciseForm" (ngSubmit)="onAddExercise()" class="flex flex-wrap gap-3 items-end bg-gray-900 p-3 rounded-lg border border-blue-500/30">
          <div class="w-full text-sm font-semibold text-blue-400 mb-1 border-b border-gray-700 pb-2">
            Selected: {{ selectedExercise()?.name }} 
            <span *ngIf="selectedExercise()?.type === 'CARDIO'" class="ml-2 text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded uppercase">Cardio</span>
          </div>
          
          <ng-container *ngIf="selectedExercise()?.type !== 'CARDIO'">
            <div class="w-24">
              <label class="block text-xs text-gray-400 mb-1">Sets</label>
              <input type="number" min="1" formControlName="sets" class="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-white text-sm">
            </div>
            <div class="w-24">
              <label class="block text-xs text-gray-400 mb-1">Reps</label>
              <input type="number" min="1" formControlName="reps" class="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-white text-sm">
            </div>
          </ng-container>

          <ng-container *ngIf="selectedExercise()?.type === 'CARDIO'">
            <div class="w-28">
              <label class="block text-xs text-gray-400 mb-1">Duration (min)</label>
              <input type="number" min="1" formControlName="durationMinutes" class="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-white text-sm">
            </div>
            <div class="w-24">
              <label class="block text-xs text-gray-400 mb-1">Incline</label>
              <input type="number" step="0.1" formControlName="incline" class="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-white text-sm">
            </div>
            <div class="w-24">
              <label class="block text-xs text-gray-400 mb-1">Resistance</label>
              <input type="number" step="0.1" formControlName="resistance" class="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-white text-sm">
            </div>
          </ng-container>
          
          <div class="flex gap-2 w-full mt-2 justify-end">
            <button type="button" (click)="cancelAdd()" class="px-3 py-1.5 text-gray-400 hover:text-white text-sm transition-colors">
              Cancel
            </button>
            <button type="submit" [disabled]="exerciseForm.invalid" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm disabled:opacity-50 transition-colors">
              Add to Day
            </button>
          </div>
        </form>
      </div>

      <!-- Exercises List -->
      <div class="space-y-2">
        <div *ngIf="dayExercises().length === 0" class="text-sm text-gray-500 italic py-2 text-center">
          No exercises assigned. Rest day!
        </div>

        <div *ngFor="let de of dayExercises(); let i = index" class="flex items-center gap-3 bg-gray-900/50 p-2 rounded-lg border border-gray-800">
          <div class="flex flex-col gap-1">
            <button 
              (click)="moveExercise(i, -1)" 
              [disabled]="i === 0"
              class="text-gray-500 hover:text-white disabled:opacity-30"
              title="Move Up"
            >
              ▲
            </button>
            <button 
              (click)="moveExercise(i, 1)" 
              [disabled]="i === dayExercises().length - 1"
              class="text-gray-500 hover:text-white disabled:opacity-30"
              title="Move Down"
            >
              ▼
            </button>
          </div>
          
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium text-gray-200">{{ de.exerciseName || 'Unknown Exercise' }}</p>
              <span *ngIf="de.durationMinutes" class="px-1.5 py-0.5 text-[10px] bg-purple-500/20 text-purple-400 rounded font-semibold uppercase">Cardio</span>
            </div>
            <p *ngIf="!de.durationMinutes" class="text-xs text-gray-500">{{ de.sets }} sets × {{ de.reps }} reps</p>
            <p *ngIf="de.durationMinutes" class="text-xs text-gray-500">
              {{ de.durationMinutes }} min
              <span *ngIf="de.incline"> • Inc: {{ de.incline }}</span>
              <span *ngIf="de.resistance"> • Res: {{ de.resistance }}</span>
            </p>
          </div>

          <button 
            (click)="removeDayExercise(de.id)"
            class="p-1.5 text-red-400/70 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
            title="Remove"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  `
})
export class DayBuilderComponent implements OnInit {
  @Input({ required: true }) day!: DayTemplate;
  @Output() deleteDay = new EventEmitter<void>();
  @Output() dayUpdated = new EventEmitter<void>();

  private programService = inject(ProgramService);
  private exerciseService = inject(ExerciseService);
  private fb = inject(FormBuilder);

  dayExercises = signal<DayExercise[]>([]);
  availableExercises = signal<Exercise[]>([]);
  showAddExercise = signal<boolean>(false);
  selectedExercise = signal<Exercise | null>(null);

  exerciseForm: FormGroup = this.fb.group({
    exerciseId: ['', Validators.required],
    sets: [3],
    reps: [10],
    durationMinutes: [null],
    incline: [null],
    resistance: [null]
  });

  ngOnInit() {
    this.dayExercises.set(this.day.exercises.sort((a, b) => a.sortOrder - b.sortOrder));
    this.loadCatalog();
  }

  loadCatalog() {
    this.exerciseService.getExercises().subscribe(data => {
      this.availableExercises.set(data);
      // Map names to existing exercises if needed
      const mapped = this.dayExercises().map(de => {
        const cat = data.find(e => e.id === de.exerciseId);
        return { ...de, exerciseName: cat ? cat.name : de.exerciseName };
      });
      this.dayExercises.set(mapped);
    });
  }

  onExerciseSelected(ex: Exercise) {
    this.selectedExercise.set(ex);
    
    // Setup form validation based on type
    this.exerciseForm.get('exerciseId')?.setValue(ex.id);
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

  cancelAdd() {
    this.showAddExercise.set(false);
    this.selectedExercise.set(null);
    this.exerciseForm.reset({ sets: 3, reps: 10 });
  }

  onAddExercise() {
    if (this.exerciseForm.valid && this.day.id) {
      const formVal = this.exerciseForm.value;
      const type = this.selectedExercise()?.type;
      
      // Enforce max 10 exercises per day (user rule)
      if (this.dayExercises().length >= 10) {
        alert('Maximum 10 exercises per day allowed for safety.');
        return;
      }

      const nextOrder = this.dayExercises().length > 0 
        ? Math.max(...this.dayExercises().map(e => e.sortOrder)) + 1 
        : 0;

      // Extract only relevant fields based on type
      const sets = type === 'CARDIO' ? undefined : formVal.sets;
      const reps = type === 'CARDIO' ? undefined : formVal.reps;
      const duration = type === 'CARDIO' ? formVal.durationMinutes : undefined;
      const incline = type === 'CARDIO' ? formVal.incline : undefined;
      const resistance = type === 'CARDIO' ? formVal.resistance : undefined;

      this.programService.addDayExercise(
        this.day.id, formVal.exerciseId, sets, reps, nextOrder, undefined, duration, incline, resistance
      ).subscribe({
          next: (newEx) => {
            const cat = this.availableExercises().find(e => e.id === newEx.exerciseId) || this.selectedExercise();
            if (cat) newEx.exerciseName = cat.name;
            
            this.dayExercises.update(exs => [...exs, newEx]);
            this.cancelAdd();
            this.dayUpdated.emit();
          },
          error: (err) => console.error('Error adding exercise', err)
        });
    }
  }

  removeDayExercise(id: string) {
    this.programService.deleteDayExercise(id).subscribe({
      next: () => {
        this.dayExercises.update(exs => exs.filter(e => e.id !== id));
        this.dayUpdated.emit();
      },
      error: (err) => console.error('Error removing exercise', err)
    });
  }

  moveExercise(index: number, direction: number) {
    const list = [...this.dayExercises()];
    if (index + direction < 0 || index + direction >= list.length) return;

    // Swap elements
    const temp = list[index];
    list[index] = list[index + direction];
    list[index + direction] = temp;

    // Update sortOrder
    const orderedItems = list.map((item, idx) => ({
      id: item.id,
      sortOrder: idx
    }));

    // Optimistic UI update
    const newlyOrdered = list.map((item, idx) => ({ ...item, sortOrder: idx }));
    this.dayExercises.set(newlyOrdered);

    if (this.day.id) {
      this.programService.reorderDayExercises(this.day.id, orderedItems).subscribe({
        next: () => this.dayUpdated.emit(),
        error: (err) => {
          console.error('Failed to reorder', err);
          // Revert on failure (omitted for brevity, could just reload)
        }
      });
    }
  }
}

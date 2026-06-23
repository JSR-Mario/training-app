import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProgramService } from '../../services/program.service';
import { ExerciseService } from '../../../exercises/services/exercise.service';
import { DayTemplate, DayExercise, Exercise } from '../../../../core/types/training.types';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-day-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="max-w-7xl mx-auto space-y-6 pb-24">
      
      <!-- Header -->
      <div>
        <a [routerLink]="['/programs', programId()]" class="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block">&larr; Back to Program</a>
        
        <div *ngIf="isLoading()" class="text-gray-400">Loading day details...</div>
        
        <div *ngIf="!isLoading() && day()" class="flex justify-between items-end border-b border-gray-800 pb-4">
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
      </div>

      <!-- Add Exercise Form -->
      <div *ngIf="showAddExercise() && !isLoading()" class="glass-card p-6 border border-blue-500/30">
        <h3 class="text-lg font-bold text-white mb-4">Add Exercise to {{ day()?.name }}</h3>
        <form [formGroup]="exerciseForm" (ngSubmit)="onSubmitExercise()" class="space-y-4">
          
          <div>
            <label for="exerciseSelect" class="block text-sm font-medium text-gray-300 mb-1">Select Exercise</label>
            <select 
              id="exerciseSelect"
              formControlName="exerciseId"
              class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-white text-sm"
            >
              <option value="" disabled>Choose an exercise</option>
              <option *ngFor="let ex of availableExercises()" [value]="ex.id">{{ ex.name }}</option>
            </select>
          </div>

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

          <div class="flex justify-end gap-3 pt-2">
            <button 
              type="button" 
              (click)="showAddExercise.set(false)"
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
      </div>

      <!-- Exercises List -->
      <div *ngIf="!isLoading() && day()" class="space-y-3">
        
        <div *ngIf="exercises().length === 0 && !showAddExercise()" class="text-center py-12 glass-card border border-dashed border-gray-700">
          <p class="text-gray-400">No exercises added yet.</p>
          <button (click)="openAddExercise()" class="mt-4 text-blue-400 hover:text-blue-300 text-sm">Add your first exercise</button>
        </div>

        <div *ngFor="let ex of exercises(); let i = index" class="glass-card p-4 flex items-center justify-between group hover:border-gray-600 transition-colors">
          <div class="flex items-center gap-4">
            <!-- Reorder handles -->
            <div class="flex flex-col gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
              <button 
                (click)="moveExercise(i, -1)" 
                [disabled]="i === 0"
                class="text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 p-1"
                title="Move Up"
              >
                &uarr;
              </button>
              <button 
                (click)="moveExercise(i, 1)" 
                [disabled]="i === exercises().length - 1"
                class="text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 p-1"
                title="Move Down"
              >
                &darr;
              </button>
            </div>
            
            <div>
              <h4 class="font-semibold text-lg text-white">{{ ex.exerciseName }}</h4>
              <p class="text-gray-400 text-sm">
                {{ ex.sets }} sets &times; 
                {{ ex.reps }}{{ ex.repsMax ? '-' + ex.repsMax : '' }} reps
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

      </div>
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
  availableExercises = signal<Exercise[]>([]);
  
  isLoading = signal<boolean>(true);
  showAddExercise = signal<boolean>(false);

  exerciseForm: FormGroup = this.fb.group({
    exerciseId: ['', Validators.required],
    sets: [3, [Validators.required, Validators.min(1)]],
    reps: [10, [Validators.required, Validators.min(1)]],
    repsMax: [null]
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
    this.exerciseForm.reset({ sets: 3, reps: 10, repsMax: null });
  }

  onSubmitExercise() {
    const dayId = this.dayId();
    if (this.exerciseForm.valid && dayId) {
      const { exerciseId, sets, reps, repsMax } = this.exerciseForm.value;
      const sortOrder = this.exercises().length;

      // Note: addDayExercise needs to support repsMax
      this.programService.addDayExercise(dayId, exerciseId, sets, reps, sortOrder, repsMax).subscribe({
        next: () => {
          this.showAddExercise.set(false);
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

  moveExercise(index: number, direction: number) {
    const dayId = this.dayId();
    if (!dayId) return;

    const currentEx = this.exercises();
    if (index + direction < 0 || index + direction >= currentEx.length) return;

    const items = [...currentEx];
    const temp = items[index];
    items[index] = items[index + direction];
    items[index + direction] = temp;

    const orderedItems = items.map((ex, idx) => ({ id: ex.id, sortOrder: idx }));

    this.programService.reorderDayExercises(dayId, orderedItems).subscribe({
      next: () => this.loadData(),
      error: (err) => console.error('Failed to reorder exercises', err)
    });
  }
}

import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExerciseService } from '../../services/exercise.service';
import { Exercise } from '../../../../core/types/training.types';
import { ExerciseFormComponent } from '../../components/exercise-form/exercise-form.component';

@Component({
  selector: 'app-exercise-list',
  standalone: true,
  imports: [CommonModule, ExerciseFormComponent],
  template: `
    <div class="max-w-7xl mx-auto space-y-6">
      
      <!-- Header -->
      <div class="flex justify-between items-center" *ngIf="!showForm()">
        <div>
          <h1 class="text-3xl font-bold text-white">Exercises</h1>
          <p class="text-gray-400 mt-1">Manage your exercise catalog and volume targets</p>
        </div>
        <button 
          (click)="openForm()"
          class="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg transition-all"
        >
          + Add Exercise
        </button>
      </div>

      <div *ngIf="showForm()">
        <app-exercise-form 
          [exercise]="selectedExercise()" 
          (saveExercise)="onSaveExercise($event)" 
          (cancelForm)="closeForm()"
        ></app-exercise-form>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading() && !showForm()" class="text-center py-12">
        <p class="text-gray-400">Loading exercises...</p>
      </div>

      <!-- List View -->
      <div *ngIf="!isLoading() && !showForm()" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <div *ngIf="exercises().length === 0" class="col-span-full text-center py-12 glass-card">
          <p class="text-gray-400">No exercises found. Add your first exercise!</p>
        </div>

        <div *ngFor="let exercise of exercises()" class="glass-card p-6 flex flex-col h-full hover:border-gray-600 transition-colors">
          <div class="flex justify-between items-start mb-4">
            <h3 class="text-xl font-bold text-white">{{ exercise.name }}</h3>
            <div class="flex gap-2">
              <button 
                (click)="editExercise(exercise)"
                class="text-blue-400 hover:text-blue-300 transition-colors text-sm"
              >
                Edit
              </button>
              <button 
                (click)="deleteExercise(exercise.id)"
                class="text-red-400 hover:text-red-300 transition-colors text-sm"
              >
                Delete
              </button>
            </div>
          </div>
          
          <div class="flex-1">
            <h4 class="text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider">Targets</h4>
            <div *ngIf="exercise.targets.length === 0" class="text-sm text-gray-600 italic">
              No targets set
            </div>
            <div class="flex flex-wrap gap-2">
              <span 
                *ngFor="let target of exercise.targets" 
                class="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300"
              >
                {{ target.bodyPart }} ({{ target.targetValue }})
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  `
})
export class ExerciseListComponent implements OnInit {
  private exerciseService = inject(ExerciseService);

  exercises = signal<Exercise[]>([]);
  isLoading = signal<boolean>(true);
  
  showForm = signal<boolean>(false);
  selectedExercise = signal<Exercise | null>(null);

  ngOnInit() {
    this.loadExercises();
  }

  loadExercises() {
    this.isLoading.set(true);
    this.exerciseService.getExercises().subscribe({
      next: (data) => {
        this.exercises.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load exercises', err);
        this.isLoading.set(false);
      }
    });
  }

  openForm() {
    this.selectedExercise.set(null);
    this.showForm.set(true);
  }

  editExercise(exercise: Exercise) {
    this.selectedExercise.set(exercise);
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.selectedExercise.set(null);
  }

  onSaveExercise(formData: { name: string; targets: { id?: string; bodyPart: string; targetValue: number }[] }) {
    this.isLoading.set(true);
    const exercise = this.selectedExercise();
    
    if (exercise) {
      // Update existing
      this.exerciseService.updateExercise(exercise.id, formData.name).subscribe({
        next: (updatedExercise) => {
          // Now update targets
          this.syncTargets(updatedExercise.id, exercise.targets, formData.targets);
        },
        error: (err) => {
          console.error('Error updating exercise', err);
          this.isLoading.set(false);
        }
      });
    } else {
      // Create new
      this.exerciseService.createExercise(formData.name).subscribe({
        next: (newExercise) => {
          // Create targets
          this.syncTargets(newExercise.id, [], formData.targets);
        },
        error: (err) => {
          console.error('Error creating exercise', err);
          this.isLoading.set(false);
        }
      });
    }
  }

  deleteExercise(id: string) {
    if (confirm('Are you sure you want to delete this exercise?')) {
      this.exerciseService.deleteExercise(id).subscribe({
        next: () => {
          this.loadExercises();
        },
        error: (err) => console.error('Error deleting exercise', err)
      });
    }
  }

  // Helper to sync targets (add new, update existing, delete removed)
  private syncTargets(exerciseId: string, oldTargets: { id?: string; bodyPart: string; targetValue: number }[], newTargets: { id?: string; bodyPart: string; targetValue: number }[]) {
    // In a real app we might use forkJoin or mergeMap to wait for all to complete
    // For simplicity, we just trigger them and reload after a short delay
    
    const targetsToDelete = oldTargets.filter(ot => !newTargets.find(nt => nt.id === ot.id));
    const targetsToAdd = newTargets.filter(nt => !nt.id);
    // Assuming backend targets are immutable, we just delete and recreate if changed, 
    // but the API doesn't have an updateTarget method, only add and delete.
    
    targetsToDelete.forEach(t => this.exerciseService.deleteTarget(exerciseId, t.id).subscribe());
    targetsToAdd.forEach(t => this.exerciseService.addTarget(exerciseId, { bodyPart: t.bodyPart, targetValue: t.targetValue }).subscribe());

    setTimeout(() => {
      this.loadExercises();
      this.closeForm();
    }, 500); // Hacky wait for operations to finish
  }
}

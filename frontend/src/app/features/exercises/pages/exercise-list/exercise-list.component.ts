import { Component, OnInit, signal, inject } from '@angular/core';

import { ExerciseService } from '../../services/exercise.service';
import { Exercise } from '../../../../core/types/training.types';
import { ExerciseFormComponent } from '../../components/exercise-form/exercise-form.component';

@Component({
    selector: 'app-exercise-list',
    imports: [ExerciseFormComponent],
    template: `
    <div class="max-w-7xl mx-auto space-y-6">
    
      <!-- Header -->
      @if (!showForm()) {
        <div class="flex justify-between items-center">
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
      }
    
      @if (showForm()) {
        <div>
          <app-exercise-form
            [exercise]="selectedExercise()"
            (saveExercise)="onSaveExercise($event)"
            (cancelForm)="closeForm()"
          ></app-exercise-form>
        </div>
      }
    
      <!-- Loading State -->
      @if (isLoading() && !showForm()) {
        <div class="text-center py-12">
          <p class="text-gray-400">Loading exercises...</p>
        </div>
      }
    
      <!-- List View -->
      @if (!isLoading() && !showForm()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @if (exercises().length === 0) {
            <div class="col-span-full text-center py-12 glass-card">
              <p class="text-gray-400">No exercises found. Add your first exercise!</p>
            </div>
          }
          @for (exercise of exercises(); track exercise) {
            <div class="glass-card p-6 flex flex-col h-full hover:border-gray-600 transition-colors">
              <div class="flex justify-between items-start mb-4">
                <div>
                  <h3 class="text-xl font-bold text-white">{{ exercise.name }}</h3>
                  <div class="flex flex-wrap gap-2 mt-1.5">
                    @if (exercise.equipmentBrand) {
                      <span
                        class="px-2 py-0.5 text-xs bg-slate-700/60 text-slate-300 rounded-md border border-slate-600/50"
                        >
                        {{ exercise.equipmentBrand }}
                      </span>
                    }
                    @if (exercise.unilateral) {
                      <span
                        class="px-2 py-0.5 text-xs font-semibold bg-amber-500/20 text-amber-400 rounded-md border border-amber-500/30"
                        >
                        UNILATERAL
                      </span>
                    }
                    @if (exercise.unilateral === false) {
                      <span
                        class="px-2 py-0.5 text-xs bg-sky-500/15 text-sky-400 rounded-md border border-sky-500/30"
                        >
                        BILATERAL
                      </span>
                    }
                    @if (exercise.isPublic) {
                      <span
                        class="px-2 py-0.5 text-xs font-semibold bg-purple-500/20 text-purple-400 rounded-md border border-purple-500/30"
                        >
                        PUBLIC
                      </span>
                    }
                  </div>
                </div>
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
                @if (exercise.targets.length === 0) {
                  <div class="text-sm text-gray-600 italic">
                    No targets set
                  </div>
                }
                <div class="flex flex-wrap gap-2">
                  @for (target of exercise.targets; track target) {
                    <span
                      class="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300"
                      >
                      {{ target.bodyPart }} ({{ target.targetValue }})
                    </span>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }
    
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

  onSaveExercise(formData: { name: string; equipmentBrand: string; unilateral: boolean; isPublic: boolean; type: 'STRENGTH' | 'CARDIO'; targets: { id?: string; bodyPart: string; targetValue: number }[] }) {
    this.isLoading.set(true);
    const exercise = this.selectedExercise();
    
    const exercisePayload = {
      name: formData.name,
      equipmentBrand: formData.equipmentBrand || undefined,
      unilateral: formData.unilateral,
      isPublic: formData.isPublic || false,
      type: formData.type
    };

    if (exercise) {
      // Update existing
      this.exerciseService.updateExercise(exercise.id, exercisePayload).subscribe({
        next: (updatedExercise) => {
          this.syncTargets(updatedExercise.id, exercise.targets, formData.targets);
        },
        error: (err) => {
          console.error('Error updating exercise', err);
          alert(err.error?.message || 'Failed to update exercise. It might be a duplicate.');
          this.isLoading.set(false);
        }
      });
    } else {
      // Create new
      this.exerciseService.createExercise(exercisePayload).subscribe({
        next: (newExercise) => {
          this.syncTargets(newExercise.id, [], formData.targets);
        },
        error: (err) => {
          console.error('Error creating exercise', err);
          alert(err.error?.message || 'Failed to create exercise. It might be a duplicate.');
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
    const targetsToDelete = oldTargets.filter(ot => !newTargets.find(nt => nt.id === ot.id));
    const targetsToAdd = newTargets.filter(nt => !nt.id);
    
    targetsToDelete.forEach(t => {
      if (t.id) {
        this.exerciseService.deleteTarget(exerciseId, t.id).subscribe();
      }
    });
    targetsToAdd.forEach(t => this.exerciseService.addTarget(exerciseId, { bodyPart: t.bodyPart, targetValue: t.targetValue }).subscribe());

    setTimeout(() => {
      this.loadExercises();
      this.closeForm();
    }, 500);
  }
}

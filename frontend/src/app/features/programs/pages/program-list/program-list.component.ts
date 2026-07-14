import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProgramService } from '../../services/program.service';
import { TrainingProgram } from '../../../../core/types/training.types';

@Component({
  standalone: true,
    selector: 'app-program-list',
    imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="max-w-7xl mx-auto space-y-6">
    
      <!-- Header -->
      @if (!showForm()) {
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-3xl font-bold text-black dark:text-white">Programs</h1>
          </div>
          <button
            (click)="openForm()"
            class="px-6 py-2 bg-accent-pos hover:opacity-80 text-white font-semibold rounded-xl shadow-lg transition-all solid-btn"
            >
            + Create Program
          </button>
        </div>
      }
    
      <!-- Form View -->
      @if (showForm()) {
        <div class="solid-card p-6 w-full max-w-xl mx-auto">
          <h2 class="text-2xl font-bold mb-6 text-black dark:text-white">New Program</h2>
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">
            <div>
              <label for="nameInput" class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Program Name</label>
              <input
                id="nameInput"
                type="text"
                formControlName="name"
                class="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-pos outline-none text-black dark:text-white solid-input"
                placeholder="e.g., Push Pull Legs 6 Days"
                >
              @if (form.get('name')?.invalid && form.get('name')?.touched) {
                <div class="text-accent-neg text-xs mt-1">
                  Name is required (max 100 chars).
                </div>
              }
            </div>
            <div>
              <label for="durationInput" class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Duration (Weeks)</label>
              <input
                id="durationInput"
                type="number"
                min="1"
                max="52"
                formControlName="durationWeeks"
                class="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-pos outline-none text-black dark:text-white solid-input"
                >
            </div>
            <div>
              <label for="goalInput" class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Goal</label>
              <select
                id="goalInput"
                formControlName="goal"
                class="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-pos outline-none text-black dark:text-white solid-input"
              >
                <option value="MAINTENANCE">Maintenance</option>
                <option value="CUT">Cut (Lose Weight)</option>
                <option value="BULK">Bulk (Gain Weight)</option>
              </select>
            </div>
            <div class="flex justify-end gap-3 pt-4 border-t border-gray-300 dark:border-gray-800">
              <button
                type="button"
                (click)="closeForm()"
                class="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors"
                >
                Cancel
              </button>
              <button
                type="submit"
                [disabled]="form.invalid || isLoading()"
                class="px-6 py-2 bg-accent-pos hover:opacity-80 text-white font-semibold rounded-xl disabled:opacity-50 transition-colors solid-btn"
                >
                Create
              </button>
            </div>
          </form>
        </div>
      }
    
      <!-- Loading State -->
      @if (isLoading() && !showForm()) {
        <div class="text-center py-12">
          <p class="text-gray-500 dark:text-gray-400">Loading programs...</p>
        </div>
      }
    
      <!-- List View -->
      @if (!isLoading() && !showForm()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @if (sortedPrograms().length === 0) {
            <div class="col-span-full text-center py-12 solid-card">
              <p class="text-gray-500 dark:text-gray-400">No programs found. Create your first program!</p>
            </div>
          }
          @for (program of sortedPrograms(); track program.id) {
            <div class="solid-card p-6 flex flex-col h-full hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
              <div class="flex justify-between items-start mb-4">
                <h3 class="text-xl font-bold text-black dark:text-white">{{ program.name }}</h3>
                @if (program.isActive) {
                  <span class="px-2 py-1 bg-accent-pos/20 text-accent-pos text-xs rounded border border-accent-pos/30 font-semibold tracking-wide">
                    ✓ Active
                  </span>
                }
              </div>
              <div class="flex-1 space-y-2 mb-6">
                <p class="text-gray-500 dark:text-gray-400 text-sm">Duration: {{ program.durationWeeks }} weeks</p>
                <p class="text-gray-500 dark:text-gray-400 text-sm">Created: {{ program.createdAt | date:'mediumDate' }}</p>
              </div>
              <div class="flex justify-between items-center pt-4 border-t border-gray-300 dark:border-gray-700/50">
                <button
                  (click)="deleteProgram(program.id)"
                  class="text-accent-neg hover:opacity-80 transition-opacity text-sm"
                  >
                  Delete
                </button>
                @if (!program.isActive) {
                  <button
                    (click)="setProgramActive(program)"
                    [disabled]="activatingProgramId() === program.id"
                    class="text-accent-pos hover:opacity-80 transition-opacity text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                  >
                    @if (activatingProgramId() === program.id) {
                      <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Setting Active...
                    } @else {
                      Set Active
                    }
                  </button>
                }
                
                <a
                  [routerLink]="['/programs', program.id]"
                  class="text-accent-pos hover:opacity-80 transition-opacity text-sm font-medium"
                  >
                  Build & Edit &rarr;
                </a>
              </div>
            </div>
          }
        </div>
      }
    
    </div>
    `
})
export class ProgramListComponent implements OnInit {
  private programService = inject(ProgramService);
  private fb = inject(FormBuilder);

  programs = signal<TrainingProgram[]>([]);
  
  sortedPrograms = computed(() => {
    return [...this.programs()].sort((a, b) => {
      // Active program always first
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      // Then sort by newest created
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  });

  isLoading = signal<boolean>(true);
  showForm = signal<boolean>(false);
  activatingProgramId = signal<string | null>(null);

  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    durationWeeks: [12, [Validators.required, Validators.min(1), Validators.max(52)]],
    goal: ['MAINTENANCE', Validators.required]
  });

  ngOnInit() {
    this.loadPrograms();
  }

  loadPrograms() {
    this.isLoading.set(true);
    this.programService.getPrograms().subscribe({
      next: (data) => {
        this.programs.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading programs', err);
        this.isLoading.set(false);
      }
    });
  }

  openForm() {
    this.form.reset({ durationWeeks: 12, goal: 'MAINTENANCE' });
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
  }

  onSubmit() {
    if (this.form.valid) {
      this.isLoading.set(true);
      const { name, durationWeeks, goal } = this.form.value;
      this.programService.createProgram(name, durationWeeks, goal).subscribe({
        next: () => {
          this.loadPrograms();
          this.closeForm();
        },
        error: (err) => {
          console.error('Error creating program', err);
          this.isLoading.set(false);
        }
      });
    }
  }

  deleteProgram(id: string) {
    if (confirm('Are you sure you want to delete this program?')) {
      this.programService.deleteProgram(id).subscribe({
        next: () => {
          this.loadPrograms();
        },
        error: (err) => console.error('Error deleting program', err)
      });
    }
  }

  setProgramActive(program: TrainingProgram) {
    if (confirm(`Set "${program.name}" as the active program?`)) {
      this.activatingProgramId.set(program.id);
      this.programService.updateProgram(program.id, program.name, program.durationWeeks, true, program.goal).subscribe({
        next: () => {
          this.loadPrograms();
          this.activatingProgramId.set(null);
        },
        error: (err) => {
          console.error('Error setting program as active', err);
          this.activatingProgramId.set(null);
        }
      });
    }
  }
}

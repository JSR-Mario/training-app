import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProgramService } from '../../services/program.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { TrainingProgram } from '../../../../core/types/training.types';

@Component({
  standalone: true,
  selector: 'app-program-list',
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="max-w-7xl mx-auto space-y-6">
    
      <!-- Header -->
      @if (!showForm()) {
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 class="text-3xl font-bold text-black dark:text-white">Programs</h1>
          </div>
          <button
            (click)="openForm()"
            class="px-6 py-2.5 bg-accent-pos hover:opacity-80 text-white font-semibold rounded-xl shadow-lg transition-all solid-btn shrink-0"
          >
            + Create Program
          </button>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex border-b border-gray-200 dark:border-gray-800">
          <button
            (click)="activeTab.set('my')"
            class="px-6 py-3 font-semibold text-sm transition-colors border-b-2 -mb-px flex items-center gap-2"
            [class.border-accent-pos]="activeTab() === 'my'"
            [class.text-accent-pos]="activeTab() === 'my'"
            [class.border-transparent]="activeTab() !== 'my'"
            [class.text-gray-500]="activeTab() !== 'my'"
            [class.dark:text-gray-400]="activeTab() !== 'my'"
          >
            My Programs
            <span class="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 font-bold">
              {{ programs().length }}
            </span>
          </button>
          <button
            (click)="activeTab.set('public')"
            class="px-6 py-3 font-semibold text-sm transition-colors border-b-2 -mb-px flex items-center gap-2"
            [class.border-accent-pos]="activeTab() === 'public'"
            [class.text-accent-pos]="activeTab() === 'public'"
            [class.border-transparent]="activeTab() !== 'public'"
            [class.text-gray-500]="activeTab() !== 'public'"
            [class.dark:text-gray-400]="activeTab() !== 'public'"
          >
            Public Programs
            <span class="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 font-bold">
              {{ publicPrograms().length }}
            </span>
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
                placeholder="e.g., Push Pull Legs 4 Days"
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
              <p class="text-xs text-gray-400 mt-1">Recommended: 4 to 8 weeks per block.</p>
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

            @if (authService.isAdmin) {
              <div class="flex items-center gap-3">
                <input
                  id="isPublicInput"
                  type="checkbox"
                  formControlName="isPublic"
                  class="w-4 h-4 text-accent-pos rounded focus:ring-accent-pos"
                >
                <label for="isPublicInput" class="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Make this program public (available to all users as a template)
                </label>
              </div>
            }

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
    
      <!-- TAB 1: My Programs List View -->
      @if (!isLoading() && !showForm() && activeTab() === 'my') {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @if (sortedPrograms().length === 0) {
            <!-- Guided Empty State -->
            <div class="col-span-full text-center py-16 solid-card border border-dashed border-gray-300 dark:border-gray-700">
              <div class="w-16 h-16 bg-accent-pos/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-accent-pos" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 class="text-xl font-bold text-black dark:text-white mb-2">Create your first program</h3>
              <p class="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                A program organizes your training into weeks and days. Create custom training blocks or copy a ready-made template.
              </p>
              <div class="flex flex-wrap justify-center gap-3">
                <button
                  (click)="openForm()"
                  class="px-6 py-2.5 bg-accent-pos hover:opacity-80 text-white font-semibold rounded-xl transition-all solid-btn"
                >
                  + Create Program
                </button>
                @if (publicPrograms().length > 0) {
                  <button
                    (click)="activeTab.set('public')"
                    class="px-6 py-2.5 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-black dark:text-white font-semibold rounded-xl transition-all"
                  >
                    Browse Public Templates ({{ publicPrograms().length }})
                  </button>
                }
              </div>

              <!-- Flow guide steps -->
              <div class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 max-w-lg mx-auto">
                <p class="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold mb-4">How the app works</p>
                <div class="space-y-3 text-left">
                  <div class="flex items-start gap-4">
                    <span class="w-7 h-7 rounded-full bg-accent-pos/20 text-accent-pos text-sm font-bold flex items-center justify-center shrink-0">1</span>
                    <p class="text-sm text-gray-500 dark:text-gray-400"><span class="text-black dark:text-white font-medium">Create or copy a program</span> with a goal and duration in weeks.</p>
                  </div>
                  <div class="flex items-start gap-4">
                    <span class="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-500 text-sm font-bold flex items-center justify-center shrink-0">2</span>
                    <p class="text-sm text-gray-500 dark:text-gray-400"><span class="text-black dark:text-white font-medium">Add training days</span> (Push, Pull, Legs) and assign exercises to each day.</p>
                  </div>
                  <div class="flex items-start gap-4">
                    <span class="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-500 text-sm font-bold flex items-center justify-center shrink-0">3</span>
                    <p class="text-sm text-gray-500 dark:text-gray-400"><span class="text-black dark:text-white font-medium">Go to Workout</span> to start logging your daily sessions.</p>
                  </div>
                </div>
              </div>
            </div>
          }

          @for (program of sortedPrograms(); track program.id) {
            <div class="solid-card p-6 flex flex-col h-full hover:border-gray-400 dark:hover:border-gray-600 transition-colors" [class.border-accent-pos]="program.isActive">
              <div class="flex justify-between items-start mb-4">
                <div>
                  <h3 class="text-xl font-bold text-black dark:text-white">{{ program.name }}</h3>
                  <span class="text-xs text-gray-400 uppercase font-semibold tracking-wider">Goal: {{ program.goal }}</span>
                </div>
                @if (program.isActive) {
                  <button
                    (click)="finishProgramEarly(program)"
                    class="px-2.5 py-1 bg-accent-pos/20 hover:bg-accent-pos/30 text-accent-pos text-xs rounded-lg border border-accent-pos/30 font-semibold tracking-wide flex items-center gap-1 transition-all cursor-pointer"
                    title="Click to finish/deactivate program"
                  >
                    ✓ Active
                  </button>
                }
              </div>
              <div class="flex-1 space-y-2 mb-6">
                <p class="text-gray-500 dark:text-gray-400 text-sm">Duration: {{ program.durationWeeks }} weeks</p>
                <p class="text-gray-500 dark:text-gray-400 text-sm">Created: {{ program.createdAt | date:'mediumDate' }}</p>
              </div>
              
              <div class="space-y-3 pt-4 border-t border-gray-300 dark:border-gray-700/50">
                <div class="flex justify-between items-center">
                  <button
                    (click)="deleteProgram(program.id)"
                    class="text-accent-neg hover:opacity-80 transition-opacity text-sm font-medium"
                  >
                    Delete
                  </button>

                  <a
                    [routerLink]="['/programs', program.id]"
                    class="text-accent-pos hover:opacity-80 transition-opacity text-sm font-medium"
                  >
                    Build & Edit &rarr;
                  </a>
                </div>

                <!-- Program Lifecycle Controls -->
                @if (!program.isActive) {
                  <div class="pt-2">
                    <button
                      (click)="setProgramActive(program)"
                      [disabled]="actionLoadingId() === program.id"
                      class="w-full py-2 bg-gray-100 dark:bg-gray-800 hover:bg-accent-pos/10 hover:text-accent-pos text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 font-semibold text-xs rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      @if (actionLoadingId() === program.id) {
                        <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Setting Active...
                      } @else {
                        Set Active
                      }
                    </button>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- TAB 2: Public Programs Templates List View -->
      @if (!isLoading() && !showForm() && activeTab() === 'public') {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @if (publicPrograms().length === 0) {
            <div class="col-span-full text-center py-16 solid-card border border-dashed border-gray-300 dark:border-gray-700">
              <div class="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 class="text-xl font-bold text-black dark:text-white mb-2">No public templates available</h3>
              <p class="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                No public program templates have been published yet. Create your own custom program!
              </p>
            </div>
          }

          @for (program of publicPrograms(); track program.id) {
            <div class="solid-card p-6 flex flex-col h-full hover:border-gray-400 dark:hover:border-gray-600 transition-colors border border-accent-pos/30">
              <div class="flex justify-between items-start mb-4">
                <div>
                  <h3 class="text-xl font-bold text-black dark:text-white">{{ program.name }}</h3>
                  <span class="text-xs text-gray-400 uppercase font-semibold tracking-wider">Goal: {{ program.goal }}</span>
                </div>
                <span class="px-2.5 py-1 bg-accent-pos/20 text-accent-pos text-xs rounded-lg border border-accent-pos/30 font-semibold tracking-wide">
                  Public Template
                </span>
              </div>
              <div class="flex-1 space-y-2 mb-6">
                <p class="text-gray-500 dark:text-gray-400 text-sm">Duration: {{ program.durationWeeks }} weeks</p>
                <p class="text-gray-500 dark:text-gray-400 text-sm">Includes complete workout day templates and exercise routines.</p>
              </div>
              <div class="pt-4 border-t border-gray-300 dark:border-gray-700/50">
                <button
                  (click)="usePublicProgram(program)"
                  [disabled]="actionLoadingId() === program.id"
                  class="w-full py-2.5 bg-accent-pos hover:opacity-80 text-white font-semibold rounded-xl shadow-lg transition-all solid-btn flex items-center justify-center gap-2"
                >
                  @if (actionLoadingId() === program.id) {
                    <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Importing...
                  } @else {
                    Use Program
                  }
                </button>
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
  public authService = inject(AuthService);
  private fb = inject(FormBuilder);

  programs = signal<TrainingProgram[]>([]);
  publicPrograms = signal<TrainingProgram[]>([]);
  activeTab = signal<'my' | 'public'>('my');
  
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
  actionLoadingId = signal<string | null>(null);

  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    durationWeeks: [4, [Validators.required, Validators.min(1), Validators.max(52)]],
    goal: ['MAINTENANCE', Validators.required],
    isPublic: [false]
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    this.programService.getPrograms().subscribe({
      next: (myProgs) => {
        this.programs.set(myProgs);
        this.programService.getPublicPrograms().subscribe({
          next: (pubProgs) => {
            this.publicPrograms.set(pubProgs);
            this.isLoading.set(false);
          },
          error: (err) => {
            console.error('Error loading public programs', err);
            this.isLoading.set(false);
          }
        });
      },
      error: (err) => {
        console.error('Error loading programs', err);
        this.isLoading.set(false);
      }
    });
  }

  openForm() {
    this.form.reset({ durationWeeks: 4, goal: 'MAINTENANCE', isPublic: false });
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
  }

  onSubmit() {
    if (this.form.valid) {
      this.isLoading.set(true);
      const { name, durationWeeks, goal, isPublic } = this.form.value;
      this.programService.createProgram(name, durationWeeks, goal, isPublic).subscribe({
        next: () => {
          this.loadData();
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
          this.loadData();
        },
        error: (err) => console.error('Error deleting program', err)
      });
    }
  }

  setProgramActive(program: TrainingProgram) {
    if (confirm(`Set "${program.name}" as your active program?`)) {
      this.actionLoadingId.set(program.id);
      this.programService.updateProgram(program.id, program.name, program.durationWeeks, true, program.goal, program.isPublic || false).subscribe({
        next: () => {
          this.loadData();
          this.actionLoadingId.set(null);
        },
        error: (err) => {
          console.error('Error setting program as active', err);
          this.actionLoadingId.set(null);
        }
      });
    }
  }

  finishProgramEarly(program: TrainingProgram) {
    if (confirm(`Finishing "${program.name}" will set it as inactive. You can set it as active again at any time. Continue?`)) {
      this.actionLoadingId.set(program.id);
      this.programService.deactivateProgram(program.id).subscribe({
        next: () => {
          this.loadData();
          this.actionLoadingId.set(null);
        },
        error: (err) => {
          console.error('Error deactivating program', err);
          this.actionLoadingId.set(null);
        }
      });
    }
  }

  usePublicProgram(program: TrainingProgram) {
    if (confirm(`Import "${program.name}" as your active program?`)) {
      this.actionLoadingId.set(program.id);
      this.programService.copyPublicProgram(program.id).subscribe({
        next: () => {
          this.loadData();
          this.activeTab.set('my');
          this.actionLoadingId.set(null);
        },
        error: (err) => {
          console.error('Error copying public program', err);
          this.actionLoadingId.set(null);
        }
      });
    }
  }
}

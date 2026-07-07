import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ExerciseService } from '../../services/exercise.service';
import { Exercise, BODY_PARTS_HIERARCHY } from '../../../../core/types/training.types';
import { ExerciseFormComponent } from '../../components/exercise-form/exercise-form.component';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
    selector: 'app-exercise-list',
    imports: [CommonModule, ExerciseFormComponent, FormsModule],
    template: `
    <div class="max-w-7xl mx-auto space-y-8">
    
      <!-- Header -->
      @if (!showForm()) {
        <div class="flex justify-between items-end">
          <div>
            <h1 class="text-4xl font-black bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Exercises</h1>
            <p class="text-slate-400 mt-2 font-medium">Manage your exercise catalog and volume targets</p>
          </div>
          <button
            (click)="openForm()"
            class="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all transform hover:-translate-y-0.5"
            >
            <span class="mr-2">+</span> Add Exercise
          </button>
        </div>
      }
    
      @if (showForm()) {
        <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <app-exercise-form
            [exercise]="selectedExercise()"
            (saveExercise)="onSaveExercise($event)"
            (cancelForm)="closeForm()"
          ></app-exercise-form>
        </div>
      }
    
      <!-- Loading State -->
      @if (isLoading() && !showForm()) {
        <div class="flex flex-col items-center justify-center py-20 space-y-4">
          <div class="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          <p class="text-slate-400 font-medium">Loading exercises...</p>
        </div>
      }
    
      <!-- List View -->
      @if (!isLoading() && !showForm()) {
        <div class="space-y-6 animate-in fade-in duration-500">
          <!-- Search Bar -->
          <div class="relative group">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search exercises by name or brand..."
              [ngModel]="searchQuery()"
              (ngModelChange)="onSearchChange($event)"
              class="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-slate-700/50 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white placeholder-slate-500 outline-none shadow-inner backdrop-blur-sm transition-all"
            >
          </div>

          @if (exercises().length === 0) {
            <div class="flex flex-col items-center justify-center py-16 px-4 bg-slate-900/30 border border-slate-800 rounded-2xl border-dashed">
              <div class="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 class="text-xl font-bold text-white mb-2">No exercises found</h3>
              <p class="text-slate-400 text-center max-w-md">Get started by adding your first exercise to the catalog. You can organize them by body part targets.</p>
            </div>
          }
          
          <!-- Tree view for List -->
          <div class="space-y-4">
            <!-- STRENGTH CATEGORIES -->
            @for (cat of tree().categories; track cat.name) {
              <div class="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-700/50 overflow-hidden shadow-lg">
                <button 
                  type="button" 
                  (click)="toggleCategory(cat.name)"
                  class="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors group"
                >
                  <h2 class="text-2xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent tracking-wide drop-shadow-sm group-hover:from-blue-300 group-hover:to-indigo-300 transition-all">{{ cat.name }}</h2>
                  <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:border-indigo-500/50 transition-colors">
                    <svg class="w-4 h-4 text-slate-400 transition-transform duration-300" [class.rotate-180]="expandedCategories().has(cat.name)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </button>
                
                @if (expandedCategories().has(cat.name)) {
                  <div class="px-6 pb-6 space-y-6 animate-in slide-in-from-top-2 fade-in duration-300">
                    @for (grp of cat.groups; track grp.name) {
                      <div class="pl-4 border-l-2 border-indigo-500/30 pt-2">
                        <button 
                          type="button" 
                          (click)="toggleGroup(grp.name)"
                          class="w-full flex items-center justify-between py-2 text-left group"
                        >
                          <span class="text-xl font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">{{ grp.name }}</span>
                          <svg class="w-4 h-4 text-slate-500 transition-transform duration-300" [class.rotate-180]="expandedGroups().has(grp.name)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        </button>

                        @if (expandedGroups().has(grp.name)) {
                          <div class="mt-4 animate-in slide-in-from-top-1 fade-in duration-300">
                            
                            @if (!grp.hasSubparts) {
                              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                @for (ex of grp.directExercises; track ex.id) {
                                  <ng-container *ngTemplateOutlet="exerciseCard; context: { $implicit: ex }"></ng-container>
                                }
                              </div>
                            } 
                            @else {
                              <div class="space-y-6">
                                @for (part of grp.parts; track part.name) {
                                  <div class="pl-4 border-l-2 border-slate-700/60">
                                    <button 
                                      type="button" 
                                      (click)="togglePart(part.name)"
                                      class="w-full flex items-center justify-between py-1.5 text-left group"
                                    >
                                      <span class="text-sm font-bold tracking-widest uppercase text-slate-400 group-hover:text-slate-200 transition-colors">{{ formatPartName(part.name) }}</span>
                                      <svg class="w-3.5 h-3.5 text-slate-600 transition-transform duration-300" [class.rotate-180]="expandedParts().has(part.name)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </button>

                                    @if (expandedParts().has(part.name)) {
                                      <div class="mt-3 animate-in fade-in duration-300">
                                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                          @for (ex of part.exercises; track ex.id) {
                                            <ng-container *ngTemplateOutlet="exerciseCard; context: { $implicit: ex }"></ng-container>
                                          }
                                        </div>
                                      </div>
                                    }
                                  </div>
                                }
                              </div>
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }


            <!-- UNCATEGORIZED CATEGORY -->
            @if (tree().uncategorized.length > 0) {
              <div class="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-700/50 overflow-hidden shadow-lg">
                <button 
                  type="button" 
                  (click)="toggleCategory('Uncategorized')"
                  class="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors group"
                >
                  <h2 class="text-2xl font-black text-slate-500 tracking-wide drop-shadow-sm group-hover:text-slate-400 transition-all">Uncategorized</h2>
                  <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 transition-colors">
                    <svg class="w-4 h-4 text-slate-400 transition-transform duration-300" [class.rotate-180]="expandedCategories().has('Uncategorized')" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </button>
                
                @if (expandedCategories().has('Uncategorized')) {
                  <div class="p-6 pt-2 animate-in slide-in-from-top-2 fade-in duration-300">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      @for (ex of tree().uncategorized; track ex.id) {
                        <ng-container *ngTemplateOutlet="exerciseCard; context: { $implicit: ex }"></ng-container>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Reusable Exercise Card for List View -->
          <ng-template #exerciseCard let-exercise>
            <div class="bg-slate-800/60 backdrop-blur border border-slate-700 rounded-xl p-5 flex flex-col h-full hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all duration-300 group">
              <div class="flex justify-between items-start mb-4">
                <div>
                  <div class="flex items-center gap-3">
                    <h3 class="text-lg font-bold text-slate-100 group-hover:text-white transition-colors">{{ exercise.name }}</h3>
                    @if (exercise.personalRecord) {
                      <span class="text-xs font-bold text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-md border border-yellow-500/20 shadow-sm">
                        PR: {{ exercise.personalRecord.weightKg }}kg x {{ exercise.personalRecord.reps }}
                      </span>
                    }
                  </div>
                  <div class="flex flex-wrap gap-1.5 mt-2.5">
                    @if (exercise.equipmentBrand) {
                      <span class="px-2 py-0.5 text-[10px] font-semibold bg-slate-700 text-slate-300 rounded border border-slate-600">
                        {{ exercise.equipmentBrand }}
                      </span>
                    }
                    @if (exercise.unilateral) {
                      <span class="px-2 py-0.5 text-[10px] font-bold tracking-wide bg-amber-500/20 text-amber-400 rounded border border-amber-500/30">
                        UNI
                      </span>
                    }
                    @if (exercise.isPublic) {
                      <span class="px-2 py-0.5 text-[10px] font-bold tracking-wide bg-purple-500/20 text-purple-400 rounded border border-purple-500/30">
                        PUBLIC
                      </span>
                    }
                    @if (exercise.spinalLoading) {
                      <span class="px-2 py-0.5 text-[10px] font-bold tracking-wide bg-red-500/20 text-red-400 rounded border border-red-500/30">
                        SPINAL
                      </span>
                    }
                  </div>
                </div>
              </div>
              <div class="flex gap-4 mt-auto pt-4 border-t border-slate-700/50">
                <button
                  (click)="editExercise(exercise)"
                  class="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors text-sm font-semibold"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                  Edit
                </button>
                <button
                  (click)="deleteExercise(exercise.id)"
                  class="flex items-center gap-1.5 text-red-400 hover:text-red-300 transition-colors text-sm font-semibold"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  Delete
                </button>
              </div>
            </div>
          </ng-template>

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

  searchQuery = signal<string>('');
  hierarchy = BODY_PARTS_HIERARCHY;

  // Accordion state (Collapsed by default!)
  expandedCategories = signal<Set<string>>(new Set());
  expandedGroups = signal<Set<string>>(new Set());
  expandedParts = signal<Set<string>>(new Set());

  toggleCategory(cat: string) {
    const current = new Set(this.expandedCategories());
    if (current.has(cat)) current.delete(cat);
    else current.add(cat);
    this.expandedCategories.set(current);
  }
  
  toggleGroup(grp: string) {
    const current = new Set(this.expandedGroups());
    if (current.has(grp)) current.delete(grp);
    else current.add(grp);
    this.expandedGroups.set(current);
  }
  
  togglePart(part: string) {
    const current = new Set(this.expandedParts());
    if (current.has(part)) current.delete(part);
    else current.add(part);
    this.expandedParts.set(current);
  }

  formatPartName(partCode: string): string {
    return partCode.replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  onSearchChange(query: string) {
    this.searchQuery.set(query);
    if (query.trim()) {
      // Auto expand all when searching
      const allGroups = new Set<string>();
      const allParts = new Set<string>();
      for (const cat of ['Upper Body', 'Lower Body']) {
        const catData = this.hierarchy[cat as keyof typeof this.hierarchy] as Record<string, readonly string[]>;
        for (const [groupName, partsArr] of Object.entries(catData)) {
          allGroups.add(groupName);
          for (const part of partsArr) allParts.add(part);
        }
      }
      this.expandedCategories.set(new Set(['Upper Body', 'Lower Body', 'Uncategorized']));
      this.expandedGroups.set(allGroups);
      this.expandedParts.set(allParts);
    } else {
      // Collapse all when search is cleared
      this.expandedCategories.set(new Set());
      this.expandedGroups.set(new Set());
      this.expandedParts.set(new Set());
    }
  }

  tree = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const filteredExercises = this.exercises().filter(ex => 
      !query || ex.name.toLowerCase().includes(query) || (ex.equipmentBrand && ex.equipmentBrand.toLowerCase().includes(query))
    );

    const uncategorized = filteredExercises.filter(e => (!e.targets || e.targets.length === 0));

    const categories = [];

    for (const cat of ['Upper Body', 'Lower Body']) {
      const catData = this.hierarchy[cat as keyof typeof this.hierarchy] as Record<string, readonly string[]>;
      const groups = [];
      
      for (const [groupName, partsArr] of Object.entries(catData)) {
         const hasSubparts = partsArr.length > 1 || partsArr[0] !== groupName.toUpperCase();
         const parts = [];
         let directExercises: Exercise[] = [];
         
         if (hasSubparts) {
            for (const partName of partsArr) {
               const exForPart = filteredExercises.filter(ex => 
                 ex.targets?.some(t => t.bodyPart === partName)
               );
               if (exForPart.length > 0) {
                 parts.push({ name: partName, exercises: exForPart });
               }
            }
         } else {
            const partName = partsArr[0];
            directExercises = filteredExercises.filter(ex => 
               ex.targets?.some(t => t.bodyPart === partName)
            );
         }
         
         if (parts.length > 0 || directExercises.length > 0) {
            groups.push({
               name: groupName,
               hasSubparts,
               parts,
               directExercises
            });
         }
      }
      
      if (groups.length > 0) {
         categories.push({ name: cat, groups });
      }
    }

    return { categories, uncategorized };
  });

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

  onSaveExercise(formData: { name: string; equipmentBrand: string; unilateral: boolean; isPublic: boolean; targets: { id?: string; bodyPart: string; targetValue: number }[] }) {
    this.isLoading.set(true);
    const exercise = this.selectedExercise();
    
    const exercisePayload = {
      name: formData.name,
      equipmentBrand: formData.equipmentBrand || undefined,
      unilateral: formData.unilateral,
      isPublic: formData.isPublic || false
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

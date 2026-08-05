import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ExerciseService } from '../../services/exercise.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { Exercise, BODY_PARTS_HIERARCHY } from '../../../../core/types/training.types';
import { ExerciseFormComponent } from '../../components/exercise-form/exercise-form.component';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
    selector: 'app-exercise-list',
    imports: [CommonModule, ExerciseFormComponent, FormsModule, RouterModule],
    template: `
    <div class="max-w-7xl mx-auto space-y-8">
    
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-4xl font-black text-black dark:text-white">Exercises</h1>
        </div>
        <button
          (click)="openForm()"
          class="px-6 py-2.5 bg-accent-pos hover:opacity-80 text-white font-bold rounded-xl transition-all transform hover:-translate-y-0.5 solid-btn"
          >
          <span class="mr-2">+</span> Add Exercise
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
          My Exercises
          <span class="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 font-bold">
            {{ myExercisesCount() }}
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
          Public Exercises
          <span class="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 font-bold">
            {{ publicExercisesCount() }}
          </span>
        </button>
      </div>
    
      <!-- Add / Edit Exercise Modal -->
      @if (showForm()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div class="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
            <app-exercise-form
              [exercise]="selectedExercise()"
              (saveExercise)="onSaveExercise($event)"
              (cancelForm)="closeForm()"
            ></app-exercise-form>
          </div>
        </div>
      }
    
      <!-- Loading State -->
      @if (isLoading()) {
        <div class="flex flex-col items-center justify-center py-20 space-y-4">
          <div class="w-10 h-10 border-4 border-accent-pos/30 border-t-accent-pos rounded-full animate-spin"></div>
          <p class="text-gray-500 dark:text-gray-400 font-medium">Loading exercises...</p>
        </div>
      }
    
      <!-- List View -->
      @if (!isLoading()) {
        <div class="space-y-6 animate-in fade-in duration-500">
          <!-- Search Bar -->
          <div class="relative group">
            @if (!searchQuery()) {
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 group-focus-within:text-accent-pos transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            }
            <input
              type="text"
              placeholder="Search exercises by name or brand..."
              [ngModel]="searchQuery()"
              (ngModelChange)="onSearchChange($event)"
              [style.padding-left]="!searchQuery() ? '3rem' : '1rem'"
              [style.padding-right]="searchQuery() ? '2.5rem' : '1rem'"
              class="w-full py-4 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-accent-pos focus:border-accent-pos text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all solid-input"
            >
            @if (searchQuery()) {
              <button
                type="button"
                (click)="onSearchChange('')"
                class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                title="Clear search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            }
          </div>

          @if (tree().categories.length === 0 && tree().uncategorized.length === 0) {
            <div class="flex flex-col items-center justify-center py-16 px-4 bg-gray-50 dark:bg-gray-800/30 border border-gray-300 dark:border-gray-700 rounded-2xl border-dashed">
              <div class="w-16 h-16 bg-accent-pos/10 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-accent-pos" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 class="text-xl font-bold text-black dark:text-white mb-2">
                {{ activeTab() === 'my' ? 'No custom exercises found' : 'No public exercises found' }}
              </h3>
              <p class="text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
                {{ activeTab() === 'my' ? 'Create custom exercises with target muscle groups to track your workouts.' : 'Public exercises created by administrators will appear here.' }}
              </p>
              @if (activeTab() === 'my') {
                <button (click)="openForm()" class="px-6 py-2.5 bg-accent-pos hover:opacity-80 text-white font-bold rounded-xl transition-all solid-btn">
                  <span class="mr-2">+</span> Add Exercise
                </button>
              }
            </div>
          }
          
          <!-- Tree view for List -->
          <div class="space-y-4">
            <!-- STRENGTH CATEGORIES -->
            @for (cat of tree().categories; track cat.name) {
              <div class="solid-card rounded-2xl border border-gray-300 dark:border-gray-700 overflow-hidden shadow-sm">
                <button 
                  type="button" 
                  (click)="toggleCategory(cat.name)"
                  class="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                >
                  <h2 class="text-2xl font-black text-black dark:text-white tracking-wide group-hover:text-accent-pos transition-all">{{ cat.name }}</h2>
                  <div class="w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center border border-gray-300 dark:border-gray-700 group-hover:border-accent-pos transition-colors">
                    <svg class="w-4 h-4 text-gray-500 transition-transform duration-300" [class.rotate-180]="expandedCategories().has(cat.name)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </button>
                
                @if (expandedCategories().has(cat.name)) {
                  <div class="px-6 pb-6 space-y-6 animate-in slide-in-from-top-2 fade-in duration-300">
                    @for (grp of cat.groups; track grp.name) {
                      <div class="pl-4 border-l-2 border-accent-pos/30 pt-2">
                        <button 
                          type="button" 
                          (click)="toggleGroup(grp.name)"
                          class="w-full flex items-center justify-between py-2 text-left group"
                        >
                          <span class="text-xl font-bold text-gray-800 dark:text-gray-200 group-hover:text-accent-pos transition-colors">{{ grp.name }}</span>
                          <svg class="w-4 h-4 text-gray-400 transition-transform duration-300" [class.rotate-180]="expandedGroups().has(grp.name)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        </button>

                        @if (expandedGroups().has(grp.name)) {
                          <div class="mt-4 animate-in slide-in-from-top-1 fade-in duration-300">
                            
                            @if (!grp.hasSubparts) {
                              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                @for (ex of grp.directExercises; track ex.id) {
                                  <ng-container *ngTemplateOutlet="exerciseCard; context: { $implicit: ex }"></ng-container>
                                }
                              </div>
                            } 
                            @else {
                              <div class="space-y-6">
                                @for (part of grp.parts; track part.name) {
                                  <div class="pl-4 border-l-2 border-gray-300 dark:border-gray-700/60">
                                    <button 
                                      type="button" 
                                      (click)="togglePart(part.name)"
                                      class="w-full flex items-center justify-between py-1.5 text-left group"
                                    >
                                      <span class="text-sm font-bold tracking-widest uppercase text-gray-500 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">{{ formatPartName(part.name) }}</span>
                                      <svg class="w-3.5 h-3.5 text-gray-400 transition-transform duration-300" [class.rotate-180]="expandedParts().has(part.name)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </button>

                                    @if (expandedParts().has(part.name)) {
                                      <div class="mt-3 animate-in fade-in duration-300">
                                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
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
              <div class="solid-card rounded-2xl border border-gray-300 dark:border-gray-700 overflow-hidden shadow-sm">
                <button 
                  type="button" 
                  (click)="toggleCategory('Uncategorized')"
                  class="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                >
                  <h2 class="text-2xl font-black text-gray-500 tracking-wide group-hover:text-black dark:group-hover:text-gray-400 transition-all">Uncategorized</h2>
                  <div class="w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center border border-gray-300 dark:border-gray-700 transition-colors">
                    <svg class="w-4 h-4 text-gray-500 transition-transform duration-300" [class.rotate-180]="expandedCategories().has('Uncategorized')" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </button>
                
                @if (expandedCategories().has('Uncategorized')) {
                  <div class="p-6 pt-2 animate-in slide-in-from-top-2 fade-in duration-300">
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
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
            <div
              tabindex="0"
              (keydown.enter)="editExercise(exercise)"
              class="solid-card border border-gray-300 dark:border-gray-700 rounded-xl p-3.5 flex flex-col h-full hover:border-accent-pos transition-all duration-300 group cursor-pointer"
              (click)="editExercise(exercise)"
            >
              <div class="flex justify-between items-start gap-2 mb-2">
                <div class="min-w-0 flex-1">
                  <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-accent-pos transition-colors truncate" [title]="exercise.name">
                    {{ exercise.name }}
                  </h3>
                </div>
                @if (exercise.averageRating) {
                  <div class="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-xs font-bold shrink-0" title="Average Rating (1-10)">
                    <svg class="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    <span>{{ exercise.averageRating | number:'1.1-1' }}</span>
                  </div>
                }
              </div>

              <div class="flex flex-wrap gap-1 mb-3">
                @if (exercise.equipmentBrand) {
                  <span class="px-1.5 py-0.5 text-[9px] font-semibold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600 truncate max-w-[120px]">
                    {{ exercise.equipmentBrand }}
                  </span>
                }
                @if (exercise.unilateral) {
                  <span class="px-1.5 py-0.5 text-[9px] font-bold tracking-wide bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded border border-amber-200 dark:border-amber-500/30">
                    UNI
                  </span>
                }
                @if (exercise.isPublic) {
                  <span class="px-1.5 py-0.5 text-[9px] font-bold tracking-wide bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 rounded border border-purple-200 dark:border-purple-500/30">
                    PUBLIC
                  </span>
                }
                @if (exercise.spinalLoading) {
                  <span class="px-1.5 py-0.5 text-[9px] font-bold tracking-wide bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded border border-red-200 dark:border-red-500/30">
                    SPINAL
                  </span>
                }
              </div>

              <div class="flex items-center gap-2 mt-auto pt-2 border-t border-gray-200 dark:border-gray-700/50 text-xs">
                <a
                  [routerLink]="['/analytics']" [queryParams]="{ exerciseId: exercise.id }"
                  (click)="$event.stopPropagation()"
                  class="flex items-center gap-1 text-accent-pos hover:opacity-80 transition-colors font-semibold mr-auto"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                  Analytics
                </a>
                @if (canEdit(exercise)) {
                  <button
                    (click)="editExercise(exercise); $event.stopPropagation()"
                    class="flex items-center gap-1 text-accent-pos hover:opacity-80 transition-colors font-semibold"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    Edit
                  </button>
                  <button
                    (click)="deleteExercise(exercise.id); $event.stopPropagation()"
                    class="flex items-center gap-1 text-accent-neg hover:opacity-80 transition-colors font-semibold"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    Delete
                  </button>
                } @else {
                  <button
                    (click)="editExercise(exercise); $event.stopPropagation()"
                    class="flex items-center gap-1 text-gray-500 hover:text-black dark:hover:text-white transition-colors font-semibold"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    Details
                  </button>
                }
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
  authService = inject(AuthService);

  exercises = signal<Exercise[]>([]);
  isLoading = signal<boolean>(true);
  
  showForm = signal<boolean>(false);
  selectedExercise = signal<Exercise | null>(null);

  activeTab = signal<'my' | 'public'>('my');
  myExercisesCount = computed(() => this.exercises().filter(ex => !ex.isPublic).length);
  publicExercisesCount = computed(() => this.exercises().filter(ex => ex.isPublic).length);

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
    const currentTab = this.activeTab();

    const tabFiltered = this.exercises().filter(ex => 
      currentTab === 'my' ? !ex.isPublic : ex.isPublic
    );

    const filteredExercises = tabFiltered.filter(ex => 
      !query || ex.name.toLowerCase().includes(query) || (ex.equipmentBrand && ex.equipmentBrand.toLowerCase().includes(query))
    );

    const sortFn = (a: Exercise, b: Exercise) => {
      const ratingA = a.averageRating ?? 0;
      const ratingB = b.averageRating ?? 0;
      if (ratingB !== ratingA) {
        return ratingB - ratingA;
      }
      return a.name.localeCompare(b.name);
    };

    const uncategorized = filteredExercises.filter(e => (!e.targets || e.targets.length === 0)).sort(sortFn);

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
               ).sort(sortFn);
               if (exForPart.length > 0) {
                 parts.push({ name: partName, exercises: exForPart });
               }
            }
         } else {
            const partName = partsArr[0];
            directExercises = filteredExercises.filter(ex => 
               ex.targets?.some(t => t.bodyPart === partName)
            ).sort(sortFn);
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

  canEdit(exercise: Exercise): boolean {
    return !exercise.isPublic || this.authService.isAdmin;
  }

  onSaveExercise(formData: { name: string; equipmentBrand: string; unilateral: boolean; spinalLoading?: boolean; isBodyweight?: boolean; isPublic: boolean; targets: { id?: string; bodyPart: string; targetValue: number }[] }) {
    this.isLoading.set(true);
    const exercise = this.selectedExercise();
    
    const exercisePayload = {
      name: formData.name,
      equipmentBrand: formData.equipmentBrand || undefined,
      unilateral: formData.unilateral,
      spinalLoading: formData.spinalLoading || false,
      isBodyweight: formData.isBodyweight || false,
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

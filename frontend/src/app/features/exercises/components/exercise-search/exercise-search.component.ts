import { Component, OnInit, inject, signal, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Exercise, BODY_PARTS_HIERARCHY } from '../../../../core/types/training.types';
import { ExerciseService } from '../../services/exercise.service';
import { debounceTime } from 'rxjs';

interface TreePart {
  name: string;
  exercises: Exercise[];
}

interface TreeGroup {
  name: string;
  hasSubparts: boolean;
  parts: TreePart[];
  directExercises: Exercise[];
}

interface TreeCategory {
  name: string;
  groups: TreeGroup[];
}

interface FullTree {
  categories: TreeCategory[];
}

@Component({
  standalone: true,
    selector: 'app-exercise-search',
    imports: [CommonModule, ReactiveFormsModule],
    template: `
    <div class="bg-gray-800 rounded-xl p-4 border border-gray-700 h-full flex flex-col">
      <form [formGroup]="searchForm" class="shrink-0 mb-4">
        <!-- Text Search -->
        <div class="relative">
          <input
            type="text"
            formControlName="query"
            placeholder="Search exercise by name..."
            class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white pl-10"
            >
          <span class="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>
      </form>
    
      <!-- Tree Results -->
      <div class="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
        @if (loading()) {
          <div class="flex justify-center py-6">
            <div class="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          </div>
        }
        @if (!loading() && tree().categories.length === 0) {
          <div class="text-center text-sm text-slate-500 py-6">
            No exercises found.
          </div>
        }

        <!-- STRENGTH CATEGORIES -->
        @for (cat of tree().categories; track cat.name) {
          <div class="bg-slate-900/40 rounded-xl border border-slate-700/50 overflow-hidden">
            <button 
              type="button" 
              (click)="toggleCategory(cat.name)"
              class="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors group"
            >
              <span class="font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">{{ cat.name }}</span>
              <svg class="w-3.5 h-3.5 text-slate-500 transition-transform duration-300" [class.rotate-180]="expandedCategories().has(cat.name)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            
            @if (expandedCategories().has(cat.name)) {
              <div class="px-4 pb-4 space-y-4 pt-1 animate-in slide-in-from-top-1 fade-in duration-200">
                @for (grp of cat.groups; track grp.name) {
                  <div class="pl-3 border-l-2 border-indigo-500/30">
                    <button 
                      type="button" 
                      (click)="toggleGroup(grp.name)"
                      class="w-full flex items-center justify-between py-1.5 text-left group"
                    >
                      <span class="font-medium text-sm text-slate-300 group-hover:text-indigo-400 transition-colors">{{ grp.name }}</span>
                      <svg class="w-3 h-3 text-slate-600 transition-transform duration-300" [class.rotate-180]="expandedGroups().has(grp.name)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>

                    @if (expandedGroups().has(grp.name)) {
                      <div class="mt-2 space-y-2 animate-in fade-in duration-200">
                        
                        <!-- If it has NO subparts, list exercises directly -->
                        @if (!grp.hasSubparts) {
                          <div class="space-y-1">
                            @for (ex of grp.directExercises; track ex.id) {
                              <ng-container *ngTemplateOutlet="exerciseCard; context: { $implicit: ex }"></ng-container>
                            }
                          </div>
                        } 
                        <!-- If it HAS subparts, list the parts first -->
                        @else {
                          <div class="space-y-3">
                            @for (part of grp.parts; track part.name) {
                              <div class="pl-3 border-l-2 border-slate-700/50">
                                <button 
                                  type="button" 
                                  (click)="togglePart(part.name)"
                                  class="w-full flex items-center justify-between py-1 text-left group"
                                >
                                  <span class="text-[11px] font-bold tracking-widest uppercase text-slate-500 group-hover:text-slate-300 transition-colors">{{ formatPartName(part.name) }}</span>
                                  <svg class="w-2.5 h-2.5 text-slate-600 transition-transform duration-300" [class.rotate-180]="expandedParts().has(part.name)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                </button>

                                @if (expandedParts().has(part.name)) {
                                  <div class="mt-2 space-y-1 animate-in fade-in duration-200">
                                    @for (ex of part.exercises; track ex.id) {
                                      <ng-container *ngTemplateOutlet="exerciseCard; context: { $implicit: ex }"></ng-container>
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
          </div>
        }

      </div>
    </div>

    <!-- Reusable Exercise Card Template -->
    <ng-template #exerciseCard let-ex>
      <button
        type="button"
        [disabled]="excludeIds().includes(ex.id)"
        [class.opacity-50]="excludeIds().includes(ex.id)"
        [class.cursor-not-allowed]="excludeIds().includes(ex.id)"
        class="w-full text-left p-2.5 bg-gray-900/80 hover:bg-gray-700/80 rounded-lg border border-gray-700 transition-colors flex justify-between items-center group mb-1"
        (click)="!excludeIds().includes(ex.id) && exerciseSelected.emit(ex)"
      >
        <div>
          <div class="flex items-center gap-2">
            <span class="font-medium text-white text-sm">{{ ex.name }}</span>
            @if (ex.unilateral) {
              <span class="px-1 py-0.5 text-[9px] bg-amber-500/20 text-amber-400 rounded font-semibold">UNI</span>
            }
          </div>
          <div class="text-[10px] text-gray-400 flex items-center gap-2 mt-1">
            @if (ex.equipmentBrand) {
              <span class="flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                {{ ex.equipmentBrand }}
              </span>
            }
            @if (ex.spinalLoading) {
              <span class="text-red-400 font-bold">SPINAL</span>
            }
            <span class="text-yellow-500">★ {{ ex.averageRating | number:'1.1-1' }}</span>
          </div>
        </div>
        @if (!excludeIds().includes(ex.id)) {
          <div class="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center text-sm">
            +
          </div>
        }
        @if (excludeIds().includes(ex.id)) {
          <div class="text-[9px] text-red-400 font-bold bg-red-900/20 px-1.5 py-0.5 rounded">
            ADDED
          </div>
        }
      </button>
    </ng-template>
    `,
    styles: [`
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: rgba(31, 41, 55, 0.5); 
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(75, 85, 99, 0.8); 
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(107, 114, 128, 1); 
    }
  `]
})
export class ExerciseSearchComponent implements OnInit {
  readonly excludeIds = input<string[]>([]);
  readonly exerciseSelected = output<Exercise>();

  private fb = inject(FormBuilder);
  private exerciseService = inject(ExerciseService);

  loading = signal<boolean>(false);
  allExercises: Exercise[] = [];
  filteredExercises = signal<Exercise[]>([]);

  hierarchy = BODY_PARTS_HIERARCHY;

  // Accordion state (Collapsed by default!)
  expandedCategories = signal<Set<string>>(new Set());
  expandedGroups = signal<Set<string>>(new Set());
  expandedParts = signal<Set<string>>(new Set());

  searchForm = this.fb.group({
    query: ['']
  });

  tree = computed<FullTree>(() => {
    const exercises = this.filteredExercises();
    
    const categories: TreeCategory[] = [];
    
    for (const cat of ['Upper Body', 'Lower Body']) {
      const catData = this.hierarchy[cat as keyof typeof this.hierarchy] as Record<string, readonly string[]>;
      const groups: TreeGroup[] = [];
      
      for (const [groupName, partsArr] of Object.entries(catData)) {
         // Determine if this group is just a 1:1 mapping (e.g. Quads -> QUADS)
         const hasSubparts = partsArr.length > 1 || partsArr[0] !== groupName.toUpperCase();
         
         const parts: TreePart[] = [];
         let directExercises: Exercise[] = [];
         
         if (hasSubparts) {
            for (const partName of partsArr) {
               const exForPart = exercises.filter(ex => 
                 ex.targets?.some(t => t.bodyPart === partName)
               );
               if (exForPart.length > 0) {
                 parts.push({ name: partName, exercises: exForPart });
               }
            }
         } else {
            const partName = partsArr[0];
            directExercises = exercises.filter(ex => 
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
    
    return { categories };
  });

  ngOnInit() {
    this.loading.set(true);
    this.exerciseService.getExercises().subscribe(data => {
      this.allExercises = data;
      this.applyFilters('');
      this.loading.set(false);
    });

    this.searchForm.valueChanges.pipe(
      debounceTime(300)
    ).subscribe(formValue => {
      this.applyFilters(formValue.query || '');
    });
  }

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

  private applyFilters(query: string) {
    query = query.toLowerCase().trim();
    let result = this.allExercises;

    if (query) {
      result = result.filter(ex => 
        ex.name.toLowerCase().includes(query) || 
        (ex.equipmentBrand && ex.equipmentBrand.toLowerCase().includes(query))
      );
      
      // Auto-expand everything when searching
      const allGroups = new Set<string>();
      const allParts = new Set<string>();
      for (const cat of ['Upper Body', 'Lower Body']) {
        const catData = this.hierarchy[cat as keyof typeof this.hierarchy] as Record<string, readonly string[]>;
        for (const [groupName, partsArr] of Object.entries(catData)) {
          allGroups.add(groupName);
          for (const part of partsArr) allParts.add(part);
        }
      }
      this.expandedCategories.set(new Set(['Upper Body', 'Lower Body']));
      this.expandedGroups.set(allGroups);
      this.expandedParts.set(allParts);
    } else {
      // Reset expansions to only top level when search is cleared
      this.expandedCategories.set(new Set(['Upper Body', 'Lower Body']));
      this.expandedGroups.set(new Set());
      this.expandedParts.set(new Set());
    }

    this.filteredExercises.set(result);
  }
}

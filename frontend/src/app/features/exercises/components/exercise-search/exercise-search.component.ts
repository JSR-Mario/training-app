import { Component, EventEmitter, OnInit, Output, inject, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Exercise, BODY_PARTS_HIERARCHY } from '../../../../core/types/training.types';
import { ExerciseService } from '../../services/exercise.service';
import { debounceTime } from 'rxjs';

@Component({
    selector: 'app-exercise-search',
    imports: [CommonModule, ReactiveFormsModule],
    template: `
    <div class="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <form [formGroup]="searchForm" class="space-y-4">
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
    
        <!-- Advanced Filters Toggle -->
        <div>
          <button
            type="button"
            (click)="showFilters.set(!showFilters())"
            class="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
            <span [class.rotate-90]="showFilters()" class="transition-transform">▶</span>
            Advanced Filters
          </button>
        </div>
    
        <!-- Filters -->
        @if (showFilters()) {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-gray-900/50 rounded-lg">
            <div>
              <label for="typeSelect" class="block text-xs text-gray-400 mb-1">Type</label>
              <select
                id="typeSelect"
                formControlName="type"
                class="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-white"
                >
                <option value="">All Types</option>
                <option value="STRENGTH">Strength</option>
                <option value="CARDIO">Cardio</option>
              </select>
            </div>
            @if (searchForm.get('type')?.value !== 'CARDIO') {
              <div>
                <label for="categorySelect" class="block text-xs text-gray-400 mb-1">Region</label>
                <select
                  id="categorySelect"
                  formControlName="category"
                  class="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-white"
                  >
                  <option value="">All Regions</option>
                  @for (cat of categories; track cat) {
                    <option [value]="cat">{{ cat }}</option>
                  }
                </select>
              </div>
              <div>
                <label for="groupSelect" class="block text-xs text-gray-400 mb-1">Muscle Group</label>
                <select
                  id="groupSelect"
                  formControlName="group"
                  class="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-white"
                  >
                  <option value="">All Groups</option>
                  @for (grp of availableGroups(); track grp) {
                    <option [value]="grp">{{ grp }}</option>
                  }
                </select>
              </div>
              <div>
                <label for="bodyPartSelect" class="block text-xs text-gray-400 mb-1">Specific Part</label>
                <select
                  id="bodyPartSelect"
                  formControlName="bodyPart"
                  class="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-white"
                  >
                  <option value="">All Parts</option>
                  @for (part of availableParts(); track part) {
                    <option [value]="part">{{ part }}</option>
                  }
                </select>
              </div>
            }
          </div>
        }
      </form>
    
      <!-- Results -->
      <div class="mt-4 max-h-60 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
        @if (loading()) {
          <div class="text-center text-sm text-gray-400 py-4">Searching...</div>
        }
        @if (!loading() && filteredExercises().length === 0) {
          <div class="text-center text-sm text-gray-500 py-4">
            No exercises found.
          </div>
        }
    
        @for (ex of filteredExercises(); track ex) {
          <button
            type="button"
            [disabled]="excludeIds.includes(ex.id)"
            [class.opacity-50]="excludeIds.includes(ex.id)"
            [class.cursor-not-allowed]="excludeIds.includes(ex.id)"
            class="w-full text-left p-3 bg-gray-900/80 hover:bg-gray-700/80 rounded-lg border border-gray-700 transition-colors flex justify-between items-center group"
            (click)="!excludeIds.includes(ex.id) && select.emit(ex)"
            >
            <div>
              <div class="flex items-center gap-2">
                <span class="font-medium text-white">{{ ex.name }}</span>
                @if (ex.type === 'CARDIO') {
                  <span class="px-1.5 py-0.5 text-[10px] bg-purple-500/20 text-purple-400 rounded font-semibold">CARDIO</span>
                }
                @if (ex.unilateral) {
                  <span class="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 rounded font-semibold">UNI</span>
                }
              </div>
              <div class="text-xs text-gray-400 flex items-center gap-3 mt-1">
                @if (ex.equipmentBrand) {
                  <span class="flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    {{ ex.equipmentBrand }}
                  </span>
                }
                <span class="flex items-center gap-1 text-yellow-500">
                  ★ {{ ex.averageRating | number:'1.1-1' }}
                </span>
              </div>
            </div>
            @if (!excludeIds.includes(ex.id)) {
              <div class="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center">
                +
              </div>
            }
            @if (excludeIds.includes(ex.id)) {
              <div class="text-[10px] text-red-400 font-bold bg-red-900/20 px-2 py-1 rounded">
                ADDED
              </div>
            }
          </button>
        }
      </div>
    </div>
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
  @Input() excludeIds: string[] = [];
  @Output() select = new EventEmitter<Exercise>();

  private fb = inject(FormBuilder);
  private exerciseService = inject(ExerciseService);

  showFilters = signal<boolean>(false);
  loading = signal<boolean>(false);
  filteredExercises = signal<Exercise[]>([]);
  allExercises: Exercise[] = [];

  hierarchy = BODY_PARTS_HIERARCHY;
  categories = Object.keys(BODY_PARTS_HIERARCHY);

  searchForm = this.fb.group({
    query: [''],
    type: [''],
    category: [''],
    group: [''],
    bodyPart: ['']
  });

  ngOnInit() {
    // Initial load
    this.loading.set(true);
    this.exerciseService.getExercises().subscribe(data => {
      this.allExercises = data;
      this.applyFilters(this.searchForm.value);
      this.loading.set(false);
    });

    // Cascading dropdowns
    this.searchForm.get('type')?.valueChanges.subscribe(val => {
      if (val === 'CARDIO') {
        this.searchForm.patchValue({ category: '', group: '', bodyPart: '' }, { emitEvent: false });
      }
    });
    this.searchForm.get('category')?.valueChanges.subscribe(() => {
      this.searchForm.patchValue({ group: '', bodyPart: '' }, { emitEvent: false });
    });
    this.searchForm.get('group')?.valueChanges.subscribe(() => {
      this.searchForm.patchValue({ bodyPart: '' }, { emitEvent: false });
    });

    // Filter pipeline
    this.searchForm.valueChanges.pipe(
      debounceTime(300)
    ).subscribe(formValue => {
      this.applyFilters(formValue);
    });
  }

  availableGroups(): string[] {
    const cat = this.searchForm.get('category')?.value;
    if (!cat) return [];
    return Object.keys(this.hierarchy[cat as keyof typeof this.hierarchy] || {});
  }

  availableParts(): string[] {
    const cat = this.searchForm.get('category')?.value;
    const grp = this.searchForm.get('group')?.value;
    if (!cat || !grp) return [];
    const catData = this.hierarchy[cat as keyof typeof this.hierarchy] as Record<string, readonly string[]>;
    if (!catData) return [];
    return [...(catData[grp] || [])];
  }

  private applyFilters(filters: { query?: string | null, type?: string | null, category?: string | null, group?: string | null, bodyPart?: string | null }) {
    const query = (filters.query || '').toLowerCase();
    const type = filters.type;
    const category = filters.category;
    const group = filters.group;
    const bodyPart = filters.bodyPart;

    let result = this.allExercises;

    // 0. Type Filter
    if (type) {
      result = result.filter(ex => ex.type === type);
    }

    // 1. Text Search
    if (query) {
      result = result.filter(ex => 
        ex.name.toLowerCase().includes(query) || 
        (ex.equipmentBrand && ex.equipmentBrand.toLowerCase().includes(query))
      );
    }

    // 2. Hierarchy Filters (Only for STRENGTH exercises, CARDIO usually doesn't have targets, but let's just filter targets)
    if (category || group || bodyPart) {
      result = result.filter(ex => {
        if (!ex.targets || ex.targets.length === 0) return false;
        
        return ex.targets.some(target => {
          const bp = target.bodyPart;
          
          if (bodyPart) {
            return bp === bodyPart;
          }
          
          if (group && category) {
            const catData = this.hierarchy[category as keyof typeof this.hierarchy] as Record<string, readonly string[]>;
            return catData && catData[group] && catData[group].includes(bp);
          }
          
          if (category) {
            const catData = this.hierarchy[category as keyof typeof this.hierarchy] as Record<string, readonly string[]>;
            return catData && Object.values(catData).some(parts => parts.includes(bp));
          }
          
          return true;
        });
      });
    }

    this.filteredExercises.set(result);
  }
}

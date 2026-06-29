import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ExerciseService } from '../../services/exercise.service';
import { Exercise, getBodyPartPath, BODY_PARTS_HIERARCHY, BodyPart } from '../../../../core/types/training.types';
import { ExerciseFormComponent } from '../../components/exercise-form/exercise-form.component';

@Component({
  selector: 'app-exercise-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ExerciseFormComponent],
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

      <!-- Filters & List View -->
      <div *ngIf="!isLoading() && !showForm()" class="space-y-6">
        
        <!-- Search and Filters -->
        <div class="bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-lg">
          <form [formGroup]="filterForm" class="space-y-4">
            <!-- Text Search -->
            <div class="relative">
              <input 
                type="text" 
                formControlName="query"
                placeholder="Search exercise by name..."
                class="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white pl-11 shadow-inner"
              >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 absolute left-4 top-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <!-- Filter dropdowns -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <select formControlName="type" class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none text-white text-sm">
                  <option value="">All Types</option>
                  <option value="STRENGTH">Strength</option>
                  <option value="CARDIO">Cardio</option>
                </select>
              </div>
              <div *ngIf="filterForm.get('type')?.value !== 'CARDIO'">
                <select formControlName="category" class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none text-white text-sm">
                  <option value="">All Regions</option>
                  <option *ngFor="let cat of categories" [value]="cat">{{ cat }}</option>
                </select>
              </div>
              <div *ngIf="filterForm.get('type')?.value !== 'CARDIO'">
                <select formControlName="group" class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none text-white text-sm">
                  <option value="">All Muscle Groups</option>
                  <option *ngFor="let grp of availableGroups()" [value]="grp">{{ grp }}</option>
                </select>
              </div>
            </div>
          </form>
        </div>

        <!-- No Results -->
        <div *ngIf="groupedExercises().length === 0" class="text-center py-12 glass-card">
          <p class="text-gray-400 text-lg">No exercises match your search filters.</p>
        </div>

        <!-- Grouped Sections -->
        <div class="space-y-4">
          <div *ngFor="let group of groupedExercises()" class="glass-card overflow-hidden">
            <!-- Section Header -->
            <button 
              (click)="toggleGroup(group.groupName)"
              class="w-full flex justify-between items-center p-5 bg-gray-800/80 hover:bg-gray-800 transition-colors cursor-pointer border-b border-gray-700"
            >
              <h2 class="text-xl font-bold text-white flex items-center gap-3 tracking-wide">
                {{ group.groupName }}
                <span class="text-xs bg-gray-700 text-blue-300 py-1 px-2.5 rounded-full font-medium">{{ group.exercises.length }}</span>
              </h2>
              <span class="text-gray-400 transition-transform duration-300" [class.rotate-180]="expandedGroups().has(group.groupName)">▼</span>
            </button>
            
            <!-- Section Content (Grid) -->
            <div *ngIf="expandedGroups().has(group.groupName)" class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-gray-900/30">
              
              <!-- Exercise Card -->
              <div *ngFor="let exercise of group.exercises" class="bg-gray-800 rounded-xl border border-gray-700 p-5 flex flex-col h-full hover:border-blue-500/50 transition-colors shadow-lg">
                <div class="flex justify-between items-start mb-4">
                  <div>
                    <h3 class="text-lg font-bold text-white">{{ exercise.name }}</h3>
                    <div class="flex flex-wrap gap-2 mt-2">
                      <span *ngIf="exercise.equipmentBrand" class="px-2 py-0.5 text-[10px] bg-slate-700/60 text-slate-300 rounded border border-slate-600/50">
                        {{ exercise.equipmentBrand }}
                      </span>
                      <span *ngIf="exercise.unilateral" class="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-400 rounded border border-amber-500/30">
                        UNILATERAL
                      </span>
                      <span *ngIf="exercise.isPublic" class="px-2 py-0.5 text-[10px] font-semibold bg-purple-500/20 text-purple-400 rounded border border-purple-500/30">
                        PUBLIC
                      </span>
                    </div>
                  </div>
                  <div class="flex flex-col gap-1 items-end shrink-0">
                    <button (click)="editExercise(exercise)" class="text-blue-400 hover:text-blue-300 transition-colors text-[10px] uppercase font-bold tracking-wider py-1 px-2 bg-blue-500/10 rounded">Edit</button>
                    <button (click)="deleteExercise(exercise.id)" class="text-red-400 hover:text-red-300 transition-colors text-[10px] uppercase font-bold tracking-wider py-1 px-2 bg-red-500/10 rounded mt-1">Delete</button>
                  </div>
                </div>
                
                <div class="flex-1 mt-2">
                  <h4 class="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">Targets</h4>
                  <div *ngIf="exercise.targets.length === 0" class="text-xs text-gray-600 italic">No targets set</div>
                  <div class="flex flex-wrap gap-1.5">
                    <span *ngFor="let target of exercise.targets" class="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-[10px] font-medium text-gray-300 shadow-sm">
                      {{ target.bodyPart }} ({{ target.targetValue }})
                    </span>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </div>

      </div>

    </div>
  `
})
export class ExerciseListComponent implements OnInit {
  private exerciseService = inject(ExerciseService);
  private fb = inject(FormBuilder);

  exercises = signal<Exercise[]>([]);
  isLoading = signal<boolean>(true);
  
  showForm = signal<boolean>(false);
  selectedExercise = signal<Exercise | null>(null);

  filterForm = this.fb.group({
    query: [''],
    type: [''],
    category: [''],
    group: ['']
  });

  private filterValues = toSignal(this.filterForm.valueChanges, { initialValue: this.filterForm.value });

  expandedGroups = signal<Set<string>>(new Set());

  toggleGroup(group: string) {
    const current = new Set(this.expandedGroups());
    if (current.has(group)) {
      current.delete(group);
    } else {
      current.add(group);
    }
    this.expandedGroups.set(current);
  }

  categories = Object.keys(BODY_PARTS_HIERARCHY);

  availableGroups = computed(() => {
    const filters = this.filterValues();
    if (!filters?.category) {
      return Object.values(BODY_PARTS_HIERARCHY).flatMap(cat => Object.keys(cat));
    }
    const categoryData = BODY_PARTS_HIERARCHY[filters.category as keyof typeof BODY_PARTS_HIERARCHY];
    return categoryData ? Object.keys(categoryData) : [];
  });

  filteredExercises = computed(() => {
    const all = this.exercises();
    const filters = this.filterValues();
    if (!filters) return all;

    const query = filters.query?.toLowerCase() || '';
    const type = filters.type;
    const category = filters.category;
    const groupFilter = filters.group;

    return all.filter(ex => {
      if (query && !ex.name.toLowerCase().includes(query)) return false;
      if (type && ex.type !== type) return false;
      
      if (ex.type === 'CARDIO') {
        if (category || groupFilter) return false;
        return true;
      }

      if (category || groupFilter) {
        if (!ex.targets || ex.targets.length === 0) return false;
        
        const matchesTarget = ex.targets.some(t => {
          const path = getBodyPartPath(t.bodyPart as BodyPart);
          if (!path) return false;
          if (category && path.category !== category) return false;
          if (groupFilter && path.group !== groupFilter) return false;
          return true;
        });
        if (!matchesTarget) return false;
      }

      return true;
    });
  });

  groupedExercises = computed(() => {
    const filtered = this.filteredExercises();
    const map = new Map<string, Exercise[]>();
    
    for (const ex of filtered) {
      let groupName = 'Uncategorized';
      if (ex.type === 'CARDIO') {
        groupName = 'Cardio';
      } else if (ex.targets && ex.targets.length > 0) {
        // Use the first target as primary
        const primaryTarget = ex.targets[0];
        const path = getBodyPartPath(primaryTarget.bodyPart as BodyPart);
        if (path) {
          groupName = path.group;
        }
      }

      if (!map.has(groupName)) {
        map.set(groupName, []);
      }
      map.get(groupName)!.push(ex);
    }

    const sortedKeys = Array.from(map.keys()).sort((a, b) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      if (a === 'Cardio') return 1;
      if (b === 'Cardio') return -1;
      return a.localeCompare(b);
    });

    return sortedKeys.map(key => ({
      groupName: key,
      exercises: map.get(key)!
    }));
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

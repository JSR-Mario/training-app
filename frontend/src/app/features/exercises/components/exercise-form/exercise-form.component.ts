import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { Exercise, BODY_PARTS_HIERARCHY, getBodyPartPath } from '../../../../core/types/training.types';
import { ExerciseService } from '../../services/exercise.service';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';

export interface ExerciseFormData {
  name: string;
  equipmentBrand: string;
  unilateral: boolean;
  targets: { id?: string; bodyPart: string; targetValue: number }[];
}

@Component({
  selector: 'app-exercise-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="glass-card p-6 w-full max-w-2xl mx-auto">
      <h2 class="text-2xl font-bold mb-6 text-white">{{ exercise ? 'Edit Exercise' : 'New Exercise' }}</h2>
      
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">

        <!-- Name with Autocomplete -->
        <div class="relative">
          <label for="name" class="block text-sm font-medium text-gray-300 mb-1">Exercise Name</label>
          <input 
            id="name"
            type="text" 
            formControlName="name"
            (input)="onNameInput($event)"
            (focus)="showSuggestions.set(suggestions().length > 0)"
            autocomplete="off"
            class="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white"
            placeholder="e.g., Bench Press"
          >
          <div *ngIf="form.get('name')?.invalid && form.get('name')?.touched" class="text-red-400 text-xs mt-1">
            Name is required (max 200 chars).
          </div>

          <!-- Autocomplete Dropdown -->
          <div 
            *ngIf="showSuggestions() && suggestions().length > 0"
            class="absolute z-20 w-full mt-1 bg-gray-800 border border-gray-600 rounded-xl shadow-xl overflow-hidden"
          >
            <button
              *ngFor="let suggestion of suggestions()"
              type="button"
              (mousedown)="selectSuggestion(suggestion)"
              class="w-full text-left px-4 py-3 hover:bg-gray-700/80 transition-colors border-b border-gray-700/50 last:border-b-0"
            >
              <span class="text-white font-medium">{{ suggestion.name }}</span>
              <span *ngIf="suggestion.equipmentBrand" class="text-gray-400 text-xs ml-2">({{ suggestion.equipmentBrand }})</span>
              <span *ngIf="suggestion.unilateral" class="ml-2 px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-400 rounded">UNI</span>
            </button>
          </div>
        </div>

        <!-- Equipment Brand (optional) -->
        <div>
          <label for="equipmentBrand" class="block text-sm font-medium text-gray-300 mb-1">
            Equipment Brand
            <span class="text-gray-500 text-xs ml-1">(optional)</span>
          </label>
          <input 
            id="equipmentBrand"
            type="text" 
            formControlName="equipmentBrand"
            class="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white"
            placeholder="e.g., Hammer Strength, Rogue, Life Fitness"
          >
        </div>

        <!-- Unilateral Checkbox -->
        <div class="flex items-center gap-3">
          <label class="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              formControlName="unilateral"
              class="sr-only peer"
              id="unilateral"
            >
            <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
          <label for="unilateral" class="text-sm font-medium text-gray-300 cursor-pointer">
            Unilateral exercise
            <span class="text-gray-500 text-xs ml-1">(one side at a time)</span>
          </label>
        </div>

        <!-- Body Part Targets -->
        <div>
          <div class="flex justify-between items-center mb-2">
            <h3 class="block text-sm font-medium text-gray-300">Body Part Targets</h3>
            <button 
              type="button" 
              (click)="addTarget()"
              class="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
            >
              + Add Target
            </button>
          </div>
          
          <div formArrayName="targets" class="space-y-3">
            <div *ngFor="let targetForm of targets.controls; let i = index" [formGroupName]="i" class="flex gap-3 items-start bg-gray-800/30 p-3 rounded-xl border border-gray-700/50">
              <div class="flex-1 flex flex-col gap-2">
                <select 
                  formControlName="category"
                  (change)="onCategoryChange(i)"
                  class="w-full px-3 py-2 text-sm bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white"
                >
                  <option value="" disabled>Select Region</option>
                  <option *ngFor="let cat of categories" [value]="cat">{{ cat }}</option>
                </select>
                
                <select 
                  *ngIf="targetForm.get('category')?.value"
                  formControlName="group"
                  (change)="onGroupChange(i)"
                  class="w-full px-3 py-2 text-sm bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white"
                >
                  <option value="" disabled>Select Muscle Group</option>
                  <option *ngFor="let grp of getGroupsFor(targetForm.get('category')?.value)" [value]="grp">{{ grp }}</option>
                </select>
                
                <select 
                  *ngIf="targetForm.get('group')?.value"
                  formControlName="bodyPart"
                  class="w-full px-3 py-2 text-sm bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white border-l-2 border-l-blue-500"
                >
                  <option value="" disabled>Select Specific Part</option>
                  <option *ngFor="let part of getPartsFor(targetForm.get('category')?.value, targetForm.get('group')?.value)" [value]="part">{{ part }}</option>
                </select>
              </div>
              
              <div class="w-24">
                <input 
                  type="number" 
                  step="0.1"
                  min="0"
                  max="1"
                  formControlName="targetValue"
                  class="w-full px-3 py-2 text-sm bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white"
                  placeholder="0.0-1.0"
                >
              </div>
              
              <button 
                type="button" 
                (click)="removeTarget(i)"
                class="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                title="Remove Target"
              >
                X
              </button>
            </div>
            <div *ngIf="targets.length === 0" class="text-sm text-gray-500 italic">
              No body part targets added. This exercise won't count towards weekly volume.
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t border-gray-800">
          <button 
            type="button" 
            (click)="cancelForm.emit()"
            class="px-4 py-2 text-gray-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            [disabled]="form.invalid"
            class="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl disabled:opacity-50 transition-colors"
          >
            Save Exercise
          </button>
        </div>
      </form>
    </div>
  `
})
export class ExerciseFormComponent implements OnInit {
  @Input() exercise: Exercise | null = null;
  @Output() saveExercise = new EventEmitter<ExerciseFormData>();
  @Output() cancelForm = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private exerciseService = inject(ExerciseService);
  
  hierarchy = BODY_PARTS_HIERARCHY;
  categories = Object.keys(BODY_PARTS_HIERARCHY);
  suggestions = signal<Exercise[]>([]);
  showSuggestions = signal<boolean>(false);
  
  private searchSubject = new Subject<string>();

  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    equipmentBrand: [''],
    unilateral: [false],
    targets: this.fb.array([])
  });

  get targets() {
    return this.form.get('targets') as FormArray;
  }

  ngOnInit() {
    if (this.exercise) {
      this.form.patchValue({
        name: this.exercise.name,
        equipmentBrand: this.exercise.equipmentBrand || '',
        unilateral: this.exercise.unilateral || false
      });
      
      this.exercise.targets.forEach(target => {
        const path = getBodyPartPath(target.bodyPart);
        this.targets.push(this.fb.group({
          id: [target.id],
          category: [path?.category || ''],
          group: [path?.group || ''],
          bodyPart: [target.bodyPart, Validators.required],
          targetValue: [target.targetValue, [Validators.required, Validators.min(0.1), Validators.max(1)]]
        }));
      });
    }

    // Set up autocomplete debounce
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (query.length < 2) {
          return of([]);
        }
        return this.exerciseService.searchExercises(query);
      })
    ).subscribe(results => {
      this.suggestions.set(results);
      this.showSuggestions.set(results.length > 0);
    });
  }

  onNameInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }

  selectSuggestion(exercise: Exercise) {
    this.form.patchValue({ name: exercise.name });
    this.suggestions.set([]);
    this.showSuggestions.set(false);
  }

  addTarget() {
    this.targets.push(this.fb.group({
      category: [''],
      group: [''],
      bodyPart: ['', Validators.required],
      targetValue: [1.0, [Validators.required, Validators.min(0.1), Validators.max(1)]]
    }));
  }

  getGroupsFor(category: string): string[] {
    if (!category || !this.hierarchy[category as keyof typeof this.hierarchy]) return [];
    return Object.keys(this.hierarchy[category as keyof typeof this.hierarchy]);
  }

  getPartsFor(category: string, group: string): string[] {
    if (!category || !group) return [];
    const catData = this.hierarchy[category as keyof typeof this.hierarchy];
    if (!catData) return [];
    const parts = (catData as any)[group];
    return parts ? [...parts] : [];
  }

  onCategoryChange(index: number) {
    const targetGroup = this.targets.at(index);
    targetGroup.get('group')?.setValue('');
    targetGroup.get('bodyPart')?.setValue('');
  }

  onGroupChange(index: number) {
    const targetGroup = this.targets.at(index);
    targetGroup.get('bodyPart')?.setValue('');
  }

  removeTarget(index: number) {
    this.targets.removeAt(index);
  }

  onSubmit() {
    if (this.form.valid) {
      this.saveExercise.emit(this.form.value);
    }
  }
}

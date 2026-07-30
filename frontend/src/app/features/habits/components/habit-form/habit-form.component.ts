import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Habit, HabitFrequency, HabitRequest } from '../../models/habit.model';

@Component({
  selector: 'app-habit-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-[#121212] rounded-3xl w-full max-w-md overflow-hidden solid-card border border-gray-200 dark:border-gray-800">
        <div class="p-6">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">
              {{ habit ? 'Edit Habit' : 'New Habit' }}
            </h2>
            <button type="button" (click)="cancelAction.emit()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
            <div>
              <label for="habit-title" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
              <input id="habit-title" type="text" formControlName="title" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-pos focus:outline-none text-gray-900 dark:text-white" placeholder="e.g. Read 10 pages">
            </div>
            
            <div>
              <label for="habit-description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (Optional)</label>
              <textarea id="habit-description" formControlName="description" rows="2" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-pos focus:outline-none text-gray-900 dark:text-white" placeholder="Any extra details"></textarea>
            </div>
            
            <div>
              <span id="frequency-label" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frequency</span>
              <div role="group" aria-labelledby="frequency-label" class="grid grid-cols-3 gap-2">
                <button type="button" 
                  (click)="form.patchValue({ frequency: HabitFrequency.DAILY })"
                  [class.bg-accent-pos]="form.value.frequency === HabitFrequency.DAILY"
                  [class.text-white]="form.value.frequency === HabitFrequency.DAILY"
                  [class.bg-gray-100]="form.value.frequency !== HabitFrequency.DAILY"
                  [class.dark:bg-gray-800]="form.value.frequency !== HabitFrequency.DAILY"
                  [class.text-gray-600]="form.value.frequency !== HabitFrequency.DAILY"
                  [class.dark:text-gray-400]="form.value.frequency !== HabitFrequency.DAILY"
                  class="py-2 rounded-xl text-sm font-medium transition-colors">
                  Daily
                </button>
                <button type="button" 
                  (click)="form.patchValue({ frequency: HabitFrequency.WEEKLY })"
                  [class.bg-accent-pos]="form.value.frequency === HabitFrequency.WEEKLY"
                  [class.text-white]="form.value.frequency === HabitFrequency.WEEKLY"
                  [class.bg-gray-100]="form.value.frequency !== HabitFrequency.WEEKLY"
                  [class.dark:bg-gray-800]="form.value.frequency !== HabitFrequency.WEEKLY"
                  [class.text-gray-600]="form.value.frequency !== HabitFrequency.WEEKLY"
                  [class.dark:text-gray-400]="form.value.frequency !== HabitFrequency.WEEKLY"
                  class="py-2 rounded-xl text-sm font-medium transition-colors">
                  Weekly
                </button>
                <button type="button" 
                  (click)="form.patchValue({ frequency: HabitFrequency.MONTHLY })"
                  [class.bg-accent-pos]="form.value.frequency === HabitFrequency.MONTHLY"
                  [class.text-white]="form.value.frequency === HabitFrequency.MONTHLY"
                  [class.bg-gray-100]="form.value.frequency !== HabitFrequency.MONTHLY"
                  [class.dark:bg-gray-800]="form.value.frequency !== HabitFrequency.MONTHLY"
                  [class.text-gray-600]="form.value.frequency !== HabitFrequency.MONTHLY"
                  [class.dark:text-gray-400]="form.value.frequency !== HabitFrequency.MONTHLY"
                  class="py-2 rounded-xl text-sm font-medium transition-colors">
                  Monthly
                </button>
              </div>
            </div>

            <div class="pt-4 flex gap-3">
              <button type="button" (click)="cancelAction.emit()" class="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:opacity-80 transition-opacity">
                Cancel
              </button>
              <button type="submit" [disabled]="form.invalid || isSubmitting" class="flex-1 py-3 bg-accent-pos text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
                {{ isSubmitting ? 'Saving...' : 'Save' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class HabitFormComponent {
  private fb = inject(FormBuilder);
  
  @Input() set habit(val: Habit | null) {
    this._habit = val;
    if (val) {
      this.form.patchValue(val);
    }
  }
  get habit() { return this._habit; }
  private _habit: Habit | null = null;
  
  @Output() saveAction = new EventEmitter<HabitRequest>();
  @Output() cancelAction = new EventEmitter<void>();
  
  isSubmitting = false;
  HabitFrequency = HabitFrequency;
  
  form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: [''],
    frequency: [HabitFrequency.DAILY, Validators.required]
  });

  onSubmit() {
    if (this.form.valid) {
      this.isSubmitting = true;
      this.saveAction.emit(this.form.getRawValue());
    }
  }
}

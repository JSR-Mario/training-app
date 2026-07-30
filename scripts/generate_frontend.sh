#!/bin/bash

BASE_DIR="/home/mario/training-app/frontend/src/app/features/habits"
mkdir -p "$BASE_DIR/models" "$BASE_DIR/services" "$BASE_DIR/pages/habit-list" "$BASE_DIR/components/habit-card" "$BASE_DIR/components/habit-form"

cat << 'EOF' > "$BASE_DIR/models/habit.model.ts"
export enum HabitFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY'
}

export interface Habit {
  id: string;
  title: string;
  description: string;
  frequency: HabitFrequency;
  currentStreak: number;
  longestStreak: number;
  completedDates: string[];
}

export interface HabitRequest {
  title: string;
  description: string;
  frequency: HabitFrequency;
}
EOF

cat << 'EOF' > "$BASE_DIR/services/habit.service.ts"
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Habit, HabitRequest } from '../models/habit.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HabitService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/habits`;

  getHabits(today: string): Observable<Habit[]> {
    const params = new HttpParams().set('today', today);
    return this.http.get<Habit[]>(this.apiUrl, { params });
  }

  createHabit(request: HabitRequest): Observable<Habit> {
    return this.http.post<Habit>(this.apiUrl, request);
  }

  updateHabit(id: string, request: HabitRequest): Observable<Habit> {
    return this.http.put<Habit>(`${this.apiUrl}/${id}`, request);
  }

  deleteHabit(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  toggleLog(id: string, date: string, today: string): Observable<Habit> {
    const params = new HttpParams().set('date', date).set('today', today);
    return this.http.post<Habit>(`${this.apiUrl}/${id}/logs`, null, { params });
  }
}
EOF

cat << 'EOF' > "$BASE_DIR/components/habit-card/habit-card.component.ts"
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Habit } from '../../models/habit.model';

@Component({
  selector: 'app-habit-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="solid-card p-4 flex flex-col justify-between h-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div class="flex justify-between items-start mb-4">
        <div>
          <h3 class="font-bold text-lg text-gray-900 dark:text-white">{{ habit.title }}</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 capitalize">{{ habit.frequency.toLowerCase() }}</p>
        </div>
        <div class="flex gap-2">
          <button (click)="onEdit.emit(habit)" class="p-1.5 text-gray-400 hover:text-accent-pos rounded-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button (click)="onDelete.emit(habit)" class="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      @if (habit.description) {
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-4 flex-grow">{{ habit.description }}</p>
      }

      <div class="flex justify-between items-end mt-2">
        <div class="flex gap-4">
          <div class="flex flex-col">
            <span class="text-xs text-gray-500 dark:text-gray-400">Streak</span>
            <div class="flex items-center text-accent-pos font-bold">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {{ habit.currentStreak }}
            </div>
          </div>
          <div class="flex flex-col">
            <span class="text-xs text-gray-500 dark:text-gray-400">Best</span>
            <span class="font-bold text-gray-700 dark:text-gray-300 ml-1">{{ habit.longestStreak }}</span>
          </div>
        </div>

        <button 
          (click)="onToggle.emit(habit)"
          [class.bg-accent-pos]="isCompletedToday"
          [class.text-white]="isCompletedToday"
          [class.border-accent-pos]="isCompletedToday"
          [class.bg-gray-100]="!isCompletedToday"
          [class.dark:bg-gray-700]="!isCompletedToday"
          [class.text-gray-400]="!isCompletedToday"
          [class.border-transparent]="!isCompletedToday"
          class="w-12 h-12 flex items-center justify-center rounded-2xl border-2 transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
    </div>
  `
})
export class HabitCardComponent {
  @Input({ required: true }) habit!: Habit;
  @Input({ required: true }) isCompletedToday = false;
  
  @Output() onToggle = new EventEmitter<Habit>();
  @Output() onEdit = new EventEmitter<Habit>();
  @Output() onDelete = new EventEmitter<Habit>();
}
EOF

cat << 'EOF' > "$BASE_DIR/components/habit-form/habit-form.component.ts"
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
            <button (click)="onCancel.emit()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
              <input type="text" formControlName="title" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-pos focus:outline-none dark:text-white" placeholder="e.g. Read 10 pages">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (Optional)</label>
              <textarea formControlName="description" rows="2" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-pos focus:outline-none dark:text-white" placeholder="Any extra details"></textarea>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frequency</label>
              <div class="grid grid-cols-3 gap-2">
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
              <button type="button" (click)="onCancel.emit()" class="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:opacity-80 transition-opacity">
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
  
  @Output() onSave = new EventEmitter<HabitRequest>();
  @Output() onCancel = new EventEmitter<void>();
  
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
      this.onSave.emit(this.form.getRawValue());
    }
  }
}
EOF

cat << 'EOF' > "$BASE_DIR/pages/habit-list/habit-list.component.ts"
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HabitService } from '../../services/habit.service';
import { Habit, HabitRequest } from '../../models/habit.model';
import { HabitCardComponent } from '../../components/habit-card/habit-card.component';
import { HabitFormComponent } from '../../components/habit-form/habit-form.component';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-habit-list',
  standalone: true,
  imports: [CommonModule, HabitCardComponent, HabitFormComponent],
  template: `
    <div class="max-w-5xl mx-auto space-y-6">
      <div class="flex justify-between items-end mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Habits</h1>
          <p class="text-gray-500 dark:text-gray-400">Track your daily, weekly, and monthly routines.</p>
        </div>
        <button (click)="openForm()" class="solid-btn bg-accent-pos text-white px-5 py-2.5 rounded-xl font-bold flex items-center hover:opacity-90 transition-opacity">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          New Habit
        </button>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-pos"></div>
        </div>
      } @else if (habits().length === 0) {
        <div class="text-center py-16 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-1">No habits yet</h3>
          <p class="text-gray-500 dark:text-gray-400 mb-6">Create a habit to start tracking your streak.</p>
          <button (click)="openForm()" class="text-accent-pos font-bold hover:underline">Create first habit</button>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (habit of habits(); track habit.id) {
            <app-habit-card
              [habit]="habit"
              [isCompletedToday]="isCompletedToday(habit)"
              (onToggle)="toggleHabit($event)"
              (onEdit)="openForm($event)"
              (onDelete)="deleteHabit($event)">
            </app-habit-card>
          }
        </div>
      }
    </div>

    @if (showForm()) {
      <app-habit-form
        [habit]="editingHabit()"
        (onSave)="saveHabit($event)"
        (onCancel)="closeForm()">
      </app-habit-form>
    }
  `
})
export class HabitListComponent implements OnInit {
  private habitService = inject(HabitService);
  private titleService = inject(Title);

  habits = signal<Habit[]>([]);
  loading = signal(true);
  
  showForm = signal(false);
  editingHabit = signal<Habit | null>(null);

  private getTodayString(): string {
    const d = new Date();
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();
    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
  }

  ngOnInit() {
    this.titleService.setTitle('Habits | Yes');
    this.loadHabits();
  }

  loadHabits() {
    this.loading.set(true);
    this.habitService.getHabits(this.getTodayString()).subscribe({
      next: (data) => {
        this.habits.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  isCompletedToday(habit: Habit): boolean {
    const today = this.getTodayString();
    return habit.completedDates.includes(today);
  }

  toggleHabit(habit: Habit) {
    const today = this.getTodayString();
    this.habitService.toggleLog(habit.id, today, today).subscribe({
      next: (updatedHabit) => {
        this.habits.update(list => list.map(h => h.id === habit.id ? updatedHabit : h));
      }
    });
  }

  openForm(habit?: Habit) {
    this.editingHabit.set(habit || null);
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingHabit.set(null);
  }

  saveHabit(request: HabitRequest) {
    const current = this.editingHabit();
    const saveObs = current 
      ? this.habitService.updateHabit(current.id, request)
      : this.habitService.createHabit(request);

    saveObs.subscribe({
      next: () => {
        this.loadHabits();
        this.closeForm();
      }
    });
  }

  deleteHabit(habit: Habit) {
    if (confirm(`Are you sure you want to delete '${habit.title}'?`)) {
      this.habitService.deleteHabit(habit.id).subscribe({
        next: () => {
          this.habits.update(list => list.filter(h => h.id !== habit.id));
        }
      });
    }
  }
}
EOF

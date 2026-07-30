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

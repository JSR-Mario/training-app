import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Habit } from '../../models/habit.model';
import { ActivityCalendarComponent } from '../../../dashboard/components/activity-calendar/activity-calendar.component';
import { ActivitySummary } from '../../../../core/types/training.types';

@Component({
  selector: 'app-habit-card',
  standalone: true,
  imports: [CommonModule, ActivityCalendarComponent],
  host: {
    class: 'block'
  },
  template: `
    <div class="solid-card p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all">
      <!-- Collapsed Header Row -->
      <div class="flex items-center justify-between gap-3 cursor-pointer select-none" tabindex="0" role="button" (click)="toggleExpand.emit()" (keydown.enter)="toggleExpand.emit()">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <button 
            (click)="$event.stopPropagation(); toggleAction.emit(habit)"
            [class.bg-accent-pos]="isCompletedToday"
            [class.text-white]="isCompletedToday"
            [class.border-accent-pos]="isCompletedToday"
            [class.bg-gray-100]="!isCompletedToday"
            [class.dark:bg-gray-700]="!isCompletedToday"
            [class.text-gray-400]="!isCompletedToday"
            [class.border-transparent]="!isCompletedToday"
            class="w-7 h-7 flex items-center justify-center rounded-lg border-2 transition-all duration-200 hover:scale-105 active:scale-95 shrink-0"
            [title]="isCompletedToday ? 'Completed today' : 'Mark as completed'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </button>
          
          <h3 class="font-semibold text-sm text-gray-900 dark:text-white truncate">{{ habit.title }}</h3>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <div class="flex items-center text-accent-pos font-bold text-xs bg-accent-pos/10 px-2 py-0.5 rounded-full" title="Current streak">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {{ habit.currentStreak }}
          </div>

          <button 
            (click)="$event.stopPropagation(); toggleExpand.emit()" 
            class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-transform duration-200" 
            [class.rotate-180]="isExpanded"
            aria-label="Toggle details"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Expanded Content -->
      @if (isExpanded) {
        <div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/60 space-y-3">
          @if (habit.description) {
            <p class="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{{ habit.description }}</p>
          }

          <div class="flex items-center justify-between">
            <div class="flex gap-4 text-xs">
              <div>
                <span class="text-[10px] text-gray-500 dark:text-gray-400 block">Current Streak</span>
                <span class="font-bold text-accent-pos text-xs">{{ habit.currentStreak }} days</span>
              </div>
              <div>
                <span class="text-[10px] text-gray-500 dark:text-gray-400 block">Best Streak</span>
                <span class="font-bold text-gray-700 dark:text-gray-300 text-xs">{{ habit.longestStreak }} days</span>
              </div>
            </div>

            <div class="flex gap-1">
              <button (click)="editAction.emit(habit)" class="p-1.5 text-gray-400 hover:text-accent-pos rounded-lg transition-colors" title="Edit habit">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button (click)="deleteAction.emit(habit)" class="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors" title="Delete habit">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Heatmap calendar for DAILY habits -->
          @if (habit.frequency === 'DAILY') {
            <div class="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/40">
              <app-activity-calendar [data]="calendarData" [title]="'Completion History'"></app-activity-calendar>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class HabitCardComponent implements OnChanges {
  @Input({ required: true }) habit!: Habit;
  @Input({ required: true }) isCompletedToday = false;
  @Input() isExpanded = false;
  
  @Output() toggleAction = new EventEmitter<Habit>();
  @Output() editAction = new EventEmitter<Habit>();
  @Output() deleteAction = new EventEmitter<Habit>();
  @Output() toggleExpand = new EventEmitter<void>();

  calendarData: ActivitySummary[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['habit']) {
      this.calendarData = this.buildCalendarData();
    }
  }

  private buildCalendarData(): ActivitySummary[] {
    if (!this.habit) return [];
    
    const dates: ActivitySummary[] = [];
    const completedSet = new Set(this.habit.completedDates || []);
    const today = new Date();

    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      dates.push({
        date: dateStr,
        intensity: completedSet.has(dateStr) ? 3 : 0
      });
    }
    return dates;
  }
}


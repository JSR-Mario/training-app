import { Component, Input, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivitySummary } from '../../../../core/types/training.types';

interface CalendarCell {
  date: string;
  intensity: number;
  label: string;
}

@Component({
  selector: 'app-activity-calendar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-card p-6 w-full overflow-x-auto">
      <h3 class="text-base font-medium text-gray-400 mb-4">Activity (Last 365 Days)</h3>
      
      <div class="flex">
        <!-- Day labels (Mon, Wed, Fri) -->
        <div class="flex flex-col text-xs text-gray-500 mr-2 justify-between" style="height: 112px; padding-top: 16px; padding-bottom: 16px;">
          <span style="line-height: 14px;">Mon</span>
          <span style="line-height: 14px;">Wed</span>
          <span style="line-height: 14px;">Fri</span>
        </div>

        <!-- Grid of weeks and days -->
        <div class="flex gap-1" style="height: 112px;">
          @for (week of weeks(); track $index) {
            <div class="flex flex-col gap-1">
              @for (day of week; track day?.date || $index) {
                @if (day) {
                  <div 
                    class="w-3.5 h-3.5 rounded-sm transition-colors duration-200"
                    [ngClass]="getColorClass(day.intensity)"
                    [title]="day.label">
                  </div>
                } @else {
                  <div class="w-3.5 h-3.5 rounded-sm bg-transparent"></div>
                }
              }
            </div>
          }
        </div>
      </div>
      
      <!-- Legend -->
      <div class="flex items-center justify-end mt-4 text-xs text-gray-500 space-x-2">
        <span>Less</span>
        <div class="flex gap-1">
          <div class="w-3.5 h-3.5 rounded-sm bg-gray-800/80"></div>
          <div class="w-3.5 h-3.5 rounded-sm bg-emerald-900/50"></div>
          <div class="w-3.5 h-3.5 rounded-sm bg-emerald-600/80"></div>
          <div class="w-3.5 h-3.5 rounded-sm bg-emerald-400"></div>
        </div>
        <span>More</span>
      </div>
    </div>
  `,
  styles: [`
    .glass-card {
      background: rgba(31, 41, 55, 0.4);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 1rem;
    }
    .overflow-x-auto::-webkit-scrollbar {
      height: 6px;
    }
    .overflow-x-auto::-webkit-scrollbar-track {
      background: transparent;
    }
    .overflow-x-auto::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }
  `]
})
export class ActivityCalendarComponent implements OnChanges {
  @Input() data: ActivitySummary[] = [];

  weeks = signal<(CalendarCell | null)[][]>([]);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] && this.data) {
      this.buildCalendar(this.data);
    }
  }

  private buildCalendar(data: ActivitySummary[]) {
    if (!data || data.length === 0) {
      this.weeks.set([]);
      return;
    }

    const result: (CalendarCell | null)[][] = [];
    let currentWeek: (CalendarCell | null)[] = new Array(7).fill(null);

    const parts = data[0].date.split('-');
    const firstDayOfWeek = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])).getDay();

    let dayIndex = firstDayOfWeek;

    for (const item of data) {
      const p = item.date.split('-');
      const dateObj = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
      const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      
      const label = `${dateStr}: ${item.intensity} activities`;

      currentWeek[dayIndex] = {
        date: item.date,
        intensity: item.intensity,
        label
      };

      dayIndex++;
      if (dayIndex > 6) {
        result.push(currentWeek);
        currentWeek = new Array(7).fill(null);
        dayIndex = 0;
      }
    }

    if (dayIndex > 0) {
      result.push(currentWeek);
    }

    this.weeks.set(result);
  }

  getColorClass(intensity: number): string {
    switch (intensity) {
      case 0: return 'bg-gray-800/80';
      case 1: return 'bg-emerald-900/50';
      case 2: return 'bg-emerald-600/80';
      case 3: return 'bg-emerald-400';
      default: return 'bg-gray-800/80';
    }
  }
}

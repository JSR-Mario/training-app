import { Component, Input, OnChanges, SimpleChanges, signal, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivitySummary } from '../../../../core/types/training.types';

interface CalendarCell {
  date: string;
  intensity: number;
  label: string;
}

interface MonthLabel {
  label: string;
  colIndex: number;
}

@Component({
  selector: 'app-activity-calendar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="solid-card p-6 w-full overflow-x-auto">
      <h3 class="text-base font-medium text-gray-500 dark:text-gray-400 mb-4">Activity (Last 365 Days)</h3>
      
      <div class="flex items-start w-full overflow-x-auto pb-2">
        <div class="flex min-w-max">
          <!-- Day labels (Mon, Wed, Fri) -->
          <div class="flex flex-col text-xs text-gray-500 mr-2 justify-between" style="height: 112px; padding-top: 16px; padding-bottom: 16px; margin-top: 20px;">
            <span style="line-height: 14px;">Mon</span>
            <span style="line-height: 14px;">Wed</span>
            <span style="line-height: 14px;">Fri</span>
          </div>

          <div class="flex flex-col">
            <!-- Month labels row -->
            <div class="relative w-full h-4 mb-1 text-xs text-gray-500">
              @for (month of monthLabels(); track $index) {
                <span class="absolute" [style.left.px]="month.colIndex * 18">{{ month.label }}</span>
              }
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
        </div>
      </div>
      
      <!-- Legend -->
      <div class="flex items-center justify-end mt-4 text-xs text-gray-600 dark:text-gray-400 space-x-2">
        <span>Less</span>
        <div class="flex gap-1">
          <div class="w-3.5 h-3.5 rounded-sm bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700"></div>
          <div class="w-3.5 h-3.5 rounded-sm bg-accent-pos/40"></div>
          <div class="w-3.5 h-3.5 rounded-sm bg-accent-pos/70"></div>
          <div class="w-3.5 h-3.5 rounded-sm bg-accent-pos"></div>
        </div>
        <span>More</span>
      </div>
    </div>
  `,
  styles: [`
    .solid-card {
      /* Uses global .solid-card class */
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
export class ActivityCalendarComponent implements OnChanges, OnInit {
  @Input() data: ActivitySummary[] = [];

  weeks = signal<(CalendarCell | null)[][]>([]);
  monthLabels = signal<MonthLabel[]>([]);
  isMobile = signal<boolean>(false);

  ngOnInit() {
    this.checkScreenSize();
  }

  @HostListener('window:resize')
  onResize() {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    const mobile = window.innerWidth < 768;
    if (this.isMobile() !== mobile) {
      this.isMobile.set(mobile);
      if (this.data && this.data.length > 0) {
        this.buildCalendar(this.data);
      }
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] && this.data) {
      this.buildCalendar(this.data);
    }
  }

  private buildCalendar(data: ActivitySummary[]) {
    if (!data || data.length === 0) {
      this.weeks.set([]);
      this.monthLabels.set([]);
      return;
    }

    let result: (CalendarCell | null)[][] = [];
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

    // Truncate to last 16 weeks if mobile
    if (this.isMobile() && result.length > 16) {
      result = result.slice(result.length - 16);
    }

    // Build month labels based on the final weeks array
    const labels: MonthLabel[] = [];
    let lastMonth = -1;

    result.forEach((week, index) => {
      // Find the first non-null day in this week to determine its month
      const firstDayInWeek = week.find(d => d !== null);
      if (firstDayInWeek) {
        const p = firstDayInWeek.date.split('-');
        const monthNum = parseInt(p[1]) - 1; // 0-indexed
        
        if (monthNum !== lastMonth) {
          const dateObj = new Date(parseInt(p[0]), monthNum, parseInt(p[2]));
          const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
          
          labels.push({ label: monthName, colIndex: index });
          lastMonth = monthNum;
        }
      }
    });

    this.weeks.set(result);
    this.monthLabels.set(labels);
  }

  getColorClass(intensity: number): string {
    switch (intensity) {
      case 0: return 'bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700';
      case 1: return 'bg-accent-pos/40';
      case 2: return 'bg-accent-pos/70';
      case 3: return 'bg-accent-pos';
      default: return 'bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700';
    }
  }
}

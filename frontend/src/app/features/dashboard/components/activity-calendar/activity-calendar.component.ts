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
    <div [ngClass]="embedded ? 'w-full p-2' : 'solid-card p-6 w-full'">
      @if (title) {
        <h3 class="text-base font-medium text-gray-500 dark:text-gray-400 mb-4">{{ title }}</h3>
      } @else if (!embedded) {
        <h3 class="text-base font-medium text-gray-500 dark:text-gray-400 mb-4">Activity (Last 365 Days)</h3>
      }
      
      <div 
        class="w-full overflow-x-auto pb-2 scrollbar-thin"
        (wheel)="onWheelScroll($event)"
      >
        <div class="flex items-start min-w-max">
          <!-- Day labels (Mon, Wed, Fri) sticky column -->
          <div 
            class="sticky left-0 z-10 flex flex-col text-[10px] text-gray-500 dark:text-gray-400 mr-2 shrink-0 gap-1 pt-5"
            [ngClass]="embedded ? 'bg-white dark:bg-gray-800' : 'bg-white dark:bg-[#1e1e1e]'"
          >
            <div class="h-3.5 flex items-center"></div>
            <div class="h-3.5 flex items-center justify-end pr-1">Mon</div>
            <div class="h-3.5 flex items-center"></div>
            <div class="h-3.5 flex items-center justify-end pr-1">Wed</div>
            <div class="h-3.5 flex items-center"></div>
            <div class="h-3.5 flex items-center justify-end pr-1">Fri</div>
            <div class="h-3.5 flex items-center"></div>
          </div>

          <div class="flex flex-col min-w-max">
            <!-- Month labels row -->
            <div class="relative w-full h-4 mb-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
              @for (month of monthLabels(); track $index) {
                <span class="absolute whitespace-nowrap" [style.left.px]="month.colIndex * 18">{{ month.label }}</span>
              }
            </div>

            <!-- Grid of weeks and days -->
            <div class="flex gap-1">
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
      <div class="flex items-center justify-end mt-3 text-xs text-gray-600 dark:text-gray-400 space-x-2">
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
    .scrollbar-thin::-webkit-scrollbar {
      height: 6px;
    }
    .scrollbar-thin::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.05);
      border-radius: 4px;
    }
    .dark .scrollbar-thin::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
    }
    .scrollbar-thin::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 4px;
    }
    .dark .scrollbar-thin::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
    }
    .scrollbar-thin::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.35);
    }
    .dark .scrollbar-thin::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.35);
    }
    .scrollbar-thin {
      scrollbar-width: thin;
      scrollbar-color: rgba(150, 150, 150, 0.4) transparent;
    }
  `]
})
export class ActivityCalendarComponent implements OnChanges, OnInit {
  @Input() data: ActivitySummary[] = [];
  @Input() title?: string;
  @Input() embedded = false;

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

  onWheelScroll(event: WheelEvent) {
    if (event.deltaY !== 0 && Math.abs(event.deltaX) < Math.abs(event.deltaY)) {
      const element = event.currentTarget as HTMLElement;
      element.scrollLeft += event.deltaY;
      event.preventDefault();
    }
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

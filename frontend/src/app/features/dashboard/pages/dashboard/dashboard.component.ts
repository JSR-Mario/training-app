import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProgressChartComponent } from '../../../analytics/components/progress-chart/progress-chart.component';
import { ActivityCalendarComponent } from '../../components/activity-calendar/activity-calendar.component';
import { DashboardService, DashboardSummaryResponse } from '../../services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ProgressChartComponent, ActivityCalendarComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-semibold text-black dark:text-white">Dashboard</h2>
      </div>
      
      <!-- Activity Calendar -->
      <div class="w-full mb-6 mt-4">
        @if (!isLoading() && summary()?.activityCalendar) {
          <app-activity-calendar [data]="summary()!.activityCalendar"></app-activity-calendar>
        } @else {
          <div class="solid-card p-6 w-full h-48 animate-pulse flex items-center justify-center">
            <span class="text-gray-500">Loading calendar...</span>
          </div>
        }
      </div>

      <!-- 4 Stat Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start mb-6">
        
        <!-- Streak Card -->
        <div class="solid-card p-6 flex flex-col justify-between col-span-1">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-medium text-gray-500 dark:text-gray-400">Activity Streak</h3>
            <div class="w-8 h-8 rounded-lg bg-accent-pos/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-accent-pos" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.66667 8 4 9 4 14C4 18.4183 7.58172 22 12 22C16.4183 22 20 18.4183 20 14C20 9 15.3333 8 12 2Z"/>
              </svg>
            </div>
          </div>
          <div>
            @if (isLoading()) {
              <div class="h-8 w-16 bg-gray-300 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
              <div class="h-4 w-32 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
            } @else {
              <p class="text-5xl font-bold text-black dark:text-white mb-4 mt-2">{{ summary()?.streak?.currentStreak || 0 }} <span class="text-xl text-gray-500 dark:text-gray-400 font-normal">days</span></p>
              <div class="flex items-center text-sm">
                <span class="text-gray-500 dark:text-gray-400">Best: {{ summary()?.streak?.longestStreak || 0 }} days</span>
              </div>
            }
          </div>
        </div>

        <!-- Weights Sessions This Week -->
        <div 
          class="solid-card p-6 flex flex-col justify-between col-span-1 hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer transition-colors"
          (click)="goToRoute('/workout')"
          (keyup.enter)="goToRoute('/workout')"
          tabindex="0"
          role="button"
          title="Go to Workout Sessions"
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-medium text-gray-500 dark:text-gray-400">Weights (Week)</h3>
            <div class="w-8 h-8 rounded-lg bg-accent-pos/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-accent-pos" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
          </div>
          <div>
            @if (isLoading()) {
              <div class="h-8 w-16 bg-gray-300 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
              <div class="h-4 w-32 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
            } @else {
              <p class="text-5xl font-bold text-black dark:text-white mb-4 mt-2">{{ (summary()?.weights?.volumeThisWeekKg || 0) | number:'1.0-0' }} <span class="text-xl text-gray-500 dark:text-gray-400 font-normal">kg</span></p>
              <div class="flex items-center text-sm">
                @if ((summary()?.weights?.volumePercentageChange || 0) >= 0) {
                  <span class="text-accent-pos flex items-center bg-accent-pos/10 px-1.5 py-0.5 rounded text-xs font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    {{ summary()?.weights?.volumePercentageChange | number:'1.0-1' }}%
                  </span>
                } @else {
                  <span class="text-accent-neg flex items-center bg-accent-neg/10 px-1.5 py-0.5 rounded text-xs font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    {{ math.abs(summary()?.weights?.volumePercentageChange || 0) | number:'1.0-1' }}%
                  </span>
                }
              </div>
            }
          </div>
        </div>

        <!-- Cardio Sessions This Week -->
        <div 
          class="solid-card p-6 flex flex-col justify-between col-span-1 hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer transition-colors"
          (click)="goToRoute('/cardio')"
          (keyup.enter)="goToRoute('/cardio')"
          tabindex="0"
          role="button"
          title="Go to Cardio"
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-medium text-gray-500 dark:text-gray-400">Cardio (Week)</h3>
            <div class="w-8 h-8 rounded-lg bg-accent-pos/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-accent-pos" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div>
            @if (isLoading()) {
              <div class="h-8 w-16 bg-gray-300 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
              <div class="h-4 w-32 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
            } @else {
              <p class="text-5xl font-bold text-black dark:text-white mb-4 mt-2">{{ summary()?.cardio?.minutesThisWeek || 0 }} <span class="text-xl text-gray-500 dark:text-gray-400 font-normal">min</span></p>
              <div class="flex items-center text-sm">
                @if ((summary()?.cardio?.minutesPercentageChange || 0) >= 0) {
                  <span class="text-accent-pos flex items-center bg-accent-pos/10 px-1.5 py-0.5 rounded text-xs font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    {{ summary()?.cardio?.minutesPercentageChange | number:'1.0-1' }}%
                  </span>
                } @else {
                  <span class="text-accent-neg flex items-center bg-accent-neg/10 px-1.5 py-0.5 rounded text-xs font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    {{ math.abs(summary()?.cardio?.minutesPercentageChange || 0) | number:'1.0-1' }}%
                  </span>
                }
              </div>
            }
          </div>
        </div>

        <!-- Body Weight This Week -->
        <div 
          class="solid-card p-6 flex flex-col justify-between col-span-1 hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer transition-colors"
          (click)="goToRoute('/body-weight')"
          (keyup.enter)="goToRoute('/body-weight')"
          tabindex="0"
          role="button"
          title="Go to Body Weight"
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">Body Weight <span class="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{{ summary()?.bodyWeight?.timeframeLabel || 'Since start' }}</span></h3>
            <div class="w-8 h-8 rounded-lg bg-accent-pos/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-accent-pos" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
          </div>
          <div>
            @if (isLoading()) {
              <div class="h-8 w-16 bg-gray-300 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
              <div class="h-4 w-32 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
            } @else {
              <p class="text-5xl font-bold text-black dark:text-white mb-4 mt-2">{{ (summary()?.bodyWeight?.currentWeightKg || 0) | number:'1.0-1' }} <span class="text-xl text-gray-500 dark:text-gray-400 font-normal">kg</span></p>
              <div class="flex items-center text-sm">
                @if (bodyWeightChangeStatus() === 'NEUTRAL') {
                  <span class="text-gray-500 dark:text-gray-400 flex items-center bg-gray-200 dark:bg-gray-700/50 px-1.5 py-0.5 rounded text-xs font-medium">
                    @if ((summary()?.bodyWeight?.percentageChange || 0) === 0) {
                      No change
                    } @else {
                      {{ (summary()?.bodyWeight?.percentageChange || 0) > 0 ? '+' : '-' }}{{ math.abs(summary()?.bodyWeight?.absoluteChangeKg || 0) | number:'1.0-1' }}kg ({{ math.abs(summary()?.bodyWeight?.percentageChange || 0) | number:'1.0-1' }}%)
                    }
                  </span>
                } @else if (bodyWeightChangeStatus() === 'GREEN') {
                  <span class="text-accent-pos flex items-center bg-accent-pos/10 px-1.5 py-0.5 rounded text-xs font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      @if ((summary()?.bodyWeight?.percentageChange || 0) > 0) {
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      } @else {
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      }
                    </svg>
                    {{ (summary()?.bodyWeight?.percentageChange || 0) > 0 ? '+' : '-' }}{{ math.abs(summary()?.bodyWeight?.absoluteChangeKg || 0) | number:'1.0-1' }}kg ({{ math.abs(summary()?.bodyWeight?.percentageChange || 0) | number:'1.0-1' }}%)
                  </span>
                } @else {
                  <span class="text-accent-neg flex items-center bg-accent-neg/10 px-1.5 py-0.5 rounded text-xs font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      @if ((summary()?.bodyWeight?.percentageChange || 0) > 0) {
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      } @else {
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      }
                    </svg>
                    {{ (summary()?.bodyWeight?.percentageChange || 0) > 0 ? '+' : '-' }}{{ math.abs(summary()?.bodyWeight?.absoluteChangeKg || 0) | number:'1.0-1' }}kg ({{ math.abs(summary()?.bodyWeight?.percentageChange || 0) | number:'1.0-1' }}%)
                  </span>
                }
              </div>
            }
          </div>
        </div>

      </div>

      <!-- Volume Progress Mini Chart Card -->
      <div class="w-full">
        <div 
          class="solid-card hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer transition-colors p-4 flex flex-col h-64"
          (click)="goToAnalytics()"
          (keyup.enter)="goToAnalytics()"
          tabindex="0"
          role="button"
          title="Go to detailed Analytics"
        >
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-base font-medium text-gray-500 dark:text-gray-400">Volume Progress</h3>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div class="pointer-events-none mt-2 flex-1 flex flex-col justify-center h-full min-h-0">
            <app-progress-chart [miniMode]="true" class="w-full h-full block"></app-progress-chart>
          </div>
        </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  private dashboardService = inject(DashboardService);

  summary = signal<DashboardSummaryResponse | null>(null);
  isLoading = signal(true);
  math = Math;

  bodyWeightChangeStatus = computed(() => {
    const sum = this.summary();
    if (!sum || !sum.bodyWeight) return 'NEUTRAL';
    const pct = sum.bodyWeight.percentageChange || 0;
    const absPct = Math.abs(pct);
    if (absPct < 0.5) return 'NEUTRAL';

    const goal = sum.activeGoal || 'MAINTENANCE';
    if (goal === 'MAINTENANCE') {
      return absPct > 2 ? 'RED' : 'NEUTRAL';
    } else if (goal === 'BULK') {
      return pct > 0 ? 'GREEN' : 'RED';
    } else if (goal === 'CUT') {
      return pct < 0 ? 'GREEN' : 'RED';
    }
    return 'NEUTRAL';
  });

  ngOnInit() {
    this.dashboardService.getSummary().subscribe({
      next: (res) => {
        this.summary.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load dashboard summary', err);
        this.isLoading.set(false);
      }
    });
  }

  goToAnalytics() {
    this.router.navigate(['/analytics']);
  }

  goToRoute(route: string) {
    this.router.navigate([route]);
  }
}

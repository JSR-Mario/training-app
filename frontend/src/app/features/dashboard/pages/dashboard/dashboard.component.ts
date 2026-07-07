import { Component, OnInit, inject, signal } from '@angular/core';
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
        <h2 class="text-2xl font-semibold text-white">Dashboard</h2>
      </div>
      
      <!-- CSS Grid for cards -->
      <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        <!-- Activity Calendar -->
        <div class="md:col-span-12">
          @if (!isLoading() && summary()?.activityCalendar) {
            <app-activity-calendar [data]="summary()!.activityCalendar"></app-activity-calendar>
          } @else {
            <div class="glass-card p-6 w-full h-48 animate-pulse flex items-center justify-center">
              <span class="text-gray-500">Loading calendar...</span>
            </div>
          }
        </div>

        <!-- Weights Sessions This Week -->
        <div 
          class="glass-card p-6 flex flex-col justify-between md:col-span-6 lg:col-span-3 hover:bg-gray-800/80 cursor-pointer transition-colors"
          (click)="goToRoute('/workout')"
          (keyup.enter)="goToRoute('/workout')"
          tabindex="0"
          role="button"
          title="Go to Workout Sessions"
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-medium text-gray-400">Weight Sessions (This Week)</h3>
            <div class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
          </div>
          <div>
            @if (isLoading()) {
              <div class="h-8 w-16 bg-gray-700 rounded animate-pulse mb-2"></div>
              <div class="h-4 w-32 bg-gray-700 rounded animate-pulse"></div>
            } @else {
              <p class="text-5xl font-bold text-white mb-4 mt-2">{{ summary()?.weights?.sessionsThisWeek || 0 }}</p>
              <div class="flex items-center text-sm">
                <span class="mr-2 text-gray-300">Vol: {{ (summary()?.weights?.volumeThisWeekKg || 0) | number:'1.0-0' }} kg</span>
                @if ((summary()?.weights?.volumePercentageChange || 0) >= 0) {
                  <span class="text-emerald-400 flex items-center bg-emerald-400/10 px-1.5 py-0.5 rounded text-xs font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    {{ summary()?.weights?.volumePercentageChange | number:'1.0-1' }}%
                  </span>
                } @else {
                  <span class="text-red-400 flex items-center bg-red-400/10 px-1.5 py-0.5 rounded text-xs font-medium">
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
          class="glass-card p-6 flex flex-col justify-between md:col-span-6 lg:col-span-3 hover:bg-gray-800/80 cursor-pointer transition-colors"
          (click)="goToRoute('/cardio')"
          (keyup.enter)="goToRoute('/cardio')"
          tabindex="0"
          role="button"
          title="Go to Cardio"
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-medium text-gray-400">Cardio Sessions (This Week)</h3>
            <div class="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div>
            @if (isLoading()) {
              <div class="h-8 w-16 bg-gray-700 rounded animate-pulse mb-2"></div>
              <div class="h-4 w-32 bg-gray-700 rounded animate-pulse"></div>
            } @else {
              <p class="text-5xl font-bold text-white mb-4 mt-2">{{ summary()?.cardio?.sessionsThisWeek || 0 }}</p>
              <div class="flex items-center text-sm">
                <span class="mr-2 text-gray-300">{{ summary()?.cardio?.minutesThisWeek || 0 }} min</span>
                @if ((summary()?.cardio?.minutesPercentageChange || 0) >= 0) {
                  <span class="text-emerald-400 flex items-center bg-emerald-400/10 px-1.5 py-0.5 rounded text-xs font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    {{ summary()?.cardio?.minutesPercentageChange | number:'1.0-1' }}%
                  </span>
                } @else {
                  <span class="text-red-400 flex items-center bg-red-400/10 px-1.5 py-0.5 rounded text-xs font-medium">
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
          class="glass-card p-6 flex flex-col justify-between md:col-span-6 lg:col-span-3 hover:bg-gray-800/80 cursor-pointer transition-colors"
          (click)="goToRoute('/body-weight')"
          (keyup.enter)="goToRoute('/body-weight')"
          tabindex="0"
          role="button"
          title="Go to Body Weight"
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-medium text-gray-400">Body Weight (Avg)</h3>
            <div class="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
          </div>
          <div>
            @if (isLoading()) {
              <div class="h-8 w-16 bg-gray-700 rounded animate-pulse mb-2"></div>
              <div class="h-4 w-32 bg-gray-700 rounded animate-pulse"></div>
            } @else {
              <p class="text-5xl font-bold text-white mb-4 mt-2">{{ (summary()?.bodyWeight?.currentWeekAvgKg || 0) | number:'1.0-1' }} <span class="text-xl text-gray-400 font-normal">kg</span></p>
              <div class="flex items-center text-sm">
                @if ((summary()?.bodyWeight?.percentageChange || 0) === 0) {
                  <span class="text-gray-400 flex items-center bg-gray-700/50 px-1.5 py-0.5 rounded text-xs font-medium">
                    No change
                  </span>
                } @else if ((summary()?.bodyWeight?.percentageChange || 0) < 0) {
                  <span class="text-emerald-400 flex items-center bg-emerald-400/10 px-1.5 py-0.5 rounded text-xs font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    {{ math.abs(summary()?.bodyWeight?.absoluteChangeKg || 0) | number:'1.0-1' }}kg ({{ math.abs(summary()?.bodyWeight?.percentageChange || 0) | number:'1.0-1' }}%)
                  </span>
                } @else {
                  <span class="text-red-400 flex items-center bg-red-400/10 px-1.5 py-0.5 rounded text-xs font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    +{{ math.abs(summary()?.bodyWeight?.absoluteChangeKg || 0) | number:'1.0-1' }}kg ({{ summary()?.bodyWeight?.percentageChange | number:'1.0-1' }}%)
                  </span>
                }
              </div>
            }
          </div>
        </div>
        <!-- Volume Progress Mini Chart Card -->
        <div 
          class="glass-card hover:bg-gray-800/80 cursor-pointer transition-colors p-4 md:col-span-12 flex flex-col h-40"
          (click)="goToAnalytics()"
          (keyup.enter)="goToAnalytics()"
          tabindex="0"
          role="button"
          title="Go to detailed Analytics"
        >
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-base font-medium text-gray-400">Volume Progress</h3>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div class="pointer-events-none mt-2 flex-1 flex flex-col justify-center h-full min-h-0">
            <app-progress-chart [miniMode]="true" class="w-full h-full block"></app-progress-chart>
          </div>
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

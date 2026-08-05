import { Injectable, inject, signal, computed } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';

export type TutorialSection = 'dashboard' | 'workout' | 'body-weight' | 'cardio' | 'analytics';

export interface TutorialStep {
  targetId: string;
  title: string;
  description: string;
  section: TutorialSection;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const SKIP_KEY = 'tutorial_all_skipped';
const sectionKey = (s: TutorialSection) => `tutorial_${s}_seen`;

@Injectable({ providedIn: 'root' })
export class TutorialService {
  private authService = inject(AuthService);
  private router = inject(Router);

  private stepQueue = signal<TutorialStep[]>([]);

  activeStep = computed(() => this.stepQueue()[0] ?? null);
  hasNextStep = computed(() => this.stepQueue().length > 1);
  isDemoUser = computed(() => this.authService.isDemoUser);

  constructor() {
    this.router.events.pipe(
      filter(e => e instanceof NavigationStart)
    ).subscribe(() => {
      this.stepQueue.set([]);
    });
  }

  private getUserKey(key: string): string {
    const user = this.authService.username || 'default';
    return `${key}_${user}`;
  }

  private isSkipped(): boolean {
    return localStorage.getItem(this.getUserKey(SKIP_KEY)) === 'true' || sessionStorage.getItem(SKIP_KEY) === 'true';
  }

  isSeen(section: TutorialSection): boolean {
    return this.isSkipped() || localStorage.getItem(this.getUserKey(sectionKey(section))) === 'true' || sessionStorage.getItem(sectionKey(section)) === 'true';
  }

  private markSeen(section: TutorialSection): void {
    localStorage.setItem(this.getUserKey(sectionKey(section)), 'true');
  }

  skipAll(): void {
    localStorage.setItem(this.getUserKey(SKIP_KEY), 'true');
    this.stepQueue.set([]);
  }

  nextStep(): void {
    this.stepQueue.update(q => q.slice(1));
  }

  triggerDashboardTutorial(): void {
    if (this.isSeen('dashboard')) return;
    this.markSeen('dashboard');
    this.stepQueue.set([
      {
        targetId: 'tutorial-hamburger-toggle',
        title: 'Navigation Menu',
        description: 'Toggle the sidebar menu anytime to navigate between app features.',
        section: 'dashboard',
        position: 'bottom'
      },
      {
        targetId: 'tutorial-nav-dashboard',
        title: 'Dashboard',
        description: 'Your home base for summary stats, XP level progress, and daily activity calendar.',
        section: 'dashboard',
        position: 'right'
      },
      {
        targetId: 'tutorial-nav-workout',
        title: 'Workout',
        description: 'Log training sessions, track active sets, and record exercise reps and weights.',
        section: 'dashboard',
        position: 'right'
      },
      {
        targetId: 'tutorial-nav-body-weight',
        title: 'Body Weight',
        description: 'Track your daily body weight entries and monitor weight trends over time.',
        section: 'dashboard',
        position: 'right'
      },
      {
        targetId: 'tutorial-nav-cardio',
        title: 'Cardio',
        description: 'Record cardio activities like running, cycling, or swimming with duration and distance.',
        section: 'dashboard',
        position: 'right'
      },
      {
        targetId: 'tutorial-nav-programs',
        title: 'Programs',
        description: 'Design custom training programs with weekly schedules and daily templates.',
        section: 'dashboard',
        position: 'right'
      },
      {
        targetId: 'tutorial-nav-exercises',
        title: 'Exercises',
        description: 'Browse and manage your exercise library, target muscle groups, and view personal records.',
        section: 'dashboard',
        position: 'right'
      },
      {
        targetId: 'tutorial-nav-analytics',
        title: 'Analytics',
        description: 'Analyze muscle volume distribution and progression charts across exercises.',
        section: 'dashboard',
        position: 'right'
      },
      {
        targetId: 'tutorial-nav-habits',
        title: 'Habits',
        description: 'Build daily routines, check off completed habits, and maintain consistency streaks.',
        section: 'dashboard',
        position: 'right'
      },
      {
        targetId: 'tutorial-user-profile',
        title: 'Level, XP & Preferences',
        description: 'View your current level progress bar, customize theme mode and accent colors, or sign out.',
        section: 'dashboard',
        position: 'bottom'
      },
      {
        targetId: 'tutorial-activity-calendar',
        title: 'Activity Heatmap',
        description: 'Each square represents a day. Color intensity shows your logged activity level in real time.',
        section: 'dashboard',
        position: 'bottom'
      }
    ]);
  }

  triggerSectionTutorial(step: TutorialStep): void {
    if (this.isSeen(step.section)) return;
    this.markSeen(step.section);
    this.stepQueue.set([step]);
  }
}


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

  private isSkipped(): boolean {
    return sessionStorage.getItem(SKIP_KEY) === 'true';
  }

  isSeen(section: TutorialSection): boolean {
    return this.isSkipped() || sessionStorage.getItem(sectionKey(section)) === 'true';
  }

  private markSeen(section: TutorialSection): void {
    sessionStorage.setItem(sectionKey(section), 'true');
  }

  skipAll(): void {
    sessionStorage.setItem(SKIP_KEY, 'true');
    this.stepQueue.set([]);
  }

  nextStep(): void {
    this.stepQueue.update(q => q.slice(1));
  }

  triggerDashboardTutorial(): void {
    if (!this.isDemoUser() || this.isSeen('dashboard')) return;
    this.markSeen('dashboard');
    this.stepQueue.set([
      {
        targetId: 'tutorial-activity-calendar',
        title: 'Activity Heatmap',
        description:
          'Each square is a day. The brighter it glows, the more activity you logged ' +
          '(workouts, cardio, habits). It updates in real time.',
        section: 'dashboard',
        position: 'bottom'
      },
      {
        targetId: 'tutorial-user-profile',
        title: 'Level & XP',
        description:
          'Every logged workout, cardio session, or habit earns XP. Accumulate enough ' +
          'to level up. Open this menu to see your progress bar.',
        section: 'dashboard',
        position: 'bottom'
      }
    ]);
  }

  triggerSectionTutorial(step: TutorialStep): void {
    if (!this.isDemoUser() || this.isSeen(step.section)) return;
    this.markSeen(step.section);
    this.stepQueue.set([step]);
  }
}

import {
  Component, inject, signal, computed, effect, HostListener, ChangeDetectorRef, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TutorialService } from '../../../core/services/tutorial.service';

@Component({
  selector: 'app-coach-mark',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (tutorialService.activeStep(); as step) {
      <div
        id="coach-mark-overlay"
        class="fixed inset-0 z-[998] pointer-events-none"
        aria-hidden="true"
      ></div>

      @if (targetRect()) {
        <div
          class="fixed pointer-events-none z-[999] rounded-lg transition-all duration-150"
          [style.top.px]="targetRect()!.top - 6"
          [style.left.px]="targetRect()!.left - 6"
          [style.width.px]="targetRect()!.width + 12"
          [style.height.px]="targetRect()!.height + 12"
          style="box-shadow: 0 0 0 9999px rgba(0,0,0,0.60); border: 2px solid var(--color-accent-pos, #3b82f6);"
        ></div>

        <div
          role="dialog"
          aria-live="polite"
          class="fixed z-[1000] pointer-events-auto w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-4 space-y-2 transition-all duration-150"
          [style]="tooltipStyle()"
        >
          <p class="text-xs font-bold text-accent-pos uppercase tracking-wider">Demo Tour</p>
          <h3 class="font-bold text-gray-900 dark:text-white text-sm">{{ step.title }}</h3>
          <p class="text-gray-600 dark:text-gray-400 text-xs leading-relaxed">{{ step.description }}</p>

          <div class="flex items-center justify-between pt-2">
            <button
              id="coach-mark-skip"
              type="button"
              (click)="tutorialService.skipAll()"
              class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors underline"
            >
              Skip tour
            </button>
            <button
              id="coach-mark-next"
              type="button"
              (click)="tutorialService.nextStep()"
              class="px-4 py-1.5 bg-accent-pos text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              {{ tutorialService.hasNextStep() ? 'Next' : 'Got it' }}
            </button>
          </div>
        </div>
      }
    }
  `
})
export class CoachMarkComponent implements OnDestroy {
  tutorialService = inject(TutorialService);
  private cdr = inject(ChangeDetectorRef);

  targetRect = signal<DOMRect | null>(null);
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  tooltipStyle = computed(() => {
    const rect = this.targetRect();
    const step = this.tutorialService.activeStep();
    if (!rect || !step) return '';

    const TOOLTIP_W = 288;
    const TOOLTIP_H = 170;
    const PAD = 12;

    let top: number;
    let left: number;

    switch (step.position) {
      case 'top':
        top = rect.top - TOOLTIP_H - PAD;
        left = rect.left;
        break;
      case 'left':
        top = rect.top;
        left = rect.left - TOOLTIP_W - PAD;
        break;
      case 'right':
        top = rect.top;
        left = rect.right + PAD;
        break;
      default:
        top = rect.bottom + PAD;
        left = rect.left;
    }

    top = Math.max(8, Math.min(top, window.innerHeight - TOOLTIP_H - 8));
    left = Math.max(8, Math.min(left, window.innerWidth - TOOLTIP_W - 8));

    return `top:${top}px; left:${left}px;`;
  });

  constructor() {
    effect(() => {
      const step = this.tutorialService.activeStep();
      this.clearPollTimer();

      if (!step) {
        this.targetRect.set(null);
        return;
      }

      let attempts = 0;
      const maxAttempts = 15;
      const poll = () => {
        const el = document.getElementById(step.targetId);
        if (el) {
          this.targetRect.set(el.getBoundingClientRect());
          this.cdr.markForCheck();
          this.clearPollTimer();
        } else {
          attempts++;
          if (attempts >= maxAttempts) {
            this.clearPollTimer();
          }
        }
      };

      poll();
      if (!this.targetRect()) {
        this.pollTimer = setInterval(poll, 100);
      }
    });
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  updateTargetRect() {
    const step = this.tutorialService.activeStep();
    if (!step) return;
    const el = document.getElementById(step.targetId);
    if (el) {
      this.targetRect.set(el.getBoundingClientRect());
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy() {
    this.clearPollTimer();
  }

  private clearPollTimer() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}

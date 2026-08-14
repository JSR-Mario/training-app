import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { WorkoutService } from '../../services/workout.service';
import { ProgramService } from '../../../programs/services/program.service';
import { TrainingProgram, WorkoutSessionResponse, DayTemplate } from '../../../../core/types/training.types';
import { switchMap, of } from 'rxjs';
import { TutorialService } from '../../../../core/services/tutorial.service';

@Component({
  standalone: true,
  selector: 'app-workout-dashboard',
  imports: [CommonModule, RouterModule, DragDropModule],
  template: `
  <div class="max-w-7xl mx-auto space-y-6 pb-24">
  
    <!-- Header Removed by User Request -->
  
    <!-- Loading State -->
    @if (isLoading()) {
      <div class="text-center py-12">
        <div class="animate-pulse flex flex-col items-center">
          <div class="h-8 w-8 bg-accent-pos rounded-full mb-4"></div>
          <p class="text-gray-500 dark:text-gray-400">Loading your workout data...</p>
        </div>
      </div>
    }
  
    @if (!isLoading()) {
      <!-- No Active Program -->
      @if (!activeProgram()) {
        <div class="text-center py-16 solid-card border border-dashed border-gray-300 dark:border-gray-700">
          <div class="w-16 h-16 bg-accent-pos/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-accent-pos" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 class="text-xl font-bold text-black dark:text-white mb-2">No active program</h3>
          <p class="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
            To start logging workout sessions, you need an active program. Create a new program or import a public template.
          </p>
          <a routerLink="/programs" class="px-6 py-2.5 bg-accent-pos hover:opacity-80 text-white font-semibold rounded-xl transition-all inline-block solid-btn">
            Go to Programs
          </a>

          <!-- Quick Start Steps -->
          <div class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 max-w-lg mx-auto">
            <p class="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold mb-4">Quick start guide</p>
            <div class="space-y-3 text-left">
              <div class="flex items-start gap-4">
                <span class="w-7 h-7 rounded-full bg-accent-pos/20 text-accent-pos text-sm font-bold flex items-center justify-center shrink-0">1</span>
                <p class="text-sm text-gray-500 dark:text-gray-400">Go to <span class="text-black dark:text-white font-medium">Programs</span> and create a new program (or copy a public template).</p>
              </div>
              <div class="flex items-start gap-4">
                <span class="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-500 text-sm font-bold flex items-center justify-center shrink-0">2</span>
                <p class="text-sm text-gray-500 dark:text-gray-400">Add <span class="text-black dark:text-white font-medium">training days</span> and assign exercises to each day.</p>
              </div>
              <div class="flex items-start gap-4">
                <span class="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-500 text-sm font-bold flex items-center justify-center shrink-0">3</span>
                <p class="text-sm text-gray-500 dark:text-gray-400">Return here and click <span class="text-black dark:text-white font-medium">Start Session</span> on your scheduled day.</p>
              </div>
            </div>
          </div>
        </div>
      }
      
      <!-- Active Program Dashboard -->
      @if (activeProgram(); as program) {
        <div class="solid-card p-6 flex flex-col sm:flex-row justify-between items-center border border-gray-300 dark:border-gray-700 mb-6">
          <div class="mb-4 sm:mb-0 text-center sm:text-left">
            <h2 class="text-2xl font-bold text-black dark:text-white">{{ program.name }}</h2>
            <p class="text-gray-500 dark:text-gray-400">Duration: {{ program.durationWeeks }} weeks</p>
          </div>
          
          <div class="flex items-center gap-4">
            <button 
              (click)="prevWeek()" 
              [disabled]="displayedWeek() <= 1"
              class="w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700 hover:text-black dark:hover:text-white disabled:opacity-50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
            </button>
            
            <div class="text-center">
              <p class="text-xl font-bold text-black dark:text-white w-24">Week {{ displayedWeek() }}</p>
              @if (displayedWeek() === program.currentWeek) {
                <span class="text-xs text-accent-pos font-medium tracking-wider uppercase">Current</span>
              } @else if (displayedWeek() < program.currentWeek) {
                <span class="text-xs text-gray-500 font-medium tracking-wider uppercase">Past</span>
              } @else {
                <span class="text-xs text-black dark:text-white font-medium tracking-wider uppercase">Upcoming</span>
              }
            </div>
            
            <button 
              (click)="nextWeek()" 
              [disabled]="displayedWeek() >= program.durationWeeks"
              class="w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700 hover:text-black dark:hover:text-white disabled:opacity-50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>
            </button>
          </div>
          
          <div class="mt-4 sm:mt-0 flex flex-wrap gap-2 justify-center sm:justify-end">
            <button 
              (click)="toggleReorderMode()"
              class="px-4 py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-all solid-btn"
            >
              {{ reorderModeActive() ? 'Done Reordering' : 'Reorder Days' }}
            </button>
            @if (displayedWeek() === program.currentWeek) {
              <button 
                (click)="finishWeek()"
                class="px-6 py-2 bg-accent-pos hover:opacity-80 text-white font-semibold rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95 solid-btn"
              >
                {{ displayedWeek() === program.durationWeeks ? 'Finish Program' : 'Finish Week' }}
              </button>
            }
          </div>
        </div>
 
        <!-- Days Grid -->
        <div id="tutorial-workout-days" class="space-y-4" cdkDropList [cdkDropListDisabled]="!reorderModeActive()" (cdkDropListDropped)="dropDay($event)">
          @for (day of combinedDays(); track day.template.id; let i = $index) {
            <div cdkDrag [id]="'day-' + day.template.id" class="solid-card p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:border-gray-400 dark:hover:border-gray-600 transition-colors border border-gray-300 dark:border-gray-700">
              <div class="mb-4 sm:mb-0 flex-1 w-full">
                <div class="flex items-center justify-between w-full mb-1">
                  <div class="flex items-center gap-3">
                    @if (reorderModeActive()) {
                      <div class="flex flex-col gap-1 mr-2">
                        <div cdkDragHandle class="text-gray-400 hover:text-accent-pos cursor-grab active:cursor-grabbing p-2" title="Drag to reorder">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                          </svg>
                        </div>
                      </div>
                    }
                    <h3 class="text-xl font-bold text-black dark:text-white">{{ day.template.name }}</h3>
                  </div>
                  <div class="flex items-center gap-3">
                  
                  @if (!day.session?.completedAt) {
                    @if (day.session) {
                      <span class="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 text-xs rounded border border-gray-300 dark:border-gray-600 font-bold">In Progress</span>
                    } @else {
                      <span class="px-2 py-0.5 bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs rounded border border-gray-200 dark:border-gray-700 font-bold">Not Started</span>
                    }
                  }
                  </div>
                </div>
                @if (day.session?.performedOn) {
                  <p class="text-gray-500 dark:text-gray-400 text-sm">Performed on: {{ day.session?.performedOn | date:'mediumDate' }}</p>
                }
              </div>
              
              <div class="flex gap-3 w-full sm:w-auto">
                @if (day.session) {
                  <button
                    (click)="deleteSession(day.session.id)"
                    class="px-4 py-2 text-accent-neg hover:opacity-80 transition-colors text-sm font-medium w-full sm:w-auto"
                    >
                    Delete
                  </button>
                  <a
                    [routerLink]="['/workout', day.session.id]"
                    class="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-black dark:text-white rounded-lg transition-colors text-sm font-medium w-full sm:w-auto text-center solid-btn"
                    >
                    {{ day.session.completedAt ? 'View Summary' : 'Resume Workout' }}
                  </a>
                } @else {
                  <button
                    (click)="startDaySession(day.template.id)"
                    class="px-6 py-2 bg-accent-pos hover:opacity-80 text-white rounded-xl transition-colors font-medium w-full sm:w-auto text-center solid-btn"
                    >
                    Start Session
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }
    }
  
    <!-- Program Completed Rating Celebration Modal -->
    @if (finishedProgramForRating(); as finishedProg) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div class="solid-card rounded-2xl w-full max-w-md p-6 shadow-2xl relative border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div class="text-center mb-6">
            <div class="w-14 h-14 rounded-full bg-accent-pos/15 text-accent-pos flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
              ✓
            </div>
            <h2 class="text-2xl font-bold text-black dark:text-white">Program Completed!</h2>
            <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
              Congratulations! You completed all {{ finishedProg.durationWeeks }} weeks of <span class="font-semibold text-black dark:text-white">{{ finishedProg.name }}</span>.
            </p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-2">
              How would you rate this training program?
            </p>
          </div>

          <div class="space-y-4">
            <!-- 1 to 10 rating scale buttons -->
            <div class="grid grid-cols-5 gap-2">
              @for (r of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; track r) {
                <button
                  type="button"
                  (click)="selectedProgramRating.set(r)"
                  class="py-2.5 rounded-xl font-bold text-sm transition-all border"
                  [class.bg-accent-pos]="selectedProgramRating() === r"
                  [class.text-white]="selectedProgramRating() === r"
                  [class.border-accent-pos]="selectedProgramRating() === r"
                  [class.shadow-md]="selectedProgramRating() === r"
                  [class.bg-gray-100]="selectedProgramRating() !== r"
                  [class.dark:bg-gray-800]="selectedProgramRating() !== r"
                  [class.text-gray-700]="selectedProgramRating() !== r"
                  [class.dark:text-gray-300]="selectedProgramRating() !== r"
                  [class.border-gray-300]="selectedProgramRating() !== r"
                  [class.dark:border-gray-700]="selectedProgramRating() !== r"
                >
                  {{ r }}
                </button>
              }
            </div>

            <div class="text-center text-xs font-semibold text-gray-400 dark:text-gray-500">
              Selected Rating: <span class="text-accent-pos font-bold text-sm">{{ selectedProgramRating() }}/10</span>
            </div>

            <div class="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-800">
              <button
                type="button"
                (click)="skipRating()"
                class="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors text-sm font-medium"
              >
                Skip
              </button>
              <button
                type="button"
                (click)="submitProgramRating()"
                [disabled]="isSubmittingProgramRating()"
                class="px-6 py-2.5 bg-accent-pos hover:opacity-80 text-white font-semibold rounded-xl text-sm transition-all solid-btn"
              >
                {{ isSubmittingProgramRating() ? 'Saving...' : 'Submit Rating' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  
  </div>
  `
})
export class WorkoutDashboardComponent implements OnInit {
  private workoutService = inject(WorkoutService);
  private programService = inject(ProgramService);
  private tutorialService = inject(TutorialService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  activeProgram = signal<TrainingProgram | null>(null);
  displayedWeek = signal<number>(1);
  dayTemplates = signal<DayTemplate[]>([]);
  sessions = signal<WorkoutSessionResponse[]>([]);
  isLoading = signal<boolean>(false);
  isReordering = signal<boolean>(false);
  reorderModeActive = signal<boolean>(false);
  finishedProgramForRating = signal<TrainingProgram | null>(null);
  selectedProgramRating = signal<number>(10);
  isSubmittingProgramRating = signal<boolean>(false);

  toggleReorderMode() {
    this.reorderModeActive.update(v => !v);
  }
  
  combinedDays = computed(() => {
    const templates = this.dayTemplates();
    const sess = this.sessions();
    
    return templates.map(t => {
      const match = sess.find(s => s.dayTemplateId === t.id);
      return {
        template: t,
        session: match
      };
    });
  });

  ngOnInit() {
    this.isLoading.set(true);

    this.route.queryParams.subscribe(params => {
      if (params['skipRedirect']) {
        this.loadInitialData();
      } else {
        this.workoutService.getActiveSession().subscribe({
          next: (session) => {
            if (session) {
              this.router.navigate(['/workout', session.id]);
            } else {
              this.loadInitialData();
            }
          },
          error: () => {
            this.loadInitialData();
          }
        });
      }
    });
  }

  private loadInitialData() {
    this.programService.getPrograms().subscribe({
      next: (programs) => {
        const active = programs.find(p => p.isActive);
        if (active) {
          this.activeProgram.set(active);
          this.displayedWeek.set(active.currentWeek || 1);
          this.loadDaysAndSessions(active.id);
        } else {
          this.isLoading.set(false);
        }
      },
      error: (err) => {
        console.error('Failed to load programs', err);
        this.isLoading.set(false);
      }
    });
  }

  private loadDaysAndSessions(programId: string) {
    this.isLoading.set(true);
    
    this.programService.getWeeks(programId).pipe(
      switchMap(weeks => {
        if (weeks.length === 0) return of([]);
        const targetIndex = Math.min(Math.max(this.displayedWeek() - 1, 0), weeks.length - 1);
        return this.programService.getDays(weeks[targetIndex].id);
      })
    ).subscribe({
      next: (days) => {
        this.dayTemplates.set(days);
        this.loadSessionsOnly();
      },
      error: (err) => {
        console.error('Failed to load days', err);
        this.isLoading.set(false);
      }
    });
  }

  private loadSessionsOnly() {
    const prog = this.activeProgram();
    if (!prog) return;
    
    this.workoutService.getSessions(prog.id, this.displayedWeek()).subscribe({
      next: (data) => {
        this.sessions.set(data);
        this.isLoading.set(false);
        this.scrollToNextUnstartedDay();
        this.tutorialService.triggerSectionTutorial({
          targetId: 'tutorial-workout-days',
          title: 'Weekly Schedule',
          description:
            'These are the training days for your active program. ' +
            'Click "Start Session" on any day to begin logging your sets.',
          section: 'workout',
          position: 'bottom'
        });
      },
      error: (err) => {
        console.error('Failed to load sessions', err);
        this.isLoading.set(false);
      }
    });
  }

  prevWeek() {
    if (this.displayedWeek() > 1) {
      this.displayedWeek.update(w => w - 1);
      const prog = this.activeProgram();
      if (prog) {
        this.loadDaysAndSessions(prog.id);
      }
    }
  }

  nextWeek() {
    const prog = this.activeProgram();
    if (prog && this.displayedWeek() < prog.durationWeeks) {
      this.displayedWeek.update(w => w + 1);
      this.loadDaysAndSessions(prog.id);
    }
  }

  finishWeek() {
    const prog = this.activeProgram();
    if (!prog) return;
    
    const isLastWeek = prog.currentWeek === prog.durationWeeks;
    const msg = isLastWeek 
      ? 'Are you sure you want to finish this program? It will be marked as inactive.'
      : 'Are you sure you want to finish this week and advance to the next?';
      
    if (confirm(msg)) {
      this.programService.advanceWeek(prog.id).subscribe({
        next: (updatedProgram) => {
          if (!updatedProgram.isActive) {
            // Program finished - set for rating celebration modal
            this.finishedProgramForRating.set(prog);
            this.selectedProgramRating.set(10);
            this.activeProgram.set(null);
            this.sessions.set([]);
            this.dayTemplates.set([]);
          } else {
            this.activeProgram.set(updatedProgram);
            this.displayedWeek.set(updatedProgram.currentWeek);
            this.isLoading.set(true);
            this.loadSessionsOnly();
          }
        },
        error: (err) => console.error('Failed to advance week', err)
      });
    }
  }

  submitProgramRating() {
    const finished = this.finishedProgramForRating();
    if (!finished) return;

    this.isSubmittingProgramRating.set(true);
    this.programService.rateProgram(finished.id, this.selectedProgramRating()).subscribe({
      next: () => {
        this.isSubmittingProgramRating.set(false);
        this.finishedProgramForRating.set(null);
      },
      error: (err) => {
        console.error('Failed to rate program', err);
        this.isSubmittingProgramRating.set(false);
        this.finishedProgramForRating.set(null);
      }
    });
  }

  skipRating() {
    this.finishedProgramForRating.set(null);
  }

  startDaySession(dayTemplateId: string) {
    const prog = this.activeProgram();
    if (!prog) return;
    
    this.workoutService.startSession({
      weekNumber: this.displayedWeek(),
      dayTemplateId: dayTemplateId,
      performedOn: new Date().toISOString().split('T')[0]
    }).subscribe({
      next: (session) => {
        this.router.navigate(['/workout', session.id]);
      },
      error: (err) => console.error('Error starting session', err)
    });
  }

  deleteSession(id: string) {
    if (confirm('Are you sure you want to delete this session? All logged sets will be lost.')) {
      this.workoutService.deleteSession(id).subscribe({
        next: () => {
          this.loadSessionsOnly();
        },
        error: (err) => console.error('Error deleting session', err)
      });
    }
  }

  scrollToNextUnstartedDay() {
    requestAnimationFrame(() => {
      const days = this.combinedDays();
      const nextDay = days.find(d => !d.session);
      if (nextDay) {
        const el = document.getElementById('day-' + nextDay.template.id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
  }

  dropDay(event: CdkDragDrop<unknown[]>) {
    if (this.isReordering()) return;
    
    this.isReordering.set(true);
    const templates = [...this.dayTemplates()];
    
    moveItemInArray(templates, event.previousIndex, event.currentIndex);
    
    // Update local state immediately for fast feedback
    this.dayTemplates.set(templates);

    // Call API to persist
    const weekId = templates[0]?.weekTemplateId; 

    const requests = templates.map((t, i) => ({
      id: t.id,
      sortOrder: i + 1
    }));

    if (weekId) {
      this.programService.reorderDays(weekId, requests).subscribe({
        next: () => {
          this.isReordering.set(false);
          this.loadDaysAndSessions(this.activeProgram()!.id);
        },
        error: (err) => {
          console.error('Failed to reorder', err);
          this.isReordering.set(false);
        }
      });
    } else {
      this.isReordering.set(false);
    }
  }
}

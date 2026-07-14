import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { WorkoutService } from '../../services/workout.service';
import { ProgramService } from '../../../programs/services/program.service';
import { TrainingProgram, WorkoutSessionResponse, DayTemplate } from '../../../../core/types/training.types';
import { switchMap, of } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-workout-dashboard',
  imports: [CommonModule, RouterModule],
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
        <div class="text-center py-12 solid-card border border-gray-300 dark:border-gray-700 border-dashed">
          <p class="text-black dark:text-white font-medium text-lg mb-2">You don't have an active program.</p>
          <p class="text-gray-500 dark:text-gray-400 mb-6">Go to the Programs tab to build one and set it as active to start working out.</p>
          <a routerLink="/programs" class="px-6 py-2 bg-accent-pos hover:opacity-80 text-white font-semibold rounded-xl transition-all hover:scale-105 inline-block solid-btn">
            Go to Programs
          </a>
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
          
          <div class="mt-4 sm:mt-0">
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
        <div class="space-y-4">
          @for (day of combinedDays(); track day.template.id) {
            <div class="solid-card p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:border-gray-400 dark:hover:border-gray-600 transition-colors border border-gray-300 dark:border-gray-700">
              <div class="mb-4 sm:mb-0">
                <div class="flex items-center gap-3 mb-1">
                  <h3 class="text-xl font-bold text-black dark:text-white">{{ day.template.name }}</h3>
                  
                  @if (day.session?.completedAt) {
                    <span class="px-2 py-0.5 bg-accent-pos/10 text-accent-pos text-xs rounded border border-accent-pos/20 font-bold">Completed</span>
                  } @else if (day.session) {
                    <span class="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 text-xs rounded border border-gray-300 dark:border-gray-600 font-bold">In Progress</span>
                  } @else {
                    <span class="px-2 py-0.5 bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs rounded border border-gray-200 dark:border-gray-700 font-bold">Not Started</span>
                  }
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
                    {{ day.session.completedAt ? 'View Summary' : 'Resume Workout' }} &rarr;
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
  
  </div>
  `
})
export class WorkoutDashboardComponent implements OnInit {
  private workoutService = inject(WorkoutService);
  private programService = inject(ProgramService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  activeProgram = signal<TrainingProgram | null>(null);
  displayedWeek = signal<number>(1);
  dayTemplates = signal<DayTemplate[]>([]);
  sessions = signal<WorkoutSessionResponse[]>([]);
  isLoading = signal<boolean>(false);
  
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
    
    // To get DayTemplates, we need the first WeekTemplate of the program
    this.programService.getWeeks(programId).pipe(
      switchMap(weeks => {
        if (weeks.length === 0) return of([]);
        return this.programService.getDays(weeks[0].id);
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
      this.isLoading.set(true);
      this.loadSessionsOnly();
    }
  }

  nextWeek() {
    const prog = this.activeProgram();
    if (prog && this.displayedWeek() < prog.durationWeeks) {
      this.displayedWeek.update(w => w + 1);
      this.isLoading.set(true);
      this.loadSessionsOnly();
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
            // Program finished
            this.activeProgram.set(null);
            this.sessions.set([]);
            this.dayTemplates.set([]);
            alert('Congratulations on finishing the program!');
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
}

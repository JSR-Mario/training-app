import { Component, OnInit, signal, inject } from '@angular/core';

import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { WorkoutService } from '../../services/workout.service';
import { ProgramService } from '../../../programs/services/program.service';
import { TrainingProgram, DayTemplate } from '../../../../core/types/training.types';
import { forkJoin } from 'rxjs';

@Component({
    selector: 'app-start-session',
    imports: [RouterModule, ReactiveFormsModule],
    template: `
    <div class="max-w-xl mx-auto space-y-6 pt-8 pb-24">
    
      <!-- Header -->
      <div class="text-center">
        <h1 class="text-3xl font-bold text-white">Start Session</h1>
        <p class="text-gray-400 mt-1">Select the workout you want to log today</p>
      </div>
    
      <!-- Loading State -->
      @if (isLoading()) {
        <div class="text-center py-12">
          <div class="animate-pulse flex flex-col items-center">
            <div class="h-8 w-8 bg-blue-500 rounded-full mb-4"></div>
            <p class="text-gray-400">Loading program details...</p>
          </div>
        </div>
      }
    
      <!-- Form -->
      @if (!isLoading()) {
        <div class="glass-card p-6">
          <div class="mb-6">
            <h2 class="text-xl font-semibold text-white mb-1">Program Details</h2>
            <p class="text-gray-400 text-sm">Program: <span class="text-gray-200">{{ program()?.name }}</span></p>
            <p class="text-gray-400 text-sm">Logging for Week: <span class="text-gray-200 font-bold">{{ targetWeekNumber() }}</span></p>
          </div>
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">
            <div>
              <label for="dayTemplateId" class="block text-sm font-medium text-gray-300 mb-1">Select Workout</label>
              <select
                id="dayTemplateId"
                formControlName="dayTemplateId"
                class="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white appearance-none"
                >
                <option value="" disabled>Choose a day to train</option>
                @for (day of days(); track day) {
                  <option [value]="day.id">
                    {{ day.name }} ({{ day.exercises?.length || 0 }} exercises)
                  </option>
                }
              </select>
            </div>
            <div>
              <label for="performedOn" class="block text-sm font-medium text-gray-300 mb-1">Date</label>
              <input
                id="performedOn"
                type="date"
                formControlName="performedOn"
                class="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white"
                >
            </div>
            <div class="pt-6">
              <button
                type="submit"
                [disabled]="form.invalid || isSubmitting()"
                class="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-lg rounded-xl shadow-lg disabled:opacity-50 transition-all transform hover:scale-[1.02] active:scale-95"
                >
                {{ isSubmitting() ? 'Starting...' : 'Let\\'s Go!' }}
              </button>
              <div class="text-center mt-4">
                <a routerLink="/workout" class="text-gray-400 hover:text-white text-sm transition-colors">Cancel</a>
              </div>
            </div>
          </form>
        </div>
      }
    
    </div>
    `
})
export class StartSessionComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private workoutService = inject(WorkoutService);
  private programService = inject(ProgramService);
  private fb = inject(FormBuilder);

  programId = signal<string | null>(null);
  targetWeekNumber = signal<number>(1);
  program = signal<TrainingProgram | null>(null);
  days = signal<DayTemplate[]>([]);
  
  isLoading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);

  form: FormGroup = this.fb.group({
    dayTemplateId: ['', Validators.required],
    performedOn: [this.getTodayString(), Validators.required]
  });

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['programId']) {
        this.programId.set(params['programId']);
      }
      if (params['week']) {
        this.targetWeekNumber.set(parseInt(params['week'], 10));
      }

      this.loadProgramData();
    });
  }

  getTodayString(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  loadProgramData() {
    const id = this.programId();
    if (!id) {
      // Try to load active program instead
      this.programService.getPrograms().subscribe(progs => {
        const active = progs.find(p => p.isActive) || progs[0];
        if (active) {
          this.programId.set(active.id);
          this.fetchProgramDays(active.id);
        } else {
          this.isLoading.set(false);
        }
      });
      return;
    }
    
    this.fetchProgramDays(id);
  }

  fetchProgramDays(programId: string) {
    this.isLoading.set(true);
    this.programService.getProgram(programId).subscribe({
      next: (prog) => {
        this.program.set(prog);
        // Get weeks, then get days for the first (only) week
        this.programService.getWeeks(programId).subscribe({
          next: (weeksData) => {
            if (weeksData.length === 0) {
              this.days.set([]);
              this.isLoading.set(false);
              return;
            }
            const weekId = weeksData[0].id;
            this.programService.getDays(weekId).subscribe({
              next: (daysData) => {
                if (daysData.length === 0) {
                  this.days.set([]);
                  this.isLoading.set(false);
                  return;
                }

                // Fetch exercises per day to show count
                const exerciseRequests = daysData.map(day =>
                  this.programService.getDayExercises(day.id)
                );

                forkJoin(exerciseRequests).subscribe({
                  next: (exerciseArrays) => {
                    const enrichedDays = daysData.map((day, index) => ({
                      ...day,
                      exercises: exerciseArrays[index]
                    }));
                    this.days.set(enrichedDays);

                    // Auto-select first day
                    if (enrichedDays.length > 0) {
                      this.form.patchValue({ dayTemplateId: enrichedDays[0].id });
                    }
                    this.isLoading.set(false);
                  },
                  error: () => {
                    // Still show days even if exercise fetch fails
                    this.days.set(daysData.map(d => ({ ...d, exercises: [] })));
                    if (daysData.length > 0) {
                      this.form.patchValue({ dayTemplateId: daysData[0].id });
                    }
                    this.isLoading.set(false);
                  }
                });
              },
              error: (err) => {
                console.error('Failed to load days', err);
                this.isLoading.set(false);
              }
            });
          },
          error: (err) => {
            console.error('Failed to load weeks', err);
            this.isLoading.set(false);
          }
        });
      },
      error: (err) => {
        console.error('Failed to load program', err);
        this.isLoading.set(false);
      }
    });
  }

  onSubmit() {
    if (this.form.valid) {
      this.isSubmitting.set(true);
      const request = {
        dayTemplateId: this.form.value.dayTemplateId,
        performedOn: this.form.value.performedOn,
        weekNumber: this.targetWeekNumber()
      };

      this.workoutService.startSession(request).subscribe({
        next: (session) => {
          this.isSubmitting.set(false);
          this.router.navigate(['/workout', session.id]);
        },
        error: (err) => {
          console.error('Error starting session', err);
          this.isSubmitting.set(false);
          alert('Failed to start session. Please try again.');
        }
      });
    }
  }
}

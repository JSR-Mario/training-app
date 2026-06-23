import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProgramService } from '../../services/program.service';
import { TrainingProgram, DayTemplate } from '../../../../core/types/training.types';
import { DayBuilderComponent } from '../../components/day-builder/day-builder.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-program-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, DayBuilderComponent],
  template: `
    <div class="max-w-7xl mx-auto space-y-6">
      
      <!-- Back Link & Header -->
      <div>
        <a routerLink="/programs" class="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block">&larr; Back to Programs</a>
        
        <div *ngIf="isLoading()" class="text-gray-400">Loading program details...</div>
        
        <div *ngIf="!isLoading() && program()" class="flex justify-between items-end border-b border-gray-800 pb-4">
          <div>
            <h1 class="text-3xl font-bold text-white">{{ program()?.name }}</h1>
            <p class="text-gray-400 mt-1">This template repeats for {{ program()?.durationWeeks }} weeks</p>
          </div>
          <button 
            (click)="openAddDay()"
            class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-700 transition-colors text-sm font-medium"
          >
            + Add Day
          </button>
        </div>
      </div>

      <!-- Add Day Form -->
      <div *ngIf="showAddDay() && !isLoading()" class="glass-card p-4">
        <form [formGroup]="dayForm" (ngSubmit)="onSubmitDay()" class="flex gap-3 items-end">
          <div class="flex-1">
            <label for="dayNameInput" class="block text-sm font-medium text-gray-300 mb-1">Day Name</label>
            <input 
              id="dayNameInput"
              type="text" 
              formControlName="dayName"
              placeholder="e.g., Push, Pull, Legs"
              class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-white text-sm"
            >
          </div>
          <button 
            type="button" 
            (click)="showAddDay.set(false)"
            class="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            Cancel
          </button>
          <button 
            type="submit"
            [disabled]="dayForm.invalid"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm disabled:opacity-50 transition-colors"
          >
            Save
          </button>
        </form>
      </div>

      <!-- Days Grid -->
      <div *ngIf="!isLoading() && program()" class="space-y-4">

        <div *ngIf="days().length === 0 && !showAddDay()" class="text-center py-12 glass-card">
          <p class="text-gray-400">No training days configured yet. Add your first day!</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <app-day-builder
            *ngFor="let day of days()"
            [day]="day"
            (deleteDay)="deleteDay(day.id)"
            (dayUpdated)="loadProgramData()"
          ></app-day-builder>
        </div>
      </div>
    </div>
  `
})
export class ProgramDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private programService = inject(ProgramService);
  private fb = inject(FormBuilder);

  programId = signal<string | null>(null);
  program = signal<TrainingProgram | null>(null);
  weekTemplateId = signal<string | null>(null);
  days = signal<DayTemplate[]>([]);
  isLoading = signal<boolean>(true);
  showAddDay = signal<boolean>(false);

  dayForm: FormGroup = this.fb.group({
    dayName: ['', Validators.required]
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.programId.set(params.get('id'));
      if (this.programId()) {
        this.loadProgramData();
      }
    });
  }

  loadProgramData() {
    const id = this.programId();
    if (!id) return;
    
    this.isLoading.set(true);
    
    this.programService.getProgram(id).subscribe({
      next: (prog) => {
        this.program.set(prog);
        
        // Fetch weeks for this program
        this.programService.getWeeks(id).subscribe({
          next: (weeksData) => {
            if (weeksData.length === 0) {
              // Auto-create the single week template
              this.programService.createWeek(id, 'Training Week').subscribe({
                next: (newWeek) => {
                  this.weekTemplateId.set(newWeek.id);
                  this.days.set([]);
                  this.isLoading.set(false);
                },
                error: (err) => {
                  console.error('Failed to auto-create week template', err);
                  this.isLoading.set(false);
                }
              });
            } else {
              // Use the first (and only) week template
              const week = weeksData[0];
              this.weekTemplateId.set(week.id);
              this.loadDays(week.id);
            }
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

  loadDays(weekId: string) {
    this.programService.getDays(weekId).subscribe({
      next: (daysData) => {
        // Fetch exercises for each day in parallel
        if (daysData.length === 0) {
          this.days.set([]);
          this.isLoading.set(false);
          return;
        }

        const exerciseRequests = daysData.map(day => 
          this.programService.getDayExercises(day.id)
        );

        forkJoin(exerciseRequests).subscribe({
          next: (exerciseArrays) => {
            const enrichedDays: DayTemplate[] = daysData.map((day, index) => ({
              ...day,
              exercises: exerciseArrays[index].sort((a, b) => a.sortOrder - b.sortOrder)
            }));
            this.days.set(enrichedDays);
            this.isLoading.set(false);
          },
          error: (err) => {
            console.error('Failed to load day exercises', err);
            // Still show days even if exercises fail
            const daysWithEmptyExercises = daysData.map(day => ({
              ...day,
              exercises: day.exercises || []
            }));
            this.days.set(daysWithEmptyExercises);
            this.isLoading.set(false);
          }
        });
      },
      error: (err) => {
        console.error('Failed to load days', err);
        this.isLoading.set(false);
      }
    });
  }

  openAddDay() {
    const nextDayNumber = this.days().length + 1;
    this.dayForm.patchValue({ dayName: `Day ${nextDayNumber}` });
    this.showAddDay.set(true);
  }

  onSubmitDay() {
    const weekId = this.weekTemplateId();
    if (this.dayForm.valid && weekId) {
      this.programService.createDay(weekId, this.dayForm.value.dayName).subscribe({
        next: () => {
          this.showAddDay.set(false);
          this.loadDays(weekId);
        },
        error: (err) => console.error('Error adding day', err)
      });
    }
  }

  deleteDay(dayId: string) {
    const weekId = this.weekTemplateId();
    if (confirm('Delete this day and its exercises?') && weekId) {
      this.programService.deleteDay(dayId).subscribe({
        next: () => this.loadDays(weekId),
        error: (err) => console.error('Error deleting day', err)
      });
    }
  }
}

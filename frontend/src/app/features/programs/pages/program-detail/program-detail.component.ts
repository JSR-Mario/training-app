import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProgramService } from '../../services/program.service';
import { TrainingProgram, DayTemplate } from '../../../../core/types/training.types';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-program-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
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
            *ngIf="weekTemplateId()"
            (click)="openAddDay()"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm font-medium shadow-lg"
          >
            + Add Day
          </button>
        </div>
      </div>

      <div *ngIf="!isLoading() && program()" class="space-y-6">
        <!-- Add Day Form -->
        <div *ngIf="showAddDay()" class="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
          <form [formGroup]="dayForm" (ngSubmit)="onSubmitDay()" class="flex gap-3">
            <input 
              type="text" 
              formControlName="dayName"
              placeholder="e.g., Push Day"
              class="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-white text-sm"
            >
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
        <div *ngIf="days().length === 0 && !showAddDay()" class="text-center py-12 glass-card border border-dashed border-gray-700">
          <p class="text-gray-400">No days configured for this program.</p>
          <button (click)="openAddDay()" class="mt-4 text-blue-400 hover:text-blue-300 text-sm">Add your first day</button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div *ngFor="let day of days()" class="glass-card p-5 group flex flex-col hover:border-gray-600 transition-all cursor-pointer" [routerLink]="['/programs', program()?.id, 'days', day.id]">
            <div class="flex justify-between items-start mb-4">
              <h3 class="text-xl font-bold text-gray-200 group-hover:text-blue-400 transition-colors">{{ day.name }}</h3>
              <button 
                (click)="deleteDay(day.id, $event)"
                class="text-red-400 hover:text-red-300 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete Day"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
            <div class="text-sm text-gray-400 flex-1">
              <p *ngIf="day.exercises && day.exercises.length > 0">{{ day.exercises.length }} exercises</p>
              <p *ngIf="!day.exercises || day.exercises.length === 0" class="italic">No exercises</p>
            </div>
            <div class="mt-4 pt-4 border-t border-gray-800 text-sm text-blue-400 group-hover:text-blue-300 font-medium">
              Edit Exercises &rarr;
            </div>
          </div>
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

  deleteDay(dayId: string, event: Event) {
    event.stopPropagation();
    const weekId = this.weekTemplateId();
    if (confirm('Delete this day and its exercises?') && weekId) {
      this.programService.deleteDay(dayId).subscribe({
        next: () => this.loadDays(weekId),
        error: (err) => console.error('Error deleting day', err)
      });
    }
  }
}

import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProgramService } from '../../services/program.service';
import { TrainingProgram, WeekTemplate } from '../../../../core/types/training.types';
import { DayBuilderComponent } from '../../components/day-builder/day-builder.component';

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
            <p class="text-gray-400 mt-1">Duration: {{ program()?.durationWeeks }} weeks</p>
          </div>
          <button 
            (click)="addWeek()"
            class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-700 transition-colors text-sm font-medium"
          >
            + Add Week
          </button>
        </div>
      </div>

      <!-- Weeks List -->
      <div *ngIf="!isLoading() && program()" class="space-y-8">
        
        <div *ngIf="weeks().length === 0" class="text-center py-12 glass-card">
          <p class="text-gray-400">This program has no weeks yet. Start building!</p>
        </div>

        <div *ngFor="let week of weeks()" class="glass-card p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold text-gray-200">{{ week.weekName }}</h2>
            <div class="flex gap-3">
              <button 
                (click)="addDay(week.id)"
                class="px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg transition-colors text-sm"
              >
                + Add Day
              </button>
              <button 
                (click)="deleteWeek(week.id)"
                class="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors text-sm"
              >
                Delete Week
              </button>
            </div>
          </div>

          <!-- Add Day Form -->
          <div *ngIf="activeAddDayWeekId() === week.id" class="bg-gray-800/50 p-4 rounded-xl border border-gray-700 mb-4">
            <form [formGroup]="dayForm" (ngSubmit)="onSubmitDay(week.id)" class="flex gap-3">
              <input 
                type="text" 
                formControlName="dayName"
                placeholder="e.g., Push Day"
                class="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-white text-sm"
              >
              <button 
                type="button" 
                (click)="activeAddDayWeekId.set(null)"
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
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <app-day-builder
              *ngFor="let day of week.days"
              [day]="day"
              (deleteDay)="deleteDay(day.id)"
              (dayUpdated)="loadProgramData()"
            ></app-day-builder>
          </div>
          
          <div *ngIf="week.days.length === 0" class="text-sm text-gray-500 italic py-4">
            No days configured for this week.
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
  weeks = signal<WeekTemplate[]>([]);
  isLoading = signal<boolean>(true);

  activeAddDayWeekId = signal<string | null>(null);

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
    
    // First get the program
    this.programService.getProgram(id).subscribe({
      next: (prog) => {
        this.program.set(prog);
        
        // Then get its weeks
        this.programService.getWeeks(id).subscribe({
          next: (weeksData) => {
            // Sort weeks
            const sortedWeeks = weeksData.sort((a, b) => a.sortOrder - b.sortOrder);
            
            // Note: In our current API design, weeks don't return their days natively unless the backend maps it deeply.
            // Wait, looking at the domain model, WeekTemplate has List<DayTemplate>. If the backend returns them, great!
            // If the backend doesn't return days deeply nested, we would need to fetch days for each week here.
            // Assuming the backend returns days inside weeks (standard JPA behavior with EAGER or properly mapped DTOs).
            
            // Sort days within weeks
            sortedWeeks.forEach(w => {
              if (w.days) {
                w.days.sort((a, b) => a.sortOrder - b.sortOrder);
              } else {
                w.days = [];
              }
            });
            
            this.weeks.set(sortedWeeks);
            this.isLoading.set(false);
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

  addWeek() {
    const pId = this.programId();
    if (!pId) return;

    const nextOrder = this.weeks().length > 0 
      ? Math.max(...this.weeks().map(w => w.sortOrder)) + 1 
      : 0;
    const defaultName = `Week ${nextOrder + 1}`;

    this.programService.createWeek(pId, defaultName, nextOrder).subscribe({
      next: () => this.loadProgramData(),
      error: (err) => console.error('Error adding week', err)
    });
  }

  deleteWeek(weekId: string) {
    if (confirm('Delete this week and all its days?')) {
      this.programService.deleteWeek(weekId).subscribe({
        next: () => this.loadProgramData(),
        error: (err) => console.error('Error deleting week', err)
      });
    }
  }

  addDay(weekId: string) {
    this.activeAddDayWeekId.set(weekId);
    this.dayForm.reset();
  }

  onSubmitDay(weekId: string) {
    if (this.dayForm.valid) {
      const week = this.weeks().find(w => w.id === weekId);
      const nextOrder = week && week.days && week.days.length > 0 
        ? Math.max(...week.days.map(d => d.sortOrder)) + 1 
        : 0;
      
      this.programService.createDay(weekId, this.dayForm.value.dayName, nextOrder).subscribe({
        next: () => {
          this.activeAddDayWeekId.set(null);
          this.loadProgramData();
        },
        error: (err) => console.error('Error adding day', err)
      });
    }
  }

  deleteDay(dayId: string) {
    if (confirm('Delete this day and its exercises?')) {
      this.programService.deleteDay(dayId).subscribe({
        next: () => this.loadProgramData(),
        error: (err) => console.error('Error deleting day', err)
      });
    }
  }
}

import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WorkoutService } from '../../services/workout.service';
import { ProgramService } from '../../../programs/services/program.service';
import { TrainingProgram, WorkoutSessionResponse } from '../../../../core/types/training.types';

@Component({
    selector: 'app-workout-dashboard',
    imports: [CommonModule, RouterModule, FormsModule],
    template: `
    <div class="max-w-7xl mx-auto space-y-6 pb-24">
    
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold text-white">Workouts</h1>
          <p class="text-gray-400 mt-1">Track your progress</p>
        </div>
        <a
          [routerLink]="['/workout', 'start']"
          [queryParams]="{ programId: selectedProgramId(), week: selectedWeek() }"
          class="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95"
          >
          Start Session
        </a>
      </div>
    
      <!-- Filters -->
      <div class="glass-card p-4 flex flex-col sm:flex-row gap-4 items-end">
        <div class="w-full sm:w-1/2">
          <label for="programSelect" class="block text-sm font-medium text-gray-300 mb-1">Select Program</label>
          <select
            id="programSelect"
            [(ngModel)]="selectedProgramId"
            (ngModelChange)="onProgramChange()"
            class="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white appearance-none"
            >
            <option value="" disabled>Select a program</option>
            @for (p of programs(); track p) {
              <option [value]="p.id">{{ p.name }} ({{ p.durationWeeks }} weeks)</option>
            }
          </select>
        </div>
    
        <div class="w-full sm:w-1/4">
          <label for="weekSelect" class="block text-sm font-medium text-gray-300 mb-1">Week Number</label>
          <select
            id="weekSelect"
            [(ngModel)]="selectedWeek"
            (ngModelChange)="loadSessions()"
            [disabled]="!selectedProgramId()"
            class="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white appearance-none disabled:opacity-50"
            >
            @for (w of availableWeeks(); track w) {
              <option [value]="w">Week {{ w }}</option>
            }
          </select>
        </div>
      </div>
    
      <!-- Loading State -->
      @if (isLoading()) {
        <div class="text-center py-12">
          <div class="animate-pulse flex flex-col items-center">
            <div class="h-8 w-8 bg-blue-500 rounded-full mb-4"></div>
            <p class="text-gray-400">Loading sessions...</p>
          </div>
        </div>
      }
    
      <!-- Sessions List -->
      @if (!isLoading()) {
        <div class="space-y-4">
          @if (sessions().length === 0 && selectedProgramId()) {
            <div class="text-center py-12 glass-card">
              <p class="text-gray-400">No sessions logged for this week yet.</p>
            </div>
          }
          @if (programs().length === 0) {
            <div class="text-center py-12 glass-card border border-yellow-500/30">
              <p class="text-yellow-400">You don't have any programs. Go to the Programs tab to build one first.</p>
            </div>
          }
          @for (session of sessions(); track session) {
            <div class="glass-card p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:border-gray-600 transition-colors">
              <div class="mb-4 sm:mb-0">
                <div class="flex items-center gap-3 mb-1">
                  <h3 class="text-xl font-bold text-white">{{ session.dayTemplateName }}</h3>
                  @if (session.completedAt) {
                    <span class="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded border border-green-500/30">Completed</span>
                  }
                  @if (!session.completedAt) {
                    <span class="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded border border-yellow-500/30">In Progress</span>
                  }
                </div>
                <p class="text-gray-400 text-sm">Performed on: {{ session.performedOn | date:'mediumDate' }}</p>
              </div>
              <div class="flex gap-3 w-full sm:w-auto">
                <button
                  (click)="deleteSession(session.id)"
                  class="px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors text-sm font-medium w-full sm:w-auto"
                  >
                  Delete
                </button>
                <a
                  [routerLink]="['/workout', session.id]"
                  class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium w-full sm:w-auto text-center"
                  >
                  {{ session.completedAt ? 'View Summary' : 'Resume Workout' }} &rarr;
                </a>
              </div>
            </div>
          }
        </div>
      }
    
    </div>
    `
})
export class WorkoutDashboardComponent implements OnInit {
  private workoutService = inject(WorkoutService);
  private programService = inject(ProgramService);

  programs = signal<TrainingProgram[]>([]);
  sessions = signal<WorkoutSessionResponse[]>([]);
  isLoading = signal<boolean>(false);
  
  selectedProgramId = signal<string>('');
  selectedWeek = signal<number>(1);

  availableWeeks = computed(() => {
    const progId = this.selectedProgramId();
    if (!progId) return [];
    const program = this.programs().find(p => p.id === progId);
    if (!program) return [];
    
    const weeks = [];
    for (let i = 1; i <= program.durationWeeks; i++) {
      weeks.push(i);
    }
    return weeks;
  });

  ngOnInit() {
    this.isLoading.set(true);
    this.programService.getPrograms().subscribe({
      next: (data) => {
        this.programs.set(data);
        const active = data.find(p => p.isActive);
        if (active) {
          this.selectedProgramId.set(active.id);
          this.selectedWeek.set(1);
          this.loadSessions();
        } else if (data.length > 0) {
          this.selectedProgramId.set(data[0].id);
          this.selectedWeek.set(1);
          this.loadSessions();
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

  onProgramChange() {
    this.selectedWeek.set(1);
    this.loadSessions();
  }

  loadSessions() {
    const progId = this.selectedProgramId();
    const week = this.selectedWeek();
    if (!progId || !week) return;

    this.isLoading.set(true);
    this.workoutService.getSessions(progId, week).subscribe({
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

  deleteSession(id: string) {
    if (confirm('Are you sure you want to delete this session? All logged sets will be lost.')) {
      this.workoutService.deleteSession(id).subscribe({
        next: () => {
          this.loadSessions();
        },
        error: (err) => console.error('Error deleting session', err)
      });
    }
  }
}

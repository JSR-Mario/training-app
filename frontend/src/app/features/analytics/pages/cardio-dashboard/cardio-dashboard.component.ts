import { Component, inject, ViewChild, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CardioChartComponent } from '../../components/cardio-chart/cardio-chart.component';
import { CardioLogService } from '../../services/cardio-log.service';
import { CARDIO_TYPES } from '../../../../core/constants/cardio-types';
import { TutorialService } from '../../../../core/services/tutorial.service';
import { CardioLogResponse } from '../../../../core/types/training.types';

@Component({
  standalone: true,
  selector: 'app-cardio-dashboard',
  imports: [CommonModule, ReactiveFormsModule, CardioChartComponent],
  template: `
    <div class="max-w-7xl mx-auto space-y-6">
      
      <header class="mb-6">
        <h1 class="text-2xl font-bold text-black dark:text-white tracking-tight sm:text-3xl">
          Cardio <span class="text-accent-pos">Dashboard</span>
        </h1>
      </header>

      <!-- Logging Form & Chart Container -->
      <div id="tutorial-cardio-form" class="solid-card border border-gray-300 dark:border-gray-700 p-6 mb-6">
        
        <form [formGroup]="cardioForm" (ngSubmit)="onSubmit()" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 items-end gap-4 mb-6">
          
          <div class="w-full">
            <label for="performedOn" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
            <input id="performedOn" type="date" formControlName="performedOn" 
                   class="w-full solid-input">
          </div>
          
          <div class="w-full">
            <label for="durationMinutes" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (min)</label>
            <input id="durationMinutes" type="number" formControlName="durationMinutes" min="1" placeholder="e.g. 30"
                   class="w-full solid-input">
          </div>

          <div class="w-full">
            <label for="distanceKm" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Distance (km)</label>
            <input id="distanceKm" type="number" step="0.01" min="0.01" formControlName="distanceKm" placeholder="e.g. 5.2"
                   class="w-full solid-input">
          </div>

          <div class="w-full">
            <label for="cardioType" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type (Optional)</label>
            <select id="cardioType" formControlName="cardioType" class="w-full solid-input">
              <option value="">— Select type —</option>
              @for (type of cardioTypes; track type.value) {
                <option [value]="type.value">{{ type.label }}</option>
              }
            </select>
          </div>

          <button type="submit" [disabled]="cardioForm.invalid || isSubmitting()"
                  class="w-full solid-btn bg-accent-pos hover:opacity-80 text-white disabled:opacity-50 h-[42px] px-6">
            @if (isSubmitting()) {
              Logging...
            } @else {
              Log Session
            }
          </button>
        </form>

        <!-- Chart -->
        <app-cardio-chart></app-cardio-chart>
      </div>

      <!-- Cardio History Container -->
      <div class="solid-card border border-gray-300 dark:border-gray-700 p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold text-black dark:text-white flex items-center gap-2">
            <svg class="w-5 h-5 text-accent-pos" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Cardio History
          </h2>
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
            {{ logs().length }} {{ logs().length === 1 ? 'session' : 'sessions' }}
          </span>
        </div>

        @if (isLoadingLogs()) {
          <div class="flex items-center justify-center py-8">
            <div class="w-6 h-6 border-2 border-accent-pos border-t-transparent rounded-full animate-spin"></div>
          </div>
        } @else if (logs().length === 0) {
          <div class="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No logged cardio sessions yet.</p>
          </div>
        } @else {
          <div class="divide-y divide-gray-200 dark:divide-gray-800">
            @for (log of logs(); track log.id) {
              <div class="py-3.5 flex items-center justify-between gap-2 sm:gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 px-2 rounded-xl transition-colors min-w-0">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                  <div class="w-10 h-10 rounded-xl bg-accent-pos/10 border border-accent-pos/20 flex items-center justify-center text-accent-pos font-bold shrink-0">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="font-semibold text-black dark:text-white text-sm truncate">
                      {{ getCardioLabel(log.cardioType) }}
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {{ log.performedOn }}
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-2 sm:gap-3 shrink-0">
                  @if (log.distanceKm !== null && log.distanceKm !== undefined) {
                    <span class="shrink-0 whitespace-nowrap inline-flex items-center justify-center text-xs sm:text-sm font-semibold text-accent-pos bg-accent-pos/10 px-2.5 sm:px-3 py-1 rounded-full border border-accent-pos/20">
                      {{ log.distanceKm }} km
                    </span>
                  }
                  <span class="shrink-0 whitespace-nowrap inline-flex items-center justify-center text-xs sm:text-sm font-semibold text-accent-pos bg-accent-pos/10 px-2.5 sm:px-3 py-1 rounded-full border border-accent-pos/20">
                    {{ log.durationMinutes }} min
                  </span>
                  @if (calculatePace(log.durationMinutes, log.distanceKm); as pace) {
                    <span class="hidden md:inline-flex shrink-0 whitespace-nowrap items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                      {{ pace }}
                    </span>
                  }

                  <div class="flex items-center gap-0.5 sm:gap-1 shrink-0">
                    <button
                      type="button"
                      (click)="openEditModal(log)"
                      class="p-1.5 sm:p-2 text-gray-400 hover:text-accent-pos hover:bg-accent-pos/10 rounded-lg transition-all"
                      title="Edit session"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      (click)="confirmDelete(log.id)"
                      [disabled]="deletingLogId() === log.id"
                      class="p-2 text-gray-400 hover:text-accent-neg hover:bg-accent-neg/10 rounded-lg transition-all disabled:opacity-50"
                      title="Delete session"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>

    <!-- Edit Cardio Modal Overlay -->
    @if (editingLog()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div class="w-full max-w-lg solid-card border border-gray-300 dark:border-gray-700 p-6 rounded-2xl shadow-2xl bg-white dark:bg-gray-900">
          <div class="flex items-center justify-between mb-4 border-b border-gray-200 dark:border-gray-800 pb-3">
            <h2 class="text-xl font-bold text-black dark:text-white">Edit Cardio Session</h2>
            <button type="button" (click)="closeEditModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form [formGroup]="editForm" (ngSubmit)="onSaveEdit()" class="space-y-4">
            <div>
              <label for="editPerformedOn" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input id="editPerformedOn" type="date" formControlName="performedOn" class="w-full solid-input">
            </div>

            <div>
              <label for="editDurationMinutes" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (min)</label>
              <input id="editDurationMinutes" type="number" formControlName="durationMinutes" min="1" placeholder="e.g. 30" class="w-full solid-input">
            </div>

            <div>
              <label for="editDistanceKm" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Distance (km) (Optional)</label>
              <input id="editDistanceKm" type="number" step="0.01" min="0.01" formControlName="distanceKm" placeholder="e.g. 5.2" class="w-full solid-input">
            </div>

            <div>
              <label for="editCardioType" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type (Optional)</label>
              <select id="editCardioType" formControlName="cardioType" class="w-full solid-input">
                <option value="">— Select type —</option>
                @for (type of cardioTypes; track type.value) {
                  <option [value]="type.value">{{ type.label }}</option>
                }
              </select>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
              <button type="button" (click)="closeEditModal()" class="solid-btn border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2">
                Cancel
              </button>
              <button type="submit" [disabled]="editForm.invalid || isSavingEdit()" class="solid-btn bg-accent-pos hover:opacity-80 text-white disabled:opacity-50 px-6 py-2">
                @if (isSavingEdit()) {
                  Saving...
                } @else {
                  Save Changes
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `
})
export class CardioDashboardComponent implements OnInit {
  private fb = inject(FormBuilder);
  private cardioService = inject(CardioLogService);
  private tutorialService = inject(TutorialService);

  @ViewChild(CardioChartComponent) chartComponent!: CardioChartComponent;

  cardioTypes = CARDIO_TYPES;

  isSubmitting = signal(false);
  isLoadingLogs = signal(true);
  logs = signal<CardioLogResponse[]>([]);

  editingLog = signal<CardioLogResponse | null>(null);
  isSavingEdit = signal(false);
  deletingLogId = signal<string | null>(null);

  cardioForm: FormGroup = this.fb.group({
    performedOn: [this.getLocalDateString(), Validators.required],
    durationMinutes: [null, [Validators.required, Validators.min(1)]],
    distanceKm: [null, [Validators.min(0.01)]],
    cardioType: ['']
  });

  editForm: FormGroup = this.fb.group({
    performedOn: ['', Validators.required],
    durationMinutes: [null, [Validators.required, Validators.min(1)]],
    distanceKm: [null, [Validators.min(0.01)]],
    cardioType: ['']
  });

  ngOnInit() {
    this.loadLogs();
    this.tutorialService.triggerSectionTutorial({
      targetId: 'tutorial-cardio-form',
      title: 'Log Cardio',
      description:
        'Enter the date, duration in minutes, distance in km (optional), and optionally the type of cardio. ' +
        'Sessions appear in the chart below grouped by day.',
      section: 'cardio',
      position: 'bottom'
    });
  }

  loadLogs() {
    this.isLoadingLogs.set(true);
    this.cardioService.getLogs().subscribe({
      next: (data) => {
        const sorted = [...data].sort((a, b) => {
          return new Date(b.performedOn).getTime() - new Date(a.performedOn).getTime();
        });
        this.logs.set(sorted);
        this.isLoadingLogs.set(false);
      },
      error: (err) => {
        console.error('Failed to load cardio logs', err);
        this.isLoadingLogs.set(false);
      }
    });
  }

  getCardioLabel(typeValue?: string): string {
    if (!typeValue) return 'General Cardio';
    const found = CARDIO_TYPES.find(t => t.value === typeValue);
    return found ? found.label : typeValue;
  }

  calculatePace(durationMinutes: number, distanceKm?: number | null): string | null {
    if (!distanceKm || distanceKm <= 0 || !durationMinutes || durationMinutes <= 0) {
      return null;
    }
    const paceDecimal = durationMinutes / distanceKm;
    const paceMin = Math.floor(paceDecimal);
    const paceSec = Math.round((paceDecimal - paceMin) * 60);
    const paddedSec = paceSec < 10 ? `0${paceSec}` : (paceSec === 60 ? '00' : `${paceSec}`);
    const finalMin = paceSec === 60 ? paceMin + 1 : paceMin;
    return `${finalMin}:${paddedSec} /km`;
  }

  private getLocalDateString(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  onSubmit() {
    if (this.cardioForm.invalid) return;

    this.isSubmitting.set(true);
    this.cardioService.logCardio(this.cardioForm.value).subscribe({
      next: () => {
        this.cardioForm.patchValue({
          durationMinutes: null,
          distanceKm: null,
          cardioType: ''
        });
        this.loadLogs();
        if (this.chartComponent) {
          this.chartComponent.reload();
        }
        this.isSubmitting.set(false);
      },
      error: (err) => {
        console.error('Failed to log cardio', err);
        this.isSubmitting.set(false);
      }
    });
  }

  openEditModal(log: CardioLogResponse) {
    this.editingLog.set(log);
    this.editForm.setValue({
      performedOn: log.performedOn,
      durationMinutes: log.durationMinutes,
      distanceKm: log.distanceKm ?? null,
      cardioType: log.cardioType || ''
    });
  }

  closeEditModal() {
    this.editingLog.set(null);
    this.editForm.reset();
  }

  onSaveEdit() {
    const currentLog = this.editingLog();
    if (!currentLog || this.editForm.invalid) return;

    this.isSavingEdit.set(true);
    this.cardioService.updateLog(currentLog.id, this.editForm.value).subscribe({
      next: () => {
        this.isSavingEdit.set(false);
        this.closeEditModal();
        this.loadLogs();
        if (this.chartComponent) {
          this.chartComponent.reload();
        }
      },
      error: (err) => {
        console.error('Failed to update cardio log', err);
        this.isSavingEdit.set(false);
      }
    });
  }

  confirmDelete(id: string) {
    if (!confirm('Are you sure you want to delete this cardio entry?')) return;

    this.deletingLogId.set(id);
    this.cardioService.deleteLog(id).subscribe({
      next: () => {
        this.deletingLogId.set(null);
        this.loadLogs();
        if (this.chartComponent) {
          this.chartComponent.reload();
        }
      },
      error: (err) => {
        console.error('Failed to delete cardio log', err);
        this.deletingLogId.set(null);
      }
    });
  }
}

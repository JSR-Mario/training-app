import { Component, inject, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CardioChartComponent } from '../../components/cardio-chart/cardio-chart.component';
import { CardioLogService } from '../../services/cardio-log.service';
import { CARDIO_TYPES } from '../../../../core/constants/cardio-types';

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

      <!-- Logging Form -->
      <div class="solid-card border border-gray-300 dark:border-gray-700 p-6 rounded-2xl mb-6">
        
        <form [formGroup]="cardioForm" (ngSubmit)="onSubmit()" class="flex flex-col sm:flex-row items-end gap-4">
          
          <div class="flex-1 w-full">
            <label for="performedOn" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
            <input id="performedOn" type="date" formControlName="performedOn" 
                   class="w-full solid-input">
          </div>
          
          <div class="flex-1 w-full">
            <label for="durationMinutes" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (min)</label>
            <input id="durationMinutes" type="number" formControlName="durationMinutes" min="1" placeholder="e.g. 30"
                   class="w-full solid-input">
          </div>

          <div class="flex-1 w-full">
            <label for="cardioType" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type (Optional)</label>
            <select id="cardioType" formControlName="cardioType" class="w-full solid-input">
              <option value="">— Select type —</option>
              @for (type of cardioTypes; track type.value) {
                <option [value]="type.value">{{ type.label }}</option>
              }
            </select>
          </div>

          <button type="submit" [disabled]="cardioForm.invalid || isSubmitting()"
                  class="w-full sm:w-auto solid-btn bg-accent-pos hover:opacity-80 text-white disabled:opacity-50 h-[42px] px-6">
            @if (isSubmitting()) {
              Logging...
            } @else {
              Log Session
            }
          </button>
        </form>
      </div>

      <!-- Chart -->
      <app-cardio-chart></app-cardio-chart>
    </div>
  `
})
export class CardioDashboardComponent {
  private fb = inject(FormBuilder);
  private cardioService = inject(CardioLogService);

  cardioTypes = CARDIO_TYPES;

  private getLocalDateString(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  @ViewChild(CardioChartComponent) chartComponent!: CardioChartComponent;

  isSubmitting = signal(false);

  cardioForm: FormGroup = this.fb.group({
    performedOn: [this.getLocalDateString(), Validators.required],
    durationMinutes: [null, [Validators.required, Validators.min(1)]],
    cardioType: ['']
  });

  onSubmit() {
    if (this.cardioForm.invalid) return;

    this.isSubmitting.set(true);
    this.cardioService.logCardio(this.cardioForm.value).subscribe({
      next: () => {
        this.cardioForm.patchValue({
          durationMinutes: null,
          cardioType: ''
        });
        this.chartComponent.reload();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        console.error('Failed to log cardio', err);
        this.isSubmitting.set(false);
      }
    });
  }
}

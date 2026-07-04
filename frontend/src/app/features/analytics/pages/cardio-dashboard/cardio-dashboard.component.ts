import { Component, inject, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CardioChartComponent } from '../../components/cardio-chart/cardio-chart.component';
import { CardioLogService } from '../../services/cardio-log.service';

@Component({
  standalone: true,
  selector: 'app-cardio-dashboard',
  imports: [CommonModule, ReactiveFormsModule, CardioChartComponent],
  template: `
    <div class="max-w-7xl mx-auto space-y-6">
      
      <header class="mb-4">
        <h1 class="text-2xl font-bold text-white tracking-tight sm:text-3xl">
          Cardio <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">Dashboard</span>
        </h1>
      </header>

      <!-- Logging Form -->
      <div class="glass-panel p-6 rounded-2xl mb-6">
        <h2 class="text-lg font-semibold text-white mb-4">Log Cardio Session</h2>
        
        <form [formGroup]="cardioForm" (ngSubmit)="onSubmit()" class="flex flex-col sm:flex-row items-end gap-4">
          
          <div class="flex-1 w-full">
            <label for="performedOn" class="block text-sm font-medium text-gray-400 mb-1">Date</label>
            <input id="performedOn" type="date" formControlName="performedOn" 
                   class="w-full bg-gray-800 text-white rounded-lg border border-gray-700 px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none">
          </div>
          
          <div class="flex-1 w-full">
            <label for="durationMinutes" class="block text-sm font-medium text-gray-400 mb-1">Duration (min)</label>
            <input id="durationMinutes" type="number" formControlName="durationMinutes" min="1" placeholder="e.g. 30"
                   class="w-full bg-gray-800 text-white rounded-lg border border-gray-700 px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none">
          </div>

          <div class="flex-1 w-full">
            <label for="cardioType" class="block text-sm font-medium text-gray-400 mb-1">Type (Optional)</label>
            <input id="cardioType" type="text" formControlName="cardioType" placeholder="e.g. Treadmill"
                   class="w-full bg-gray-800 text-white rounded-lg border border-gray-700 px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none">
          </div>

          <button type="submit" [disabled]="cardioForm.invalid || isSubmitting()"
                  class="w-full sm:w-auto px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 h-[42px]">
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

  @ViewChild(CardioChartComponent) chartComponent!: CardioChartComponent;

  isSubmitting = signal(false);

  cardioForm: FormGroup = this.fb.group({
    performedOn: [new Date().toISOString().split('T')[0], Validators.required],
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

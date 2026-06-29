import { Component, OnInit, inject, signal } from '@angular/core';
import { ExerciseSearchComponent } from '../../../exercises/components/exercise-search/exercise-search.component';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { AnalyticsService } from '../../services/analytics.service';
import { ExerciseService } from '../../../exercises/services/exercise.service';
import { Exercise } from '../../../../core/types/training.types';
import { finalize } from 'rxjs';

@Component({
    selector: 'app-progress-chart',
    imports: [CommonModule, ReactiveFormsModule, BaseChartDirective, ExerciseSearchComponent],
    templateUrl: './progress-chart.component.html',
    styles: ``
})
export class ProgressChartComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);
  private exerciseService = inject(ExerciseService);
  private fb = inject(FormBuilder);

  exercises = signal<Exercise[]>([]);
  selectedExerciseName = signal<string | null>(null);
  isLoading = signal(false);
  
  weightIncrease = signal<number | null>(null);
  volumeIncrease = signal<number | null>(null);

  form: FormGroup = this.fb.group({
    exerciseId: [''],
    showVolume: [false]
  });

  public lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: true,
        labels: { color: '#e2e8f0' } // Slate 200
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)', // Slate 900
        titleColor: '#e2e8f0', // Slate 200
        bodyColor: '#e2e8f0', // Slate 200
        padding: 12,
        cornerRadius: 8,
        mode: 'index',
        intersect: false
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8' } // Slate 400
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: '#10b981' }, // Emerald 500 for Weight
        title: { display: true, text: 'Weight (kg)', color: '#10b981' }
      },
      y1: {
        type: 'linear',
        display: false, // Toggled dynamically
        position: 'right',
        grid: { drawOnChartArea: false }, 
        ticks: { color: '#8b5cf6' }, // Violet 500 for Volume
        title: { display: true, text: 'Volume (kg)', color: '#8b5cf6' }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  public lineChartType: ChartType = 'line';
  
  public lineChartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: []
  };

  ngOnInit() {
    this.loadExercises();

    this.form.get('exerciseId')?.valueChanges.subscribe(exId => {
      if (exId) {
        this.loadProgress(exId);
      } else {
        this.resetChart();
      }
    });

    this.form.get('showVolume')?.valueChanges.subscribe(show => {
      this.toggleVolumeDisplay(show);
    });
  }

  loadExercises() {
    this.exerciseService.getExercises().subscribe({
      next: (exs) => {
        this.exercises.set(exs);
        if (exs.length > 0) {
          this.form.get('exerciseId')?.setValue(exs[0].id);
        }
      }
    });
  }

  onExerciseSelect(exercise: Exercise) {
    this.selectedExerciseName.set(exercise.name);
    this.form.get('exerciseId')?.setValue(exercise.id);
  }

  loadProgress(exerciseId: string) {
    this.isLoading.set(true);
    this.analyticsService.getExerciseProgress(exerciseId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => {
          const showVolume = this.form.get('showVolume')?.value;

          const labels = data.map(d => new Date(d.sessionDate).toLocaleDateString());
          const maxWeights = data.map(d => d.maxWeightKg);
          const totalVolumes = data.map(d => d.totalVolumeKg);

          if (data.length >= 2) {
            const last = data[data.length - 1];
            const prev = data[data.length - 2];
            
            if (prev.maxWeightKg > 0) {
              const weightDiff = last.maxWeightKg - prev.maxWeightKg;
              this.weightIncrease.set((weightDiff / prev.maxWeightKg) * 100);
            } else {
              this.weightIncrease.set(null);
            }

            if (prev.totalVolumeKg > 0) {
              const volDiff = last.totalVolumeKg - prev.totalVolumeKg;
              this.volumeIncrease.set((volDiff / prev.totalVolumeKg) * 100);
            } else {
              this.volumeIncrease.set(null);
            }
          } else {
            this.weightIncrease.set(null);
            this.volumeIncrease.set(null);
          }

          this.lineChartData = {
            labels,
            datasets: [
              {
                data: maxWeights,
                label: 'Max Weight (kg)',
                backgroundColor: 'rgba(16, 185, 129, 0.2)', // Emerald 500
                borderColor: '#10b981',
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#10b981',
                fill: 'origin',
                tension: 0.4,
                yAxisID: 'y'
              },
              {
                data: totalVolumes,
                label: 'Total Volume (kg)',
                backgroundColor: 'rgba(139, 92, 246, 0.2)', // Violet 500
                borderColor: '#8b5cf6',
                pointBackgroundColor: '#8b5cf6',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#8b5cf6',
                fill: false,
                tension: 0.4,
                yAxisID: 'y1',
                hidden: !showVolume // Hide dataset if toggle is off
              }
            ]
          };
          this.toggleVolumeDisplay(showVolume);
        }
      });
  }

  toggleVolumeDisplay(show: boolean) {
    // Update Y-axis visibility
    if (this.lineChartOptions?.scales?.['y1']) {
       this.lineChartOptions.scales['y1'].display = show;
    }
    
    // Update dataset visibility
    if (this.lineChartData.datasets && this.lineChartData.datasets.length > 1) {
       this.lineChartData.datasets[1].hidden = !show;
       // We must create a new object reference to trigger ng2-charts update
       this.lineChartData = { ...this.lineChartData };
       this.lineChartOptions = { ...this.lineChartOptions };
    }
  }

  resetChart() {
    this.lineChartData = { labels: [], datasets: [] };
  }
}

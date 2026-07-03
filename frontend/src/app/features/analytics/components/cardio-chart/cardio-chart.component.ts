import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { ExerciseService } from '../../../exercises/services/exercise.service';
import { Exercise, ExerciseHistoryResponse } from '../../../../core/types/training.types';

@Component({
  selector: 'app-cardio-chart',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './cardio-chart.component.html',
  styles: ``
})
export class CardioChartComponent implements OnInit {
  private exerciseService = inject(ExerciseService);

  isLoading = signal(true);
  exercises = signal<Exercise[]>([]);
  selectedExerciseId = signal<string>('');
  historyData = signal<ExerciseHistoryResponse[]>([]);

  public chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#e2e8f0',
        bodyColor: '#e2e8f0',
        padding: 12,
        cornerRadius: 8,
        mode: 'index',
        intersect: false
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8' }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: '#10b981' }, // Emerald 500
        title: { display: true, text: 'Duration (Minutes)', color: '#10b981' },
        beginAtZero: true
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  public chartType: ChartType = 'line';
  public chartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: []
  };

  constructor() {
    effect(() => {
      const exId = this.selectedExerciseId();
      if (exId) {
        this.loadHistory(exId);
      } else {
        this.historyData.set([]);
        this.updateChart();
      }
    });
  }

  ngOnInit() {
    this.loadExercises();
  }

  private loadExercises() {
    this.isLoading.set(true);
    this.exerciseService.getExercises().subscribe({
      next: (allExercises) => {
        // Filter only CARDIO exercises
        const cardio = allExercises.filter(ex => ex.type === 'CARDIO');
        this.exercises.set(cardio);
        
        if (cardio.length > 0) {
          this.selectedExerciseId.set(cardio[0].id);
        } else {
          this.isLoading.set(false);
        }
      },
      error: (err) => {
        console.error('Failed to load exercises', err);
        this.isLoading.set(false);
      }
    });
  }

  private loadHistory(exerciseId: string) {
    this.isLoading.set(true);
    this.exerciseService.getExerciseHistory(exerciseId).subscribe({
      next: (history) => {
        this.historyData.set(history);
        this.updateChart();
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load exercise history', err);
        this.isLoading.set(false);
      }
    });
  }

  private updateChart() {
    const data = this.historyData();
    if (!data || data.length === 0) {
      this.chartData = { labels: [], datasets: [] };
      return;
    }

    // Group by performedOn just in case there are multiple sets on the same day.
    // For cardio, we typically sum the duration minutes.
    const aggregated = new Map<string, number>();
    
    data.forEach(entry => {
      const date = entry.performedOn;
      const duration = entry.durationMinutes || 0;
      aggregated.set(date, (aggregated.get(date) || 0) + duration);
    });

    // Sort dates ascending
    const sortedDates = Array.from(aggregated.keys()).sort();
    
    this.chartData = {
      labels: sortedDates, // e.g. '2024-05-12'
      datasets: [
        {
          data: sortedDates.map(d => aggregated.get(d)!),
          label: 'Total Duration (min)',
          backgroundColor: 'rgba(16, 185, 129, 0.2)', // Emerald with opacity
          borderColor: '#10b981', // Emerald 500
          borderWidth: 3,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#10b981',
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.3 // Smooth curve
        }
      ]
    };
  }
}

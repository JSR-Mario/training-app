import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { AnalyticsService } from '../../services/analytics.service';
import { ProgramService } from '../../../programs/services/program.service';
import { ExerciseService } from '../../../exercises/services/exercise.service';
import { ExerciseProgressEntry } from '../../../../core/types/analytics.types';
import { finalize, forkJoin, map, switchMap, of } from 'rxjs';

interface ProgramExercise {
  id: string;
  name: string;
  checked: boolean;
  color: string;
}

@Component({
  selector: 'app-progress-chart',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './progress-chart.component.html',
  styles: ``
})
export class ProgressChartComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);
  private programService = inject(ProgramService);
  private exerciseService = inject(ExerciseService);

  isLoading = signal(true);
  
  programExercises = signal<ProgramExercise[]>([]);
  
  // Store raw data: map of exerciseId -> entries
  private rawData = new Map<string, ExerciseProgressEntry[]>();

  public chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: false // We will use our own custom legend/checkboxes
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
        stacked: true,
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8' } // Slate 400
      },
      y: {
        stacked: true,
        type: 'linear',
        display: true,
        position: 'left',
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: '#8b5cf6' }, // Violet 500
        title: { display: true, text: 'Total Volume (kg)', color: '#8b5cf6' }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  public chartType: ChartType = 'bar';
  public chartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: []
  };

  private colorPalette = [
    '#8b5cf6', // violet
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
    '#6366f1', // indigo
    '#84cc16'  // lime
  ];

  ngOnInit() {
    this.loadProgramData();
  }

  loadProgramData() {
    this.isLoading.set(true);
    // 1. Get programs to find the active one
    this.programService.getPrograms().pipe(
      switchMap(programs => {
        const active = programs.find(p => p.isActive) || programs[0];
        if (!active) return of([]); // No programs
        return this.programService.getWeeks(active.id);
      }),
      switchMap(weeks => {
        if (!weeks || weeks.length === 0) return of([]);
        // Fetch all days for all weeks
        const dayRequests = weeks.map(w => this.programService.getDays(w.id));
        return forkJoin(dayRequests);
      }),
      switchMap(daysArray => {
        const allDays = daysArray.flat();
        if (allDays.length === 0) return of([]);
        // Fetch exercises for all days
        const exerciseReqs = allDays.map(d => this.programService.getDayExercises(d.id));
        return forkJoin(exerciseReqs);
      }),
      switchMap(dayExercisesArray => {
        const allDayExercises = dayExercisesArray.flat();
        const uniqueExIds = Array.from(new Set(allDayExercises.map(ex => ex.exerciseId)));
        
        if (uniqueExIds.length === 0) return of([]);

        // Fetch catalog exercises to get names
        return this.exerciseService.getExercises().pipe(
          map(catalog => {
            return uniqueExIds.map((id, index) => {
              const catEx = catalog.find(c => c.id === id);
              return {
                id,
                name: catEx?.name || 'Unknown',
                checked: true,
                color: this.colorPalette[index % this.colorPalette.length]
              };
            });
          })
        );
      }),
      switchMap(programExs => {
        if (!programExs || programExs.length === 0) {
          return of([]);
        }
        
        this.programExercises.set(programExs);

        // Fetch progress for all these unique exercises
        const progressReqs = programExs.map(ex => 
          this.analyticsService.getExerciseProgress(ex.id).pipe(
            map(data => ({ exerciseId: ex.id, data }))
          )
        );
        
        return forkJoin(progressReqs);
      }),
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (results: { exerciseId: string; data: ExerciseProgressEntry[] }[]) => {
        if (!results || results.length === 0) {
          this.resetChart();
          return;
        }

        // Store raw data
        for (const res of results) {
          this.rawData.set(res.exerciseId, res.data);
        }

        this.updateChart();
      },
      error: (err) => {
        console.error('Error loading program analytics', err);
        this.resetChart();
      }
    });
  }

  toggleExercise(exerciseId: string) {
    const current = this.programExercises();
    const ex = current.find(e => e.id === exerciseId);
    if (ex) {
      ex.checked = !ex.checked;
      this.programExercises.set([...current]);
      this.updateChart();
    }
  }

  private getWeekStart(dateStr: string): string {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const start = new Date(d.setDate(diff));
    return start.toISOString().split('T')[0];
  }

  private updateChart() {
    const exercises = this.programExercises();
    if (exercises.length === 0) {
      this.resetChart();
      return;
    }

    // 1. Collect all unique weeks across all checked exercises
    const weekSet = new Set<string>();
    
    for (const ex of exercises) {
      if (!ex.checked) continue;
      const data = this.rawData.get(ex.id);
      if (data) {
        data.forEach(entry => {
          weekSet.add(this.getWeekStart(entry.sessionDate));
        });
      }
    }

    if (weekSet.size === 0) {
      this.resetChart();
      return;
    }

    const sortedWeeks = Array.from(weekSet).sort();

    // 2. Build datasets
    const datasets = [];

    for (const ex of exercises) {
      if (!ex.checked) continue;
      
      const raw = this.rawData.get(ex.id) || [];
      
      // Aggregate volume per week
      const volumeByWeek = new Map<string, number>();
      for (const entry of raw) {
        const week = this.getWeekStart(entry.sessionDate);
        const current = volumeByWeek.get(week) || 0;
        volumeByWeek.set(week, current + entry.totalVolumeKg);
      }

      // Map to sorted weeks array
      const dataPoints = sortedWeeks.map(week => volumeByWeek.get(week) || 0);

      // Only add dataset if it has >0 volume in at least one week
      if (dataPoints.some(v => v > 0)) {
        datasets.push({
          label: ex.name,
          data: dataPoints,
          backgroundColor: ex.color + 'CC', // 80% opacity
          borderColor: ex.color,
          borderWidth: 1,
          stack: 'Volume'
        });
      }
    }

    // Format week labels nicely (e.g. "Week of YYYY-MM-DD")
    const labels = sortedWeeks.map(w => 'Week of ' + w);

    this.chartData = {
      labels,
      datasets
    };
  }

  private resetChart() {
    this.chartData = { labels: [], datasets: [] };
  }
}

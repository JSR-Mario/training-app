import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { AnalyticsService } from '../../services/analytics.service';
import { ProgramService } from '../../../programs/services/program.service';
import { ExerciseService } from '../../../exercises/services/exercise.service';
import { ExerciseProgressEntry } from '../../../../core/types/analytics.types';
import { finalize, forkJoin, map, switchMap, of, Subject } from 'rxjs';

import { Exercise, ExerciseTarget, DayTemplate } from '../../../../core/types/training.types';

interface ProgramBodyPart {
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
  
  programBodyParts = signal<ProgramBodyPart[]>([]);
  allBodyPartsSelected = computed(() => {
    const parts = this.programBodyParts();
    return parts.length > 0 && parts.every(p => p.checked);
  });
  
  uniqueDayNames = signal<string[]>([]);
  selectedDayFilter = signal<string>('All');
  private programDays: DayTemplate[] = [];

  private catalogExercises: Exercise[] = [];
  // Store mapped data: map of bodyPartId -> entries
  private bodyPartData = new Map<string, { weekNumber: number, dayTemplateId: string, volume: number }[]>();

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

  programs = signal<{id: string, name: string}[]>([]);
  selectedProgramId = signal<string>('');

  private destroy$ = new Subject<void>();

  constructor() {
    // When selected filters change, recalculate the chart data
    effect(() => {
      this.updateChart();
    });
    
    // When selected program changes, reload analytics
    effect(() => {
      const pid = this.selectedProgramId();
      if (pid) {
        this.loadProgramData(pid);
      }
    });
  }

  ngOnInit() {
    this.loadPrograms();
  }

  private loadPrograms() {
    this.isLoading.set(true);
    this.programService.getPrograms().subscribe({
      next: (programs) => {
        if (!programs || programs.length === 0) {
          this.isLoading.set(false);
          return;
        }
        
        // Sort active first, then by date desc
        const sorted = [...programs].sort((a, b) => {
          if (a.isActive && !b.isActive) return -1;
          if (!a.isActive && b.isActive) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        this.programs.set(sorted.map(p => ({ id: p.id, name: p.name })));
        
        // Default to first (which is active if one exists)
        this.selectedProgramId.set(sorted[0].id);
      },
      error: (err) => {
        console.error('Error loading programs', err);
        this.isLoading.set(false);
      }
    });
  }

  private loadProgramData(programId: string) {
    this.isLoading.set(true);
    this.programBodyParts.set([]);
    this.uniqueDayNames.set([]);
    this.bodyPartData.clear();
    this.resetChart();

    this.programService.getWeeks(programId).pipe(
      switchMap(weeks => {
        if (!weeks || weeks.length === 0) return of([]);
        // Fetch all days for all weeks
        const dayRequests = weeks.map(w => this.programService.getDays(w.id));
        return forkJoin(dayRequests);
      }),
      switchMap(daysArray => {
        const allDays = daysArray.flat();
        this.programDays = allDays;
        
        const uniqueNames = Array.from(new Set(allDays.map(d => d.name))).sort();
        this.uniqueDayNames.set(uniqueNames);

        if (allDays.length === 0) return of([]);
        // Fetch exercises for all days
        const exerciseReqs = allDays.map(d => this.programService.getDayExercises(d.id));
        return forkJoin(exerciseReqs);
      }),
      switchMap(dayExercisesArray => {
        const allDayExercises = dayExercisesArray.flat();
        const uniqueExIds = Array.from(new Set(allDayExercises.map(ex => ex.exerciseId)));
        
        if (uniqueExIds.length === 0) return of([]);

        return this.exerciseService.getExercises().pipe(
          map(catalog => {
            this.catalogExercises = catalog;
            return uniqueExIds;
          })
        );
      }),
      switchMap(uniqueExIds => {
        if (!uniqueExIds || uniqueExIds.length === 0) {
          return of([]);
        }
        
        // Fetch progress for all these unique exercises
        const progressReqs = uniqueExIds.map(id => 
          this.analyticsService.getExerciseProgress(id).pipe(
            map(data => ({ exerciseId: id, data }))
          )
        );
        
        return forkJoin(progressReqs);
      }),
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (results: { exerciseId: string; data: ExerciseProgressEntry[] }[]) => {
        console.log('DEBUG loadProgramData results:', results);
        if (!results || results.length === 0) {
          this.resetChart();
          return;
        }

        const bodyPartsSet = new Set<string>();
        const mappedData = new Map<string, { weekNumber: number, dayTemplateId: string, volume: number }[]>();

        for (const res of results) {
          const catEx = this.catalogExercises.find(c => c.id === res.exerciseId);
          if (!catEx || !catEx.targets) {
            console.log('DEBUG missing catalog/targets for ex:', res.exerciseId, catEx);
            continue;
          }

          catEx.targets.forEach((target: ExerciseTarget) => {
             bodyPartsSet.add(target.bodyPart);
          });

          res.data.forEach(entry => {
            // fallback to 1 if weekNumber is missing for old data
            const week = entry.weekNumber || 1; 

            catEx.targets.forEach((target: ExerciseTarget) => {
              const bp = target.bodyPart;
              const volumeForBp = entry.totalVolumeKg * target.targetValue;
              
              if (!mappedData.has(bp)) mappedData.set(bp, []);
              mappedData.get(bp)!.push({ weekNumber: week, dayTemplateId: entry.dayTemplateId, volume: volumeForBp });
            });
          });
        }

        console.log('DEBUG bodyPartsSet:', Array.from(bodyPartsSet));
        console.log('DEBUG mappedData:', mappedData);

        const bps = Array.from(bodyPartsSet).sort().map((bp, index) => ({
          id: bp,
          name: bp.replace(/_/g, ' '),
          checked: true,
          color: this.colorPalette[index % this.colorPalette.length]
        }));
        
        this.programBodyParts.set(bps);
        this.bodyPartData = mappedData;

        this.updateChart();
      },
      error: (err) => {
        console.error('Error loading program analytics', err);
        this.resetChart();
      }
    });
  }

  toggleBodyPart(bodyPartId: string) {
    const current = this.programBodyParts();
    const bp = current.find(e => e.id === bodyPartId);
    if (bp) {
      bp.checked = !bp.checked;
      this.programBodyParts.set([...current]);
      this.updateChart();
    }
  }

  toggleAllBodyParts(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.programBodyParts.update(parts => parts.map(p => ({ ...p, checked })));
    this.updateChart();
  }

  onFilterChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedDayFilter.set(target.value);
    this.updateChart();
  }

  private updateChart() {
    const bodyParts = this.programBodyParts();
    if (bodyParts.length === 0) {
      this.resetChart();
      return;
    }

    const filter = this.selectedDayFilter();
    const validDayIds = new Set(
      this.programDays.filter(d => filter === 'All' || d.name === filter).map(d => d.id)
    );

    console.log('DEBUG updateChart filter:', filter);
    console.log('DEBUG updateChart validDayIds:', Array.from(validDayIds));

    const weekSet = new Set<number>();
    
    for (const bp of bodyParts) {
      if (!bp.checked) continue;
      const data = this.bodyPartData.get(bp.id);
      if (data) {
        data.forEach(entry => {
          if (filter === 'All' || validDayIds.has(entry.dayTemplateId)) {
            weekSet.add(entry.weekNumber);
          }
        });
      }
    }

    console.log('DEBUG updateChart weekSet:', Array.from(weekSet));

    if (weekSet.size === 0) {
      console.log('DEBUG updateChart: weekSet size is 0, resetting chart');
      this.resetChart();
      return;
    }

    const sortedWeeks = Array.from(weekSet).sort((a,b) => a - b);
    const datasets = [];

    for (const bp of bodyParts) {
      if (!bp.checked) continue;
      
      const raw = this.bodyPartData.get(bp.id) || [];
      const volumeByWeek = new Map<number, number>();
      
      for (const entry of raw) {
        if (filter !== 'All' && !validDayIds.has(entry.dayTemplateId)) continue;
        const current = volumeByWeek.get(entry.weekNumber) || 0;
        volumeByWeek.set(entry.weekNumber, current + entry.volume);
      }

      const dataPoints = sortedWeeks.map(week => volumeByWeek.get(week) || 0);

      datasets.push({
        label: bp.name,
        data: dataPoints,
        backgroundColor: bp.color + 'CC',
        borderColor: bp.color,
        borderWidth: 1,
        stack: 'Volume'
      });
    }

    const labels = sortedWeeks.map(w => 'Week ' + w);

    this.chartData = {
      labels,
      datasets
    };
  }

  private resetChart() {
    this.chartData = { labels: [], datasets: [] };
  }
}

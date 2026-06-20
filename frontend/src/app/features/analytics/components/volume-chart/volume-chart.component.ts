import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { AnalyticsService } from '../../services/analytics.service';
import { ProgramService } from '../../../programs/services/program.service';
import { TrainingProgram, WeekTemplate } from '../../../../core/types/training.types';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-volume-chart',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BaseChartDirective],
  templateUrl: './volume-chart.component.html',
  styles: ``
})
export class VolumeChartComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);
  private programService = inject(ProgramService);
  private fb = inject(FormBuilder);

  programs = signal<TrainingProgram[]>([]);
  weeks = signal<WeekTemplate[]>([]);
  isLoading = signal(false);

  form: FormGroup = this.fb.group({
    programId: [''],
    weekNumber: ['']
  });

  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)', // Slate 900
        titleColor: '#38bdf8', // Sky 400
        bodyColor: '#e2e8f0', // Slate 200
        padding: 12,
        cornerRadius: 8,
        displayColors: false
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: '#94a3b8' } // Slate 400
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: '#94a3b8' },
        beginAtZero: true
      }
    }
  };

  public barChartType: ChartType = 'bar';

  public barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: 'rgba(56, 189, 248, 0.6)', // Sky 400 with opacity
        borderColor: '#38bdf8', // Sky 400
        borderWidth: 2,
        borderRadius: 4,
        hoverBackgroundColor: 'rgba(56, 189, 248, 0.8)'
      }
    ]
  };

  ngOnInit() {
    this.loadPrograms();

    this.form.get('programId')?.valueChanges.subscribe(programId => {
      if (programId) {
        this.loadWeeks(programId);
      } else {
        this.weeks.set([]);
        this.form.get('weekNumber')?.setValue('');
        this.resetChart();
      }
    });

    this.form.get('weekNumber')?.valueChanges.subscribe(weekNum => {
      const pId = this.form.get('programId')?.value;
      if (pId && weekNum) {
        this.loadVolume(pId, Number(weekNum));
      } else {
        this.resetChart();
      }
    });
  }

  loadPrograms() {
    this.programService.getPrograms().subscribe({
      next: (progs) => {
        this.programs.set(progs);
        if (progs.length > 0) {
          this.form.get('programId')?.setValue(progs[0].id);
        }
      }
    });
  }

  loadWeeks(programId: string) {
    this.programService.getWeeks(programId).subscribe({
      next: (ws) => {
        this.weeks.set(ws);
        if (ws.length > 0) {
          // If a week is available, set to the first one (week 1)
          this.form.get('weekNumber')?.setValue(1);
        }
      }
    });
  }

  loadVolume(programId: string, weekNumber: number) {
    this.isLoading.set(true);
    this.analyticsService.getWeeklyVolume(programId, weekNumber)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => {
          this.barChartData = {
            labels: data.map(d => d.bodyPart),
            datasets: [
              {
                data: data.map(d => d.totalSets),
                backgroundColor: 'rgba(56, 189, 248, 0.6)',
                borderColor: '#38bdf8',
                borderWidth: 2,
                borderRadius: 4,
                hoverBackgroundColor: 'rgba(56, 189, 248, 0.8)'
              }
            ]
          };
        }
      });
  }

  resetChart() {
    this.barChartData = { labels: [], datasets: [{ data: [] }] };
  }
}

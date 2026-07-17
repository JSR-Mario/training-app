import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { CardioLogService } from '../../services/cardio-log.service';
import { CardioLogResponse } from '../../../../core/types/training.types';
import { CARDIO_TYPES } from '../../../../core/constants/cardio-types';

@Component({
  selector: 'app-cardio-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './cardio-chart.component.html',
  styles: ``
})
export class CardioChartComponent implements OnInit {
  private cardioService = inject(CardioLogService);

  isLoading = signal(true);
  logs = signal<CardioLogResponse[]>([]);

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
        stacked: true,
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8' }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        stacked: true,
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

  public chartType: ChartType = 'bar';
  public chartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: []
  };

  ngOnInit() {
    this.loadLogs();
  }

  // Allow external components to trigger a reload
  reload() {
    this.loadLogs();
  }

  private loadLogs() {
    this.isLoading.set(true);
    this.cardioService.getLogs().subscribe({
      next: (logs) => {
        this.logs.set(logs);
        this.updateChart();
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load cardio logs', err);
        this.isLoading.set(false);
      }
    });
  }

  private updateChart() {
    const data = this.logs();
    if (!data || data.length === 0) {
      this.chartData = { labels: [], datasets: [] };
      return;
    }

    const aggregated = new Map<string, Map<string, number>>();
    const allTypes = new Set<string>();

    data.forEach(entry => {
      const date = entry.performedOn;
      const type = (entry.cardioType || 'Other').trim();
      const displayType = type === '' ? 'Other' : type;
      const duration = entry.durationMinutes || 0;
      
      allTypes.add(displayType);

      if (!aggregated.has(date)) {
        aggregated.set(date, new Map<string, number>());
      }
      const dateMap = aggregated.get(date)!;
      dateMap.set(displayType, (dateMap.get(displayType) || 0) + duration);
    });

    const sortedDates = Array.from(aggregated.keys()).sort();
    const typeOrder = CARDIO_TYPES.map(t => t.value) as string[];
    const sortedTypes = Array.from(allTypes).sort((a, b) => {
      const idxA = typeOrder.indexOf(a);
      const idxB = typeOrder.indexOf(b);
      // Known types first in predefined order, unknown types at the end
      return (idxA === -1 ? typeOrder.length : idxA) - (idxB === -1 ? typeOrder.length : idxB);
    });

    const datasets = sortedTypes.map(type => {
      const typeDef = CARDIO_TYPES.find(t => t.value === type) || CARDIO_TYPES.find(t => t.value === 'Other')!;
      const colorOptions = typeDef.color;
      return {
        label: type,
        data: sortedDates.map(d => aggregated.get(d)?.get(type) || 0),
        backgroundColor: colorOptions.bg,
        borderColor: colorOptions.border,
        borderWidth: 2,
        borderRadius: 4
      };
    });

    this.chartData = {
      labels: sortedDates,
      datasets: datasets
    };
  }
}

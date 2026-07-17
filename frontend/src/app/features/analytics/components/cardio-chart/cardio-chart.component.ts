import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { CardioLogService } from '../../services/cardio-log.service';
import { CardioLogResponse } from '../../../../core/types/training.types';

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

    const KNOWN_TYPES = [
      { name: 'Running',       bg: 'rgba(59, 130, 246, 0.8)',  border: '#3b82f6' }, // Blue
      { name: 'Walking',       bg: 'rgba(16, 185, 129, 0.8)',  border: '#10b981' }, // Emerald
      { name: 'Cycling',       bg: 'rgba(245, 158, 11, 0.8)',  border: '#f59e0b' }, // Amber
      { name: 'Swimming',      bg: 'rgba(14, 165, 233, 0.8)',  border: '#0ea5e9' }, // Sky
      { name: 'Rowing',        bg: 'rgba(244, 63, 94, 0.8)',   border: '#f43f5e' }, // Rose
      { name: 'Elliptical',    bg: 'rgba(168, 85, 247, 0.8)',  border: '#a855f7' }, // Purple
      { name: 'Jump Rope',     bg: 'rgba(236, 72, 153, 0.8)',  border: '#ec4899' }, // Pink
      { name: 'Stair Climber', bg: 'rgba(249, 115, 22, 0.8)',  border: '#f97316' }, // Orange
      { name: 'HIIT',          bg: 'rgba(239, 68, 68, 0.8)',   border: '#ef4444' }  // Red
    ];
    const OTHER_COLOR = { bg: 'rgba(148, 163, 184, 0.8)', border: '#94a3b8' }; // Slate
    const knownNames = new Set(KNOWN_TYPES.map(t => t.name));

    const aggregated = new Map<string, Map<string, number>>();
    const presentTypes = new Set<string>();

    data.forEach(entry => {
      const date = entry.performedOn;
      let type = (entry.cardioType || 'Other').trim();
      
      // Group anything not in the predefined list into 'Other'
      if (type === '' || !knownNames.has(type)) {
        type = 'Other';
      }
      
      presentTypes.add(type);

      if (!aggregated.has(date)) {
        aggregated.set(date, new Map<string, number>());
      }
      const dateMap = aggregated.get(date)!;
      dateMap.set(type, (dateMap.get(type) || 0) + (entry.durationMinutes || 0));
    });

    const sortedDates = Array.from(aggregated.keys()).sort();
    
    // Sort types: known types in defined order, then 'Other'
    const sortedTypes = Array.from(presentTypes).sort((a, b) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      const idxA = KNOWN_TYPES.findIndex(t => t.name === a);
      const idxB = KNOWN_TYPES.findIndex(t => t.name === b);
      return idxA - idxB;
    });

    const datasets = sortedTypes.map(type => {
      const colorDef = KNOWN_TYPES.find(t => t.name === type) || OTHER_COLOR;
      return {
        label: type,
        data: sortedDates.map(d => aggregated.get(d)?.get(type) || 0),
        backgroundColor: colorDef.bg,
        borderColor: colorDef.border,
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

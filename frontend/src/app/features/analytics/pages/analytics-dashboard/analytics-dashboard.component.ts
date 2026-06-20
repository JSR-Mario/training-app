import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VolumeChartComponent } from '../../components/volume-chart/volume-chart.component';
import { ProgressChartComponent } from '../../components/progress-chart/progress-chart.component';

type Tab = 'volume' | 'progress';

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [CommonModule, VolumeChartComponent, ProgressChartComponent],
  templateUrl: './analytics-dashboard.component.html',
  styles: ``
})
export class AnalyticsDashboardComponent {
  activeTab = signal<Tab>('volume');

  setTab(tab: Tab) {
    this.activeTab.set(tab);
  }
}

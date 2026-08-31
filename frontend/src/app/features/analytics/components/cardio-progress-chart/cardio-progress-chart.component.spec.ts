import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { of } from 'rxjs';

import { CardioProgressChartComponent } from './cardio-progress-chart.component';
import { CardioLogService } from '../../services/cardio-log.service';
import { CardioLogResponse } from '../../../../core/types/training.types';

describe('CardioProgressChartComponent', () => {
  let component: CardioProgressChartComponent;
  let fixture: ComponentFixture<CardioProgressChartComponent>;
  let cardioService: CardioLogService;

  const mockLogs: CardioLogResponse[] = [
    {
      id: '1',
      durationMinutes: 30,
      distanceKm: 5.0,
      cardioType: 'Running',
      performedOn: '2026-08-20',
      createdAt: '2026-08-20T10:00:00Z'
    },
    {
      id: '2',
      durationMinutes: 50,
      distanceKm: 10.0,
      cardioType: 'Running',
      performedOn: '2026-08-25',
      createdAt: '2026-08-25T10:00:00Z'
    },
    {
      id: '3',
      durationMinutes: 20,
      distanceKm: null,
      cardioType: 'Jump Rope',
      performedOn: '2026-08-28',
      createdAt: '2026-08-28T10:00:00Z'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardioProgressChartComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideCharts(withDefaultRegisterables())
      ]
    }).compileComponents();

    cardioService = TestBed.inject(CardioLogService);
    spyOn(cardioService, 'getLogs').and.returnValue(of(mockLogs));

    fixture = TestBed.createComponent(CardioProgressChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load cardio progression logs', () => {
    expect(component).toBeTruthy();
    expect(component.logs().length).toBe(3);
  });

  it('should calculate PRs accurately across all activities', () => {
    expect(component.maxDistance()).toBe(10.0);
    expect(component.maxDuration()).toBe(50);
    expect(component.bestPace()).toBe('5:00 /km'); // 50min/10km = 5.0 min/km
  });

  it('should filter by specific activity and update PRs and chart datasets', () => {
    component.onActivityChange('Running');
    expect(component.filteredLogs().length).toBe(2);
    expect(component.maxDistance()).toBe(10.0);
    expect(component.maxDuration()).toBe(50);
    expect(component.bestPace()).toBe('5:00 /km');
    expect(component.chartData.datasets.some(d => d.label === 'Distance (km)')).toBeTrue();
    expect(component.chartData.datasets.some(d => d.label === 'Duration (min)')).toBeTrue();

    // Switch to Jump Rope (no distance)
    component.onActivityChange('Jump Rope');
    expect(component.filteredLogs().length).toBe(1);
    expect(component.maxDistance()).toBeNull();
    expect(component.maxDuration()).toBe(20);
    expect(component.bestPace()).toBeNull();
    expect(component.chartData.datasets.some(d => d.label === 'Distance (km)')).toBeFalse();
    expect(component.chartData.datasets.some(d => d.label === 'Duration (min)')).toBeTrue();
  });

  it('should filter by time range', () => {
    component.onTimeRangeChange('1M');
    expect(component.selectedTimeRange()).toBe('1M');
  });

  it('should format duration correctly', () => {
    expect(component.formatDuration(0)).toBe('0 min');
    expect(component.formatDuration(45)).toBe('45 min');
    expect(component.formatDuration(60)).toBe('1h');
    expect(component.formatDuration(75)).toBe('1h 15m');
  });
});

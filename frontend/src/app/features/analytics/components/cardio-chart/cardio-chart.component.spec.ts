import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { CardioChartComponent } from './cardio-chart.component';

describe('CardioChartComponent', () => {
  let component: CardioChartComponent;
  let fixture: ComponentFixture<CardioChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardioChartComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideCharts(withDefaultRegisterables())
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardioChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to 7D range and ALL activity', () => {
    expect(component.activeRange()).toBe('7D');
    expect(component.selectedActivity()).toBe('ALL');
  });

  it('should change range when setRange is called', () => {
    component.setRange('1M');
    expect(component.activeRange()).toBe('1M');
  });

  it('should change activity when setActivity is called', () => {
    component.setActivity('Running');
    expect(component.selectedActivity()).toBe('Running');
  });

  it('should format duration properly', () => {
    expect(component.formatDuration(0)).toBe('0 min');
    expect(component.formatDuration(45)).toBe('45 min');
    expect(component.formatDuration(60)).toBe('1h');
    expect(component.formatDuration(90)).toBe('1h 30m');
  });

  it('should compute KPIs and chart datasets for all activities and specific activity', () => {
    const todayStr = new Date().toISOString().split('T')[0];
    component.logs.set([
      {
        id: '1',
        durationMinutes: 30,
        distanceKm: 5.0,
        cardioType: 'Running',
        performedOn: todayStr,
        createdAt: '2026-08-31T10:00:00Z'
      },
      {
        id: '2',
        durationMinutes: 20,
        distanceKm: null,
        cardioType: 'Jump Rope',
        performedOn: todayStr,
        createdAt: '2026-08-31T11:00:00Z'
      }
    ]);

    // Test ALL activities mode
    component.setActivity('ALL');
    expect(component.sessionCount()).toBe(2);
    expect(component.totalDurationMinutes()).toBe(50);
    expect(component.totalDistanceKm()).toBe(5.0);
    expect(component.averagePace()).toBe('10:00 /km');
    expect(component.chartData.datasets.length).toBeGreaterThanOrEqual(1);

    // Test specific sport mode with distance (Running)
    component.setActivity('Running');
    expect(component.sessionCount()).toBe(1);
    expect(component.totalDurationMinutes()).toBe(30);
    expect(component.totalDistanceKm()).toBe(5.0);
    expect(component.averagePace()).toBe('6:00 /km');
    // Running has distance: should have Distance bars and Duration line
    expect(component.chartData.datasets.some(d => d.label?.includes('Distance'))).toBeTrue();

    // Test specific sport mode without distance (Jump Rope)
    component.setActivity('Jump Rope');
    expect(component.sessionCount()).toBe(1);
    expect(component.totalDurationMinutes()).toBe(20);
    expect(component.totalDistanceKm()).toBe(0);
    expect(component.averagePace()).toBeNull();
    // Jump rope has no distance: only duration bars
    expect(component.chartData.datasets.some(d => d.label?.includes('Distance'))).toBeFalse();
  });
});

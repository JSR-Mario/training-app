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

  it('should default to 7D range', () => {
    expect(component.activeRange()).toBe('7D');
  });

  it('should change range when setRange is called', () => {
    component.setRange('1M');
    expect(component.activeRange()).toBe('1M');
  });

  it('should build stacked duration bars for cardio sessions', () => {
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

    component.setRange('7D');
    expect(component.chartData.datasets.length).toBe(2);
    expect(component.chartData.datasets.some(d => d.label === 'Running')).toBeTrue();
    expect(component.chartData.datasets.some(d => d.label === 'Jump Rope')).toBeTrue();
  });
});

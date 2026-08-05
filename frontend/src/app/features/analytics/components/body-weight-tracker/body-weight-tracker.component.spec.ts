import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BodyWeightTrackerComponent } from './body-weight-tracker.component';
import { BodyWeightService } from '../../services/body-weight.service';
import { of } from 'rxjs';
import { BodyWeightEntry } from '../../../../core/types/training.types';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

describe('BodyWeightTrackerComponent', () => {
  let component: BodyWeightTrackerComponent;
  let fixture: ComponentFixture<BodyWeightTrackerComponent>;
  let bodyWeightServiceSpy: jasmine.SpyObj<BodyWeightService>;

  const mockEntries: BodyWeightEntry[] = [
    { date: '2026-05-01', weightKg: 75.0 },
    { date: '2026-05-03', weightKg: 75.4 },
    { date: '2026-05-08', weightKg: 75.8 },
    { date: '2026-05-10', weightKg: 76.2 },
    { date: '2026-05-15', weightKg: 76.0 }
  ];

  beforeEach(async () => {
    bodyWeightServiceSpy = jasmine.createSpyObj('BodyWeightService', ['getWeightEntries', 'saveWeightEntry', 'deleteWeightEntry']);
    bodyWeightServiceSpy.getWeightEntries.and.returnValue(of(mockEntries));

    await TestBed.configureTestingModule({
      imports: [BodyWeightTrackerComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideCharts(withDefaultRegisterables()),
        { provide: BodyWeightService, useValue: bodyWeightServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BodyWeightTrackerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate startWeight, currentWeight, and net change correctly for weight gain', () => {
    component.loadData();

    expect(component.startWeight()).toBe(75.0);
    expect(component.currentWeight()).toBe(76.0);
    expect(component.periodChangeKg()).toBeCloseTo(1.0, 1);
    expect(component.periodChangePercent()).toBeCloseTo(1.33, 1);
    expect(component.hasEnoughData()).toBeTrue();
    expect(component.startDateLabel()).toBe('May 1');
  });

  it('should calculate weight loss (decrease) correctly', () => {
    const weightLossEntries: BodyWeightEntry[] = [
      { date: '2026-06-29', weightKg: 88.0 },
      { date: '2026-07-15', weightKg: 86.5 },
      { date: '2026-07-30', weightKg: 85.7 }
    ];
    bodyWeightServiceSpy.getWeightEntries.and.returnValue(of(weightLossEntries));

    component.loadData();

    expect(component.startWeight()).toBe(88.0);
    expect(component.currentWeight()).toBe(85.7);
    expect(component.periodChangeKg()).toBeCloseTo(-2.3, 1);
    expect(component.periodChangePercent()).toBeCloseTo(-2.61, 1);
    expect(component.hasEnoughData()).toBeTrue();
    expect(component.startDateLabel()).toBe('Jun 29');
  });

  it('should handle no change in weight (0.0 kg)', () => {
    const noChangeEntries: BodyWeightEntry[] = [
      { date: '2026-07-01', weightKg: 70.0 },
      { date: '2026-07-10', weightKg: 70.0 }
    ];
    bodyWeightServiceSpy.getWeightEntries.and.returnValue(of(noChangeEntries));

    component.loadData();

    expect(component.periodChangeKg()).toBe(0);
    expect(component.periodChangePercent()).toBe(0);
    expect(component.hasEnoughData()).toBeTrue();
    expect(component.startDateLabel()).toBe('Jul 1');
  });

  it('should set hasEnoughData to false when there is only 1 entry', () => {
    const singleEntry: BodyWeightEntry[] = [
      { date: '2026-07-01', weightKg: 70.0 }
    ];
    bodyWeightServiceSpy.getWeightEntries.and.returnValue(of(singleEntry));

    component.loadData();

    expect(component.hasEnoughData()).toBeFalse();
    expect(component.startDateLabel()).toBeNull();
  });

  it('should set hasEnoughData to false when there are 0 entries', () => {
    bodyWeightServiceSpy.getWeightEntries.and.returnValue(of([]));

    component.loadData();

    expect(component.hasEnoughData()).toBeFalse();
    expect(component.startDateLabel()).toBeNull();
    expect(component.startWeight()).toBeNull();
    expect(component.currentWeight()).toBeNull();
  });

  it('should aggregate entries weekly when range is 1M', () => {
    const buckets = component.aggregateEntries(mockEntries, '1M');
    expect(component.aggregationUnit()).toBe('Weekly');
    expect(buckets.length).toBeGreaterThan(0);
  });

  it('should aggregate entries monthly when range is 3M, 6M, or 1Y', () => {
    const buckets = component.aggregateEntries(mockEntries, '3M');
    expect(component.aggregationUnit()).toBe('Monthly');
    expect(buckets.length).toBe(1); // May 2026
    expect(buckets[0].avgWeight).toBeCloseTo(75.7, 1);
  });

  it('should aggregate entries yearly for ALL when span is >= 2 years', () => {
    const multiYearEntries: BodyWeightEntry[] = [
      { date: '2024-05-01', weightKg: 70.0 },
      { date: '2025-05-01', weightKg: 73.0 },
      { date: '2026-05-01', weightKg: 76.0 }
    ];

    const buckets = component.aggregateEntries(multiYearEntries, 'ALL');
    expect(component.aggregationUnit()).toBe('Yearly');
    expect(buckets.length).toBe(3);
    expect(buckets[0].label).toBe('2024');
    expect(buckets[1].label).toBe('2025');
    expect(buckets[2].label).toBe('2026');
  });
});

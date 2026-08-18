import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartDataset } from 'chart.js';
import { of } from 'rxjs';

import { ProgressChartComponent } from './progress-chart.component';
import { ProgramService } from '../../../programs/services/program.service';
import { ExerciseService } from '../../../exercises/services/exercise.service';
import { AnalyticsService } from '../../services/analytics.service';
import { Exercise, TrainingProgram, WeekTemplate, DayTemplate } from '../../../../core/types/training.types';
import { ExerciseProgressEntry } from '../../../../core/types/analytics.types';

describe('ProgressChartComponent', () => {
  let component: ProgressChartComponent;
  let fixture: ComponentFixture<ProgressChartComponent>;
  let programServiceSpy: jasmine.SpyObj<ProgramService>;
  let exerciseServiceSpy: jasmine.SpyObj<ExerciseService>;
  let analyticsServiceSpy: jasmine.SpyObj<AnalyticsService>;

  const mockPrograms: TrainingProgram[] = [
    {
      id: 'prog-1',
      userId: 'user-1',
      name: 'Hypertrophy 4-Day',
      description: 'Test program',
      durationWeeks: 4,
      currentWeek: 1,
      goal: 'MAINTENANCE',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    }
  ];

  const mockWeeks: WeekTemplate[] = [
    { id: 'w-1', programId: 'prog-1', name: 'Week 1', days: [] },
    { id: 'w-2', programId: 'prog-1', name: 'Week 2', days: [] },
    { id: 'w-3', programId: 'prog-1', name: 'Week 3', days: [] }
  ];

  const mockDays: DayTemplate[] = [
    { id: 'd-1', weekTemplateId: 'w-1', name: 'Upper Body', exercises: [] },
    { id: 'd-2', weekTemplateId: 'w-2', name: 'Upper Body', exercises: [] },
    { id: 'd-3', weekTemplateId: 'w-3', name: 'Upper Body', exercises: [] }
  ];

  const mockCatalog: Exercise[] = [
    {
      id: 'ex-1',
      userId: 'user-1',
      name: 'Bench Press',
      equipmentBrand: 'Barbell',
      unilateral: false,
      spinalLoading: false,
      isBodyweight: false,
      isPublic: false,
      targets: [
        { id: 't-1', bodyPart: 'MID_CHEST', targetValue: 1.0 }
      ],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    }
  ];

  const mockProgress: ExerciseProgressEntry[] = [
    { sessionDate: '2026-01-07', weekNumber: 1, dayTemplateId: 'd-1', maxWeightKg: 100, maxWeightReps: 8, totalVolumeKg: 1000, bestSetVolumeWeightKg: 100, bestSetVolumeReps: 8, totalSets: 4 },
    { sessionDate: '2026-01-14', weekNumber: 2, dayTemplateId: 'd-2', maxWeightKg: 105, maxWeightReps: 8, totalVolumeKg: 1200, bestSetVolumeWeightKg: 105, bestSetVolumeReps: 8, totalSets: 4 },
    { sessionDate: '2026-01-21', weekNumber: 3, dayTemplateId: 'd-3', maxWeightKg: 110, maxWeightReps: 8, totalVolumeKg: 1400, bestSetVolumeWeightKg: 110, bestSetVolumeReps: 8, totalSets: 4 }
  ];

  beforeEach(async () => {
    programServiceSpy = jasmine.createSpyObj('ProgramService', ['getPrograms', 'getWeeks', 'getDays', 'getDayExercises']);
    exerciseServiceSpy = jasmine.createSpyObj('ExerciseService', ['getExercises']);
    analyticsServiceSpy = jasmine.createSpyObj('AnalyticsService', ['getExerciseProgress']);

    programServiceSpy.getPrograms.and.returnValue(of(mockPrograms));
    programServiceSpy.getWeeks.and.returnValue(of(mockWeeks));
    programServiceSpy.getDays.and.returnValue(of(mockDays));
    programServiceSpy.getDayExercises.and.returnValue(of([
      { id: 'de-1', exerciseId: 'ex-1', sortOrder: 1, sets: 4, reps: 8 }
    ]));
    exerciseServiceSpy.getExercises.and.returnValue(of(mockCatalog));
    analyticsServiceSpy.getExerciseProgress.and.returnValue(of(mockProgress));

    await TestBed.configureTestingModule({
      imports: [ProgressChartComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideCharts(withDefaultRegisterables()),
        { provide: ProgramService, useValue: programServiceSpy },
        { provide: ExerciseService, useValue: exerciseServiceSpy },
        { provide: AnalyticsService, useValue: analyticsServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate linear regression trend line matching volume progression', () => {
    const trendDataset = component.chartData.datasets.find(d => d.label === 'Trend Line') as ChartDataset<'line'> | undefined;
    expect(trendDataset).toBeDefined();
    expect(trendDataset?.type).toBe('line');
    expect(trendDataset?.borderDash).toEqual([5, 5]);
    expect(trendDataset?.tension).toBe(0);

    // With points [1000, 1200, 1400] at x = [0, 1, 2], slope = 200, intercept = 1000
    const expectedValues = [1000, 1200, 1400];
    expect(trendDataset?.data).toEqual(expectedValues);
  });

  it('should calculate linear regression helper correctly with flat and increasing values', () => {
    const helperComponent = component as unknown as {
      calculateLinearRegression: (points: { x: number; y: number }[], totalCount: number) => number[];
    };
    const calcFn = helperComponent.calculateLinearRegression.bind(component);

    // Empty
    expect(calcFn([], 3)).toEqual([]);

    // Single point
    expect(calcFn([{ x: 0, y: 500 }], 3)).toEqual([500, 500, 500]);

    // Increasing linear values: (0, 100), (1, 200), (2, 300) -> for 3 points
    expect(calcFn([
      { x: 0, y: 100 },
      { x: 1, y: 200 },
      { x: 2, y: 300 }
    ], 3)).toEqual([100, 200, 300]);

    // Partial fitting projected to future week: fit on (0, 100), (1, 200), project for 3 weeks
    expect(calcFn([
      { x: 0, y: 100 },
      { x: 1, y: 200 }
    ], 3)).toEqual([100, 200, 300]);
  });
});

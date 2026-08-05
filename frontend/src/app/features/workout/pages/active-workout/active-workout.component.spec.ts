import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveWorkoutComponent } from './active-workout.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { WorkoutService } from '../../services/workout.service';
import { ProgramService } from '../../../programs/services/program.service';
import { ExerciseService } from '../../../exercises/services/exercise.service';
import { BodyWeightService } from '../../../analytics/services/body-weight.service';
import { AnalyticsService } from '../../../analytics/services/analytics.service';

describe('ActiveWorkoutComponent', () => {
  let component: ActiveWorkoutComponent;
  let fixture: ComponentFixture<ActiveWorkoutComponent>;

  beforeEach(async () => {
    const workoutServiceSpy = jasmine.createSpyObj('WorkoutService', [
      'createSession', 'getActiveSession', 'getLoggedSets', 'completeSession', 'logSet', 'deleteSet', 'updateSet', 'updateNotes', 'addExerciseToSession', 'deleteExerciseFromSession'
    ]);
    workoutServiceSpy.getActiveSession.and.returnValue(of(null));

    const programServiceSpy = jasmine.createSpyObj('ProgramService', ['getDayDetail']);
    const exerciseServiceSpy = jasmine.createSpyObj('ExerciseService', ['getExercises', 'createExercise']);
    const bodyWeightServiceSpy = jasmine.createSpyObj('BodyWeightService', ['getWeightEntries']);
    const analyticsServiceSpy = jasmine.createSpyObj('AnalyticsService', ['getVolumeHistory']);

    exerciseServiceSpy.getExercises.and.returnValue(of([]));
    bodyWeightServiceSpy.getWeightEntries.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [ActiveWorkoutComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'test-id' } }, queryParams: of({}) } },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: WorkoutService, useValue: workoutServiceSpy },
        { provide: ProgramService, useValue: programServiceSpy },
        { provide: ExerciseService, useValue: exerciseServiceSpy },
        { provide: BodyWeightService, useValue: bodyWeightServiceSpy },
        { provide: AnalyticsService, useValue: analyticsServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ActiveWorkoutComponent);
    component = fixture.componentInstance;
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should clamp tooltip left boundary to 16px when trigger icon is near left screen edge', () => {
    const mockButton = document.createElement('button');
    spyOn(mockButton, 'getBoundingClientRect').and.returnValue({
      left: 10,
      right: 34,
      top: 100,
      bottom: 124,
      width: 24,
      height: 24,
      x: 10,
      y: 100,
      toJSON: () => ({})
    });

    const mockEvent = { currentTarget: mockButton } as unknown as Event;
    component.toggleIconTooltip('ex1-fatigue', mockEvent);

    expect(component.activeIconTooltip()).toBe('ex1-fatigue');
    const pos = component.tooltipPosition();
    expect(pos).not.toBeNull();
    expect(pos!.left).toBe(16); // Clamped to min margin 16px
    expect(pos!.top).toBe(132); // rect.bottom (124) + 8
  });

  it('should clamp tooltip right boundary when trigger icon is near right screen edge', () => {
    const screenWidth = window.innerWidth;
    const mockButton = document.createElement('button');
    spyOn(mockButton, 'getBoundingClientRect').and.returnValue({
      left: screenWidth - 20,
      right: screenWidth + 4,
      top: 100,
      bottom: 124,
      width: 24,
      height: 24,
      x: screenWidth - 20,
      y: 100,
      toJSON: () => ({})
    });

    const mockEvent = { currentTarget: mockButton } as unknown as Event;
    component.toggleIconTooltip('ex1-weight', mockEvent);

    const pos = component.tooltipPosition();
    expect(pos).not.toBeNull();
    // left + tooltipWidth (208) should be <= screenWidth - 16
    expect(pos!.left + 208).toBeLessThanOrEqual(screenWidth - 16);
  });

  it('should dismiss active tooltip on document click / scroll', () => {
    component.activeIconTooltip.set('ex1-fatigue');
    component.tooltipPosition.set({ left: 50, top: 100, arrowLeft: 20 });

    component.onDocumentClickOrScroll();

    expect(component.activeIconTooltip()).toBeNull();
    expect(component.tooltipPosition()).toBeNull();
  });
});

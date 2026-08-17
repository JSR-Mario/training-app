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
import { DayExercise, WorkoutSetResponse, WorkoutSessionResponse } from '../../../../core/types/training.types';

describe('ActiveWorkoutComponent', () => {
  let component: ActiveWorkoutComponent;
  let fixture: ComponentFixture<ActiveWorkoutComponent>;

  beforeEach(async () => {
    const workoutServiceSpy = jasmine.createSpyObj('WorkoutService', [
      'createSession', 'getActiveSession', 'startSession', 'getSession', 'deleteSession',
      'completeSession', 'uncompleteSession', 'pauseSession', 'resumeSession', 'updateSessionNotes',
      'updateExerciseRating', 'deleteExerciseRating', 'getSets', 'logSet', 'updateSet', 'deleteSet',
      'getSuggestions', 'getSessionExercises', 'addSessionExercise', 'removeSessionExercise',
      'replaceSessionExercise', 'reorderSessionExercises'
    ]);
    workoutServiceSpy.getActiveSession.and.returnValue(of(null));
    workoutServiceSpy.getSession.and.returnValue(of({
      id: 'test-id',
      programId: 'p1',
      dayId: 'd1',
      durationSeconds: 0,
      startedAt: '2026-01-01T00:00:00Z',
      completedAt: null,
      notes: ''
    }));
    workoutServiceSpy.getSets.and.returnValue(of([]));
    workoutServiceSpy.getSessionExercises.and.returnValue(of([]));
    workoutServiceSpy.getSuggestions.and.returnValue(of([]));
    workoutServiceSpy.updateExerciseRating.and.returnValue(of({ ratings: [] }));
    workoutServiceSpy.deleteExerciseRating.and.returnValue(of({ ratings: [] }));

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
        { 
          provide: ActivatedRoute, 
          useValue: { 
            snapshot: { paramMap: { get: () => 'test-id' } }, 
            paramMap: of({ get: () => 'test-id' }),
            queryParams: of({}) 
          } 
        },
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

  describe('activeLoggingExercise — dynamic target', () => {
    const ex1: DayExercise = {
      id: 'ex1', exerciseName: 'Leg Extension', sets: 3, reps: 10, sortOrder: 0,
      exerciseId: 'e1', repsMax: undefined, isAmrap: false, unilateral: false, isBodyweight: false
    };
    const ex2: DayExercise = {
      id: 'ex2', exerciseName: 'Leg Curl', sets: 3, reps: 10, sortOrder: 1,
      exerciseId: 'e2', repsMax: undefined, isAmrap: false, unilateral: false, isBodyweight: false
    };

    beforeEach(() => {
      component.exercises.set([ex1, ex2]);
      component.loggedSets.set([]);
      component.activeLoggingExerciseId.set(null);
    });

    it('defaults to first incomplete exercise when nothing is touched', () => {
      expect(component.activeLoggingExercise()?.id).toBe('ex1');
    });

    it('follows last touched exercise when user interacts with second card inputs', () => {
      component.markExerciseTouched('ex2');
      expect(component.activeLoggingExercise()?.id).toBe('ex2');
    });

    it('updates target exercise when rating is set for that exercise', () => {
      component.sessionId.set('sess-1');
      component.session.set({ id: 'sess-1' } as unknown as WorkoutSessionResponse);
      component.setRating('ex2', 8);
      expect(component.activeLoggingExercise()?.id).toBe('ex2');
    });

    it('retains target after logging set if exercise is not yet complete', () => {
      component.markExerciseTouched('ex2');
      const set1: WorkoutSetResponse = {
        id: 's1', sessionId: 'sess-1', sessionExerciseId: 'ex2', setNumber: 1, weightKg: 50,
        repsCompleted: 10, repsCompletedRight: undefined, loggedAt: new Date().toISOString(),
        performanceStatus: 'GOOD', isNewPr: false, previousPrWeight: undefined, previousPrReps: undefined
      };
      component.loggedSets.set([set1]);
      expect(component.activeLoggingExercise()?.id).toBe('ex2');
    });

    it('falls back to next incomplete exercise when touched exercise completes all sets', () => {
      component.markExerciseTouched('ex1');
      const set1: WorkoutSetResponse = {
        id: 's1', sessionId: 'sess-1', sessionExerciseId: 'ex1', setNumber: 1, weightKg: 50,
        repsCompleted: 10, repsCompletedRight: undefined, loggedAt: new Date().toISOString(),
        performanceStatus: 'GOOD', isNewPr: false, previousPrWeight: undefined, previousPrReps: undefined
      };
      const set2: WorkoutSetResponse = {
        id: 's2', sessionId: 'sess-1', sessionExerciseId: 'ex1', setNumber: 2, weightKg: 50,
        repsCompleted: 10, repsCompletedRight: undefined, loggedAt: new Date().toISOString(),
        performanceStatus: 'GOOD', isNewPr: false, previousPrWeight: undefined, previousPrReps: undefined
      };
      const set3: WorkoutSetResponse = {
        id: 's3', sessionId: 'sess-1', sessionExerciseId: 'ex1', setNumber: 3, weightKg: 50,
        repsCompleted: 10, repsCompletedRight: undefined, loggedAt: new Date().toISOString(),
        performanceStatus: 'GOOD', isNewPr: false, previousPrWeight: undefined, previousPrReps: undefined
      };

      component.loggedSets.set([set1, set2, set3]);
      expect(component.activeLoggingExercise()?.id).toBe('ex2');
    });

    it('formats active live timer display correctly when running and when paused', () => {
      const now = new Date().toISOString();
      component.session.set({
        id: 'sess-1',
        durationSeconds: 120,
        lastResumedAt: now,
        pausedAt: null,
        completedAt: null
      } as unknown as WorkoutSessionResponse);

      expect(component.isPaused()).toBeFalse();
      expect(component.formattedTimerDisplay()).toMatch(/\d{2}:\d{2}/);

      component.session.set({
        id: 'sess-1',
        durationSeconds: 120,
        lastResumedAt: now,
        pausedAt: now,
        completedAt: null
      } as unknown as WorkoutSessionResponse);

      expect(component.isPaused()).toBeTrue();
      expect(component.formattedTimerDisplay()).toBe('02:00');
    });

    it('determines exercise completion accurately', () => {
      expect(component.isExerciseCompleted('ex1', 3)).toBeFalse();

      const set1: WorkoutSetResponse = {
        id: 's1', sessionId: 'sess-1', sessionExerciseId: 'ex1', setNumber: 1, weightKg: 50,
        repsCompleted: 10, repsCompletedRight: undefined, loggedAt: new Date().toISOString(),
        performanceStatus: 'GOOD', isNewPr: false, previousPrWeight: undefined, previousPrReps: undefined
      };
      const set2: WorkoutSetResponse = {
        id: 's2', sessionId: 'sess-1', sessionExerciseId: 'ex1', setNumber: 2, weightKg: 50,
        repsCompleted: 10, repsCompletedRight: undefined, loggedAt: new Date().toISOString(),
        performanceStatus: 'GOOD', isNewPr: false, previousPrWeight: undefined, previousPrReps: undefined
      };
      const set3: WorkoutSetResponse = {
        id: 's3', sessionId: 'sess-1', sessionExerciseId: 'ex1', setNumber: 3, weightKg: 50,
        repsCompleted: 10, repsCompletedRight: undefined, loggedAt: new Date().toISOString(),
        performanceStatus: 'GOOD', isNewPr: false, previousPrWeight: undefined, previousPrReps: undefined
      };

      component.loggedSets.set([set1, set2, set3]);
      expect(component.isExerciseCompleted('ex1', 3)).toBeTrue();
    });

    it('tracks per-exercise logging state accurately', () => {
      expect(component.isLogging('ex1')).toBeFalse();
      component.isLoggingExercise.update(s => new Set(s).add('ex1'));
      expect(component.isLogging('ex1')).toBeTrue();
      expect(component.isLogging('ex2')).toBeFalse();
    });

    it('toggles AMRAP and adjusts reps validation accordingly', () => {
      component.ngOnInit();
      component.openAddExercise();
      expect(component.exerciseForm.get('isAmrap')?.value).toBeFalse();

      component.onExerciseSelected({
        id: 'ex-100',
        userId: 'u1',
        name: 'Pull Up',
        unilateral: false,
        spinalLoading: false,
        isBodyweight: true,
        isPublic: false,
        targets: [],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
      });

      // Initially not AMRAP, reps is required
      component.exerciseForm.patchValue({ reps: null });
      expect(component.exerciseForm.valid).toBeFalse();

      // Toggle AMRAP to true -> reps should not be required
      component.exerciseForm.patchValue({ isAmrap: true });
      expect(component.exerciseForm.valid).toBeTrue();
    });

    it('reloads workout data and suggestions upon adding a new exercise', () => {
      const workoutService = TestBed.inject(WorkoutService);
      const workoutSpy = spyOn(component, 'loadWorkoutData').and.callThrough();
      (workoutService.addSessionExercise as jasmine.Spy).and.returnValue(of({
        id: 'se-100',
        sessionId: 'test-id',
        exercise: { id: 'ex-100', name: 'Pull Up', isPublic: false, unilateral: false, isBodyweight: true },
        sets: 3,
        reps: 10,
        sortOrder: 1,
        isAmrap: false
      }));

      component.session.set({
        id: 'test-id',
        dayTemplateId: 'dt-1',
        dayTemplateName: 'Push Day',
        performedOn: '2026-01-01',
        weekNumber: 1,
        durationSeconds: 0,
        startedAt: '2026-01-01T00:00:00Z',
        completedAt: null,
        notes: ''
      });

      component.exerciseForm.patchValue({
        exerciseId: 'ex-100',
        sets: 3,
        reps: 10,
        repsMax: null,
        isAmrap: false
      });

      component.onSubmitExercise();

      expect(workoutService.addSessionExercise).toHaveBeenCalledWith('test-id', {
        exerciseId: 'ex-100',
        sets: 3,
        reps: 10,
        repsMax: undefined,
        isAmrap: false
      });
      expect(workoutSpy).toHaveBeenCalled();
    });
  });
});



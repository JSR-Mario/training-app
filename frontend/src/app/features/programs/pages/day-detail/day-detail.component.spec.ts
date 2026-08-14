import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DayDetailComponent } from './day-detail.component';
import { ProgramService } from '../../services/program.service';
import { ExerciseService } from '../../../exercises/services/exercise.service';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { DayExercise, DayTemplate } from '../../../../core/types/training.types';

describe('DayDetailComponent', () => {
  let component: DayDetailComponent;
  let fixture: ComponentFixture<DayDetailComponent>;
  let programServiceSpy: jasmine.SpyObj<ProgramService>;
  let exerciseServiceSpy: jasmine.SpyObj<ExerciseService>;

  const mockDayExercise: DayExercise = {
    id: 'de-1',
    exerciseId: 'ex-1',
    exerciseName: 'Bench Press',
    sets: 4,
    reps: 10,
    repsMax: 12,
    isAmrap: false,
    sortOrder: 0
  };

  beforeEach(async () => {
    programServiceSpy = jasmine.createSpyObj('ProgramService', [
      'getDay',
      'getDayExercises',
      'getProgram',
      'updateDayExercise',
      'deleteDayExercise',
      'reorderDayExercises'
    ]);
    exerciseServiceSpy = jasmine.createSpyObj('ExerciseService', ['getExercises']);

    const mockDay: DayTemplate = {
      id: 'day-1',
      weekTemplateId: 'week-1',
      name: 'Push Day',
      exercises: []
    };
    programServiceSpy.getDay.and.returnValue(of(mockDay));
    programServiceSpy.getDayExercises.and.returnValue(of([mockDayExercise]));
    programServiceSpy.getProgram.and.returnValue(of({
      id: 'p-1',
      userId: 'user-1',
      name: 'Program A',
      durationWeeks: 4,
      isActive: true,
      currentWeek: 1,
      goal: 'MAINTENANCE',
      isPublic: false,
      createdAt: '2026-01-01T00:00:00Z'
    }));
    exerciseServiceSpy.getExercises.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [DayDetailComponent],
      providers: [
        { provide: ProgramService, useValue: programServiceSpy },
        { provide: ExerciseService, useValue: exerciseServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ programId: 'p-1', dayId: 'day-1' }))
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DayDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load day details', () => {
    expect(component).toBeTruthy();
    expect(component.exercises().length).toBe(1);
    expect(component.exercises()[0].exerciseName).toBe('Bench Press');
  });

  it('should populate edit form when startEditExercise is called', () => {
    component.startEditExercise(mockDayExercise);
    expect(component.editingExerciseId()).toBe('de-1');
    expect(component.editForm.value.sets).toBe(4);
    expect(component.editForm.value.reps).toBe(10);
    expect(component.editForm.value.repsMax).toBe(12);
    expect(component.editForm.value.isAmrap).toBe(false);
  });

  it('should reset editing state on cancelEdit', () => {
    component.startEditExercise(mockDayExercise);
    expect(component.editingExerciseId()).toBe('de-1');
    component.cancelEdit();
    expect(component.editingExerciseId()).toBeNull();
  });

  it('should call updateDayExercise on submit edit', () => {
    programServiceSpy.updateDayExercise.and.returnValue(of(mockDayExercise));
    component.startEditExercise(mockDayExercise);

    component.editForm.patchValue({
      sets: 3,
      reps: 8,
      repsMax: 10,
      isAmrap: false
    });

    component.onSubmitEdit(mockDayExercise);

    expect(programServiceSpy.updateDayExercise).toHaveBeenCalledWith(
      'de-1',
      3,
      8,
      0,
      10,
      undefined,
      undefined,
      undefined,
      false
    );
    expect(component.editingExerciseId()).toBeNull();
  });
});

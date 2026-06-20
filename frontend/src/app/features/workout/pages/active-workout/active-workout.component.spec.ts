import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveWorkoutComponent } from './active-workout.component';
import { WorkoutService } from '../../services/workout.service';
import { ProgramService } from '../../../programs/services/program.service';
import { of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder } from '@angular/forms';

describe('ActiveWorkoutComponent', () => {
  let component: ActiveWorkoutComponent;
  let fixture: ComponentFixture<ActiveWorkoutComponent>;

  const mockWorkoutService = {
    getSession: jasmine.createSpy('getSession').and.returnValue(of({})),
    getSets: jasmine.createSpy('getSets').and.returnValue(of([])),
    logSet: jasmine.createSpy('logSet').and.returnValue(of({})),
    deleteSet: jasmine.createSpy('deleteSet').and.returnValue(of(null)),
    completeSession: jasmine.createSpy('completeSession').and.returnValue(of(null))
  };

  const mockProgramService = {
    getDayExercises: jasmine.createSpy('getDayExercises').and.returnValue(of([]))
  };

  const mockRouter = {
    navigate: jasmine.createSpy('navigate')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiveWorkoutComponent],
      providers: [
        FormBuilder,
        { provide: WorkoutService, useValue: mockWorkoutService },
        { provide: ProgramService, useValue: mockProgramService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: { paramMap: of({ get: () => '1' }) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ActiveWorkoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

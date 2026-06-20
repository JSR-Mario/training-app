import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StartSessionComponent } from './start-session.component';
import { WorkoutService } from '../../services/workout.service';
import { ProgramService } from '../../../programs/services/program.service';
import { of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder } from '@angular/forms';

describe('StartSessionComponent', () => {
  let component: StartSessionComponent;
  let fixture: ComponentFixture<StartSessionComponent>;

  const mockWorkoutService = {
    startSession: jasmine.createSpy('startSession').and.returnValue(of({ id: '1' }))
  };

  const mockProgramService = {
    getProgram: jasmine.createSpy('getProgram').and.returnValue(of({})),
    getWeeks: jasmine.createSpy('getWeeks').and.returnValue(of([])),
    getPrograms: jasmine.createSpy('getPrograms').and.returnValue(of([]))
  };

  const mockRouter = {
    navigate: jasmine.createSpy('navigate')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StartSessionComponent],
      providers: [
        FormBuilder,
        { provide: WorkoutService, useValue: mockWorkoutService },
        { provide: ProgramService, useValue: mockProgramService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StartSessionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

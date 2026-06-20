import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkoutDashboardComponent } from './workout-dashboard.component';
import { WorkoutService } from '../../services/workout.service';
import { ProgramService } from '../../../programs/services/program.service';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

describe('WorkoutDashboardComponent', () => {
  let component: WorkoutDashboardComponent;
  let fixture: ComponentFixture<WorkoutDashboardComponent>;

  const mockWorkoutService = {
    getSessions: jasmine.createSpy('getSessions').and.returnValue(of([])),
    deleteSession: jasmine.createSpy('deleteSession').and.returnValue(of(null))
  };

  const mockProgramService = {
    getPrograms: jasmine.createSpy('getPrograms').and.returnValue(of([]))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkoutDashboardComponent],
      providers: [
        { provide: WorkoutService, useValue: mockWorkoutService },
        { provide: ProgramService, useValue: mockProgramService },
        { provide: ActivatedRoute, useValue: { params: of({}) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WorkoutDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

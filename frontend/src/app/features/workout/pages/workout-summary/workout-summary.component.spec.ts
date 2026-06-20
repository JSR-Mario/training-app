import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkoutSummaryComponent } from './workout-summary.component';
import { WorkoutService } from '../../services/workout.service';
import { ProgramService } from '../../../programs/services/program.service';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

describe('WorkoutSummaryComponent', () => {
  let component: WorkoutSummaryComponent;
  let fixture: ComponentFixture<WorkoutSummaryComponent>;

  const mockWorkoutService = {
    getSession: jasmine.createSpy('getSession').and.returnValue(of({})),
    getSets: jasmine.createSpy('getSets').and.returnValue(of([]))
  };

  const mockProgramService = {
    getDayExercises: jasmine.createSpy('getDayExercises').and.returnValue(of([]))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkoutSummaryComponent],
      providers: [
        { provide: WorkoutService, useValue: mockWorkoutService },
        { provide: ProgramService, useValue: mockProgramService },
        { provide: ActivatedRoute, useValue: { paramMap: of({ get: () => '1' }) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WorkoutSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

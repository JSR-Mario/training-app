import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ExerciseService } from './exercise.service';
import { Exercise } from '../../../core/types/training.types';

describe('ExerciseService', () => {
  let service: ExerciseService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ExerciseService]
    });
    service = TestBed.inject(ExerciseService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch exercises', () => {
    const mockExercises: Exercise[] = [
      { id: '1', userId: 'u1', name: 'Bench Press', targets: [], isPublic: false, unilateral: false, spinalLoading: false, isBodyweight: false, createdAt: '', updatedAt: '' }
    ];

    service.getExercises().subscribe(exercises => {
      expect(exercises.length).toBe(1);
      expect(exercises).toEqual(mockExercises);
    });

    const req = httpMock.expectOne('/api/v1/training/exercises');
    expect(req.request.method).toBe('GET');
    req.flush(mockExercises);
  });
});

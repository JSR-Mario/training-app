import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { WorkoutService } from './workout.service';
import { 
  WorkoutSessionRequest, 
  WorkoutSessionResponse, 
  WorkoutSetRequest, 
  WorkoutSetResponse 
} from '../../core/types/training.types';

describe('WorkoutService', () => {
  let service: WorkoutService;
  let httpMock: HttpTestingController;

  const mockSessionResponse: WorkoutSessionResponse = {
    id: '123',
    dayTemplateId: 'day-1',
    dayTemplateName: 'Push Day',
    performedOn: '2023-10-27',
    weekNumber: 1,
    completedAt: null
  };

  const mockSetResponse: WorkoutSetResponse = {
    id: 'set-1',
    sessionId: '123',
    dayExerciseId: 'day-ex-1',
    setNumber: 1,
    repsCompleted: 10,
    weightKg: 100,
    loggedAt: '2023-10-27T10:00:00Z'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        WorkoutService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(WorkoutService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get sessions by programId and weekNumber', () => {
    service.getSessions('prog-1', 1).subscribe(sessions => {
      expect(sessions.length).toBe(1);
      expect(sessions[0]).toEqual(mockSessionResponse);
    });

    const req = httpMock.expectOne('/api/v1/training/sessions?programId=prog-1&weekNumber=1');
    expect(req.request.method).toBe('GET');
    req.flush([mockSessionResponse]);
  });

  it('should start a session', () => {
    const request: WorkoutSessionRequest = {
      dayTemplateId: 'day-1',
      performedOn: '2023-10-27',
      weekNumber: 1
    };

    service.startSession(request).subscribe(session => {
      expect(session).toEqual(mockSessionResponse);
    });

    const req = httpMock.expectOne('/api/v1/training/sessions');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(mockSessionResponse);
  });

  it('should get a session by id', () => {
    service.getSession('123').subscribe(session => {
      expect(session).toEqual(mockSessionResponse);
    });

    const req = httpMock.expectOne('/api/v1/training/sessions/123');
    expect(req.request.method).toBe('GET');
    req.flush(mockSessionResponse);
  });

  it('should delete a session', () => {
    service.deleteSession('123').subscribe();

    const req = httpMock.expectOne('/api/v1/training/sessions/123');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should complete a session', () => {
    service.completeSession('123').subscribe();

    const req = httpMock.expectOne('/api/v1/training/sessions/123/complete');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(null);
  });

  it('should get sets for a session', () => {
    service.getSets('123').subscribe(sets => {
      expect(sets.length).toBe(1);
      expect(sets[0]).toEqual(mockSetResponse);
    });

    const req = httpMock.expectOne('/api/v1/training/sessions/123/sets');
    expect(req.request.method).toBe('GET');
    req.flush([mockSetResponse]);
  });

  it('should log a set', () => {
    const request: WorkoutSetRequest = {
      dayExerciseId: 'day-ex-1',
      setNumber: 1,
      repsCompleted: 10,
      weightKg: 100
    };

    service.logSet('123', request).subscribe(set => {
      expect(set).toEqual(mockSetResponse);
    });

    const req = httpMock.expectOne('/api/v1/training/sessions/123/sets');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(mockSetResponse);
  });

  it('should update a set', () => {
    const request: WorkoutSetRequest = {
      dayExerciseId: 'day-ex-1',
      setNumber: 1,
      repsCompleted: 12,
      weightKg: 105
    };

    service.updateSet('set-1', request).subscribe(set => {
      expect(set).toEqual(mockSetResponse);
    });

    const req = httpMock.expectOne('/api/v1/training/workout-sets/set-1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(request);
    req.flush(mockSetResponse);
  });

  it('should delete a set', () => {
    service.deleteSet('set-1').subscribe();

    const req = httpMock.expectOne('/api/v1/training/workout-sets/set-1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});

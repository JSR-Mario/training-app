import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AnalyticsService } from './analytics.service';
import { environment } from '../../../../environments/environment';
import { WeeklyVolumeSnapshot, ExerciseProgressEntry } from '../../../core/types/analytics.types';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AnalyticsService]
    });
    service = TestBed.inject(AnalyticsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getWeeklyVolume', () => {
    it('should fetch weekly volume for a program and week', () => {
      const mockResponse: WeeklyVolumeSnapshot[] = [
        { bodyPart: 'CHEST', totalSets: 12 },
        { bodyPart: 'BACK', totalSets: 14 }
      ];
      const programId = 'prog-123';
      const weekNumber = 2;

      service.getWeeklyVolume(programId, weekNumber).subscribe(data => {
        expect(data).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(request => 
        request.url === `${environment.apiUrl}/api/v1/analytics/volume` &&
        request.params.get('programId') === programId &&
        request.params.get('weekNumber') === weekNumber.toString()
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getExerciseProgress', () => {
    it('should fetch progress for an exercise', () => {
      const mockResponse: ExerciseProgressEntry[] = [
        { sessionDate: '2026-06-20', maxWeightKg: 100, totalVolumeKg: 1000, totalSets: 5 }
      ];
      const exerciseId = 'ex-456';

      service.getExerciseProgress(exerciseId).subscribe(data => {
        expect(data).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/analytics/progress/${exerciseId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });
});

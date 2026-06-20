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

  it('should fetch weekly volume', () => {
    const mockResponse: WeeklyVolumeSnapshot[] = [
      { bodyPart: 'CHEST', totalSets: 10 }
    ];
    
    service.getWeeklyVolume('prog-123', 1).subscribe(res => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/analytics/volume?programId=prog-123&weekNumber=1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should fetch exercise progress', () => {
    const mockResponse: ExerciseProgressEntry[] = [
      { sessionDate: '2023-01-01', maxWeightKg: 100, totalVolumeKg: 1000, totalSets: 3 }
    ];

    service.getExerciseProgress('ex-123').subscribe(res => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/analytics/progress/ex-123`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });
});

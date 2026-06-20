import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProgramService } from './program.service';
import { TrainingProgram } from '../../../core/types/training.types';

describe('ProgramService', () => {
  let service: ProgramService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProgramService]
    });
    service = TestBed.inject(ProgramService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create a program', () => {
    const mockProg: TrainingProgram = {
      id: 'p1', userId: 'u1', name: 'PPL', durationWeeks: 4, isActive: false, weeks: [], createdAt: '', updatedAt: ''
    };

    service.createProgram('PPL', 4).subscribe(p => {
      expect(p.name).toBe('PPL');
    });

    const req = httpMock.expectOne('/api/v1/training/programs');
    expect(req.request.method).toBe('POST');
    req.flush(mockProg);
  });
});

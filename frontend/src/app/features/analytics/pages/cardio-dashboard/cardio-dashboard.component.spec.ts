import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { of } from 'rxjs';

import { CardioDashboardComponent } from './cardio-dashboard.component';
import { CardioLogService } from '../../services/cardio-log.service';
import { CardioLogResponse } from '../../../../core/types/training.types';

describe('CardioDashboardComponent', () => {
  let component: CardioDashboardComponent;
  let fixture: ComponentFixture<CardioDashboardComponent>;
  let cardioService: CardioLogService;

  const mockLogs: CardioLogResponse[] = [
    {
      id: '1',
      durationMinutes: 30,
      distanceKm: 5.0,
      cardioType: 'Running',
      performedOn: '2026-08-30',
      createdAt: '2026-08-30T10:00:00Z'
    },
    {
      id: '2',
      durationMinutes: 45,
      distanceKm: null,
      cardioType: 'Jump Rope',
      performedOn: '2026-08-29',
      createdAt: '2026-08-29T10:00:00Z'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardioDashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideCharts(withDefaultRegisterables())
      ]
    }).compileComponents();

    cardioService = TestBed.inject(CardioLogService);
    spyOn(cardioService, 'getLogs').and.returnValue(of(mockLogs));
    spyOn(cardioService, 'logCardio').and.returnValue(of(mockLogs[0]));
    spyOn(cardioService, 'updateLog').and.returnValue(of(mockLogs[0]));
    spyOn(cardioService, 'deleteLog').and.returnValue(of(undefined));

    fixture = TestBed.createComponent(CardioDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load logs', () => {
    expect(component).toBeTruthy();
    expect(component.logs().length).toBe(2);
  });

  it('should calculate pace accurately', () => {
    expect(component.calculatePace(30, 5.0)).toBe('6:00 /km');
    expect(component.calculatePace(25, 5.0)).toBe('5:00 /km');
    expect(component.calculatePace(27, 5.0)).toBe('5:24 /km');
    expect(component.calculatePace(30, null)).toBeNull();
    expect(component.calculatePace(30, 0)).toBeNull();
    expect(component.calculatePace(0, 5.0)).toBeNull();
  });

  it('should include distanceKm in cardioForm and submit', () => {
    component.cardioForm.setValue({
      performedOn: '2026-08-31',
      durationMinutes: 40,
      distanceKm: 7.5,
      cardioType: 'Running'
    });

    expect(component.cardioForm.valid).toBeTrue();
    component.onSubmit();

    expect(cardioService.logCardio).toHaveBeenCalledWith(jasmine.objectContaining({
      performedOn: '2026-08-31',
      durationMinutes: 40,
      distanceKm: 7.5,
      cardioType: 'Running'
    }));
    expect(component.cardioForm.value.durationMinutes).toBeNull();
    expect(component.cardioForm.value.distanceKm).toBeNull();
  });

  it('should open edit modal with distance and save changes', () => {
    component.openEditModal(mockLogs[0]);
    expect(component.editingLog()).toEqual(mockLogs[0]);
    expect(component.editForm.value.distanceKm).toBe(5.0);

    component.editForm.patchValue({
      distanceKm: 6.2
    });
    component.onSaveEdit();

    expect(cardioService.updateLog).toHaveBeenCalledWith('1', jasmine.objectContaining({
      distanceKm: 6.2
    }));
    expect(component.editingLog()).toBeNull();
  });

  it('should paginate cardio logs correctly', () => {
    // Generate 25 mock logs to test pagination
    const manyLogs: CardioLogResponse[] = Array.from({ length: 25 }, (_, i) => ({
      id: `log-${i}`,
      durationMinutes: 30,
      distanceKm: 5.0,
      cardioType: 'Running',
      performedOn: `2026-08-${(i + 1).toString().padStart(2, '0')}`,
      createdAt: '2026-08-30T10:00:00Z'
    }));

    component.logs.set(manyLogs);
    expect(component.totalPages()).toBe(3);
    expect(component.currentPage()).toBe(1);
    expect(component.paginatedLogs().length).toBe(10);
    expect(component.paginatedLogs()[0].id).toBe('log-0');

    component.nextPage();
    expect(component.currentPage()).toBe(2);
    expect(component.paginatedLogs().length).toBe(10);
    expect(component.paginatedLogs()[0].id).toBe('log-10');

    component.goToPage(3);
    expect(component.currentPage()).toBe(3);
    expect(component.paginatedLogs().length).toBe(5);
    expect(component.getEndIndex()).toBe(25);

    component.prevPage();
    expect(component.currentPage()).toBe(2);
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { CardioChartComponent } from './cardio-chart.component';

describe('CardioChartComponent', () => {
  let component: CardioChartComponent;
  let fixture: ComponentFixture<CardioChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardioChartComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideCharts(withDefaultRegisterables())
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardioChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to 7D range', () => {
    expect(component.activeRange()).toBe('7D');
  });

  it('should change range when setRange is called', () => {
    component.setRange('1M');
    expect(component.activeRange()).toBe('1M');
  });
});

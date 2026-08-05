import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HabitCardComponent } from './habit-card.component';
import { HabitFrequency } from '../../models/habit.model';

describe('HabitCardComponent', () => {
  let component: HabitCardComponent;
  let fixture: ComponentFixture<HabitCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HabitCardComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HabitCardComponent);
    component = fixture.componentInstance;
    component.habit = {
      id: 'test-id',
      title: 'Test Habit',
      description: 'Test Description',
      frequency: HabitFrequency.DAILY,
      currentStreak: 1,
      longestStreak: 5,
      completedDates: []
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return correct streak unit labels for DAILY, WEEKLY, and MONTHLY habits', () => {
    expect(component.getStreakUnit('DAILY', 1)).toBe('day');
    expect(component.getStreakUnit('DAILY', 5)).toBe('days');
    expect(component.getStreakUnit('WEEKLY', 1)).toBe('week');
    expect(component.getStreakUnit('WEEKLY', 3)).toBe('weeks');
    expect(component.getStreakUnit('MONTHLY', 1)).toBe('month');
    expect(component.getStreakUnit('MONTHLY', 12)).toBe('months');
  });
});

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
});

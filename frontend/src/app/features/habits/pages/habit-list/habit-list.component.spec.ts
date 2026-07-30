import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HabitListComponent } from './habit-list.component';
import { HabitService } from '../../services/habit.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('HabitListComponent', () => {
  let component: HabitListComponent;
  let fixture: ComponentFixture<HabitListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HabitListComponent, HttpClientTestingModule],
      providers: [HabitService]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HabitListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

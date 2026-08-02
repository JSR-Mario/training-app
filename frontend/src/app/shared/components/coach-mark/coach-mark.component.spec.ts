import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CoachMarkComponent } from './coach-mark.component';
import { TutorialService } from '../../../core/services/tutorial.service';
import { AuthService } from '../../../core/auth/auth.service';
import { provideRouter } from '@angular/router';

describe('CoachMarkComponent', () => {
  let component: CoachMarkComponent;
  let fixture: ComponentFixture<CoachMarkComponent>;
  let tutorialService: TutorialService;

  beforeEach(async () => {
    sessionStorage.clear();
    const authServiceSpy = jasmine.createSpyObj('AuthService', [], {
      isDemoUser: true
    });

    await TestBed.configureTestingModule({
      imports: [CoachMarkComponent],
      providers: [
        TutorialService,
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CoachMarkComponent);
    component = fixture.componentInstance;
    tutorialService = TestBed.inject(TutorialService);
    fixture.detectChanges();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update targetRect when active step is present and element exists', (done) => {
    const dummyEl = document.createElement('div');
    dummyEl.id = 'test-target';
    dummyEl.style.width = '100px';
    dummyEl.style.height = '50px';
    document.body.appendChild(dummyEl);

    tutorialService.triggerSectionTutorial({
      targetId: 'test-target',
      title: 'Test Title',
      description: 'Test Description',
      section: 'dashboard',
      position: 'bottom'
    });

    fixture.detectChanges();

    setTimeout(() => {
      expect(component.targetRect()).not.toBeNull();
      document.body.removeChild(dummyEl);
      done();
    }, 150);
  });
});

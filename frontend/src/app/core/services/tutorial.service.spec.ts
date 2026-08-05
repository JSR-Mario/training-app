import { TestBed } from '@angular/core/testing';
import { TutorialService } from './tutorial.service';
import { AuthService } from '../auth/auth.service';
import { provideRouter } from '@angular/router';

describe('TutorialService', () => {
  let service: TutorialService;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    authServiceSpy = jasmine.createSpyObj('AuthService', [], {
      isDemoUser: false,
      username: 'testuser'
    });

    TestBed.configureTestingModule({
      providers: [
        TutorialService,
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    service = TestBed.inject(TutorialService);
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should trigger dashboard tutorial for any user if section not seen', () => {
    service.triggerDashboardTutorial();

    expect(service.activeStep()).not.toBeNull();
    expect(service.activeStep()?.targetId).toBe('tutorial-hamburger-toggle');
    expect(service.hasNextStep()).toBeTrue();
  });

  it('should advance to next step on nextStep call', () => {
    service.triggerDashboardTutorial();
    expect(service.activeStep()?.targetId).toBe('tutorial-hamburger-toggle');

    service.nextStep();

    expect(service.activeStep()?.targetId).toBe('tutorial-nav-dashboard');
    expect(service.hasNextStep()).toBeTrue();
  });

  it('should clear steps and set skip key on skipAll', () => {
    service.triggerDashboardTutorial();
    expect(service.activeStep()).not.toBeNull();

    service.skipAll();

    expect(service.activeStep()).toBeNull();
    expect(service.isSeen('workout')).toBeTrue();
  });

  it('should not trigger tutorial for seen section', () => {
    service.triggerDashboardTutorial();
    service.skipAll();

    service.triggerDashboardTutorial();

    expect(service.activeStep()).toBeNull();
  });

  it('should trigger single section tutorial', () => {
    service.triggerSectionTutorial({
      targetId: 'tutorial-workout-days',
      title: 'Weekly Schedule',
      description: 'Description test',
      section: 'workout',
      position: 'bottom'
    });

    expect(service.activeStep()?.title).toBe('Weekly Schedule');
    expect(service.hasNextStep()).toBeFalse();
  });
});


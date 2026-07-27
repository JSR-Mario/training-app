import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';
import { AuthService, UserResponse } from '../auth/auth.service';
import { of } from 'rxjs';

describe('ThemeService', () => {
  let service: ThemeService;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const mockUser: UserResponse = {
    id: '123',
    username: 'test',
    email: 'test@example.com',
    createdAt: '2026-01-01T00:00:00Z',
    role: 'ROLE_USER'
  };

  beforeEach(() => {
    localStorage.clear();
    authServiceSpy = jasmine.createSpyObj('AuthService', ['updatePreferences'], { isAuthenticated: false });
    authServiceSpy.updatePreferences.and.returnValue(of(mockUser));

    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created with default light theme', () => {
    expect(service).toBeTruthy();
    expect(service.themeMode()).toBe('light');
  });

  it('should cycle theme modes light -> dark -> auto -> light', () => {
    expect(service.themeMode()).toBe('light');
    service.toggleMode();
    expect(service.themeMode()).toBe('dark');
    service.toggleMode();
    expect(service.themeMode()).toBe('auto');
    service.toggleMode();
    expect(service.themeMode()).toBe('light');
  });

  it('should calculate auto theme based on hour', () => {
    const autoTheme = service.getAutoTheme();
    const currentHour = new Date().getHours();
    const expected = (currentHour >= 19 || currentHour < 7) ? 'dark' : 'light';
    expect(autoTheme).toBe(expected);
  });

  it('should apply resolved theme when mode is auto', () => {
    service.setThemeMode('auto');
    expect(service.themeMode()).toBe('auto');
    expect(['light', 'dark']).toContain(service.resolvedThemeMode());
  });
});

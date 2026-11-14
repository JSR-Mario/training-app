import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start unauthenticated', () => {
    expect(service.isAuthenticated).toBeFalse();
    expect(service.accessToken).toBeNull();
  });

  it('should store access token and set authenticated after login', () => {
    const mockResponse = { accessToken: 'fake-jwt-token' };

    service.login({ username: 'test', password: 'password' }).subscribe();

    const req = httpMock.expectOne('/api/v1/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);

    expect(service.isAuthenticated).toBeTrue();
    expect(service.accessToken).toEqual('fake-jwt-token');
  });

  it('should clear access token on logout', () => {
    // Setup initial state
    service['accessTokenSignal'].set('fake-token');
    expect(service.isAuthenticated).toBeTrue();

    service.logout();

    const req = httpMock.expectOne('/api/v1/auth/logout');
    expect(req.request.method).toBe('POST');
    req.flush({});

    expect(service.isAuthenticated).toBeFalse();
    expect(service.accessToken).toBeNull();
  });

  it('should send forgot password request', () => {
    service.forgotPassword('user@example.com').subscribe(res => {
      expect(res.message).toContain('sent a password reset link');
    });

    const req = httpMock.expectOne('/api/v1/auth/forgot-password');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'user@example.com' });
    req.flush({ message: 'If that email address is in our system, we have sent a password reset link.' });
  });

  it('should send reset password request and clear access token', () => {
    service['accessTokenSignal'].set('current-token');
    expect(service.isAuthenticated).toBeTrue();

    service.resetPassword('secret-token', 'NewPassword123').subscribe(res => {
      expect(res.message).toBe('Password has been reset successfully.');
    });

    const req = httpMock.expectOne('/api/v1/auth/reset-password');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: 'secret-token', newPassword: 'NewPassword123' });
    req.flush({ message: 'Password has been reset successfully.' });

    expect(service.isAuthenticated).toBeFalse();
    expect(service.accessToken).toBeNull();
  });
});

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
});

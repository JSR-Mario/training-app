import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { apiUrlInterceptor } from './api-url.interceptor';
import { environment } from '../../../environments/environment';

describe('ApiUrlInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiUrlInterceptor])),
        provideHttpClientTesting()
      ]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should prefix /api routes with environment apiUrl', () => {
    http.get('/api/v1/test').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/test`);
    expect(req.request.url).toBe(`${environment.apiUrl}/api/v1/test`);
    req.flush({});
  });

  it('should NOT prefix non-api routes', () => {
    http.get('/assets/i18n/en.json').subscribe();

    const req = httpMock.expectOne('/assets/i18n/en.json');
    expect(req.request.url).toBe('/assets/i18n/en.json');
    req.flush({});
  });
});

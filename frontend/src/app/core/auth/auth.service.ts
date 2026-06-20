import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';

export interface AuthResponse {
  accessToken: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  
  // Store token purely in memory (in a signal for reactivity)
  private accessTokenSignal = signal<string | null>(null);

  get accessToken() {
    return this.accessTokenSignal();
  }

  get isAuthenticated() {
    return this.accessTokenSignal() !== null;
  }

  login(credentials: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/v1/auth/login', credentials).pipe(
      tap(response => {
        this.accessTokenSignal.set(response.accessToken);
      })
    );
  }

  refreshToken(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/v1/auth/refresh', {}).pipe(
      tap(response => {
        this.accessTokenSignal.set(response.accessToken);
      }),
      catchError(error => {
        this.logout();
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    this.accessTokenSignal.set(null);
    this.http.post('/api/v1/auth/logout', {}).subscribe({
      next: () => this.router.navigate(['/auth/login']),
      error: () => this.router.navigate(['/auth/login'])
    });
  }
}

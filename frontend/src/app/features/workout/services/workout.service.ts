import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { 
  WorkoutSessionRequest, 
  WorkoutSessionResponse, 
  WorkoutSetRequest, 
  WorkoutSetResponse,
  ExerciseSuggestionResponse
} from '../../../core/types/training.types';

@Injectable({
  providedIn: 'root'
})
export class WorkoutService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/training';

  getSessions(programId: string, weekNumber: number): Observable<WorkoutSessionResponse[]> {
    const params = new HttpParams()
      .set('programId', programId)
      .set('weekNumber', weekNumber.toString());
    return this.http.get<WorkoutSessionResponse[]>(`${this.baseUrl}/sessions`, { params });
  }

  getActiveSession(): Observable<WorkoutSessionResponse | null> {
    return this.http.get<WorkoutSessionResponse>(`${this.baseUrl}/sessions/active`).pipe(
      catchError(err => {
        if (err.status === 204 || err.status === 404) {
          return of(null);
        }
        throw err;
      })
    );
  }

  startSession(request: WorkoutSessionRequest): Observable<WorkoutSessionResponse> {
    return this.http.post<WorkoutSessionResponse>(`${this.baseUrl}/sessions`, request);
  }

  getSession(id: string): Observable<WorkoutSessionResponse> {
    return this.http.get<WorkoutSessionResponse>(`${this.baseUrl}/sessions/${id}`);
  }

  deleteSession(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/sessions/${id}`);
  }

  completeSession(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/sessions/${id}/complete`, {});
  }

  uncompleteSession(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/sessions/${id}/uncomplete`, {});
  }

  updateSessionNotes(id: string, notes: string): Observable<WorkoutSessionResponse> {
    return this.http.patch<WorkoutSessionResponse>(`${this.baseUrl}/sessions/${id}/notes`, { notes });
  }

  updateExerciseRating(sessionId: string, dayExerciseId: string, rating: number): Observable<WorkoutSessionResponse> {
    return this.http.put<WorkoutSessionResponse>(`${this.baseUrl}/sessions/${sessionId}/ratings/${dayExerciseId}`, { rating });
  }

  deleteExerciseRating(sessionId: string, dayExerciseId: string): Observable<WorkoutSessionResponse> {
    return this.http.delete<WorkoutSessionResponse>(`${this.baseUrl}/sessions/${sessionId}/ratings/${dayExerciseId}`);
  }

  getSets(sessionId: string): Observable<WorkoutSetResponse[]> {
    return this.http.get<WorkoutSetResponse[]>(`${this.baseUrl}/sessions/${sessionId}/sets`);
  }

  logSet(sessionId: string, request: WorkoutSetRequest): Observable<WorkoutSetResponse> {
    return this.http.post<WorkoutSetResponse>(`${this.baseUrl}/sessions/${sessionId}/sets`, request);
  }

  updateSet(id: string, request: WorkoutSetRequest): Observable<WorkoutSetResponse> {
    return this.http.put<WorkoutSetResponse>(`${this.baseUrl}/workout-sets/${id}`, request);
  }

  deleteSet(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/workout-sets/${id}`);
  }

  getSuggestions(sessionId: string): Observable<ExerciseSuggestionResponse[]> {
    return this.http.get<ExerciseSuggestionResponse[]>(`${this.baseUrl}/sessions/${sessionId}/suggestions`);
  }
}

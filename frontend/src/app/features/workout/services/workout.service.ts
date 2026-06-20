import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  WorkoutSessionRequest, 
  WorkoutSessionResponse, 
  WorkoutSetRequest, 
  WorkoutSetResponse 
} from '../../core/types/training.types';

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
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CardioLogRequest, CardioLogResponse } from '../../../core/types/training.types';

@Injectable({
  providedIn: 'root'
})
export class CardioLogService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/training/cardio-logs';

  getLogs(): Observable<CardioLogResponse[]> {
    return this.http.get<CardioLogResponse[]>(this.apiUrl);
  }

  logCardio(request: CardioLogRequest): Observable<CardioLogResponse> {
    return this.http.post<CardioLogResponse>(this.apiUrl, request);
  }

  deleteLog(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}

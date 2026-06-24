import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { BodyWeightEntry } from '../../../core/types/training.types';

@Injectable({
  providedIn: 'root'
})
export class BodyWeightService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/training/body-weight';

  getWeightEntries(startDate: string, endDate: string): Observable<BodyWeightEntry[]> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    return this.http.get<BodyWeightEntry[]>(this.apiUrl, { params });
  }

  saveWeightEntry(date: string, weightKg: number): Observable<BodyWeightEntry> {
    return this.http.put<BodyWeightEntry>(this.apiUrl, { date, weightKg });
  }

  deleteWeightEntry(date: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${date}`);
  }
}

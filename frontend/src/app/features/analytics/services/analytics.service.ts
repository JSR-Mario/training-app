import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { WeeklyVolumeSnapshot, ExerciseProgressEntry } from '../../../core/types/analytics.types';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/analytics';

  getWeeklyVolume(programId: string, weekNumber: number): Observable<WeeklyVolumeSnapshot[]> {
    const params = new HttpParams()
      .set('programId', programId)
      .set('weekNumber', weekNumber.toString());

    return this.http.get<WeeklyVolumeSnapshot[]>(`${this.apiUrl}/volume`, { params });
  }

  getExerciseProgress(exerciseId: string): Observable<ExerciseProgressEntry[]> {
    return this.http.get<ExerciseProgressEntry[]>(`${this.apiUrl}/progress/${exerciseId}`);
  }
}

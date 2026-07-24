import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { WeeklyVolumeSnapshot, ExerciseProgressEntry, DayVolumeEntry } from '../../../core/types/analytics.types';

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

  /**
   * Returns aggregated total volume per completed session for a given workout day.
   * Results are ordered by session date ascending.
   * The sessionId in each entry is used to highlight the current session bar in the chart.
   */
  getDayVolume(dayTemplateId: string): Observable<DayVolumeEntry[]> {
    const params = new HttpParams().set('dayTemplateId', dayTemplateId);
    return this.http.get<DayVolumeEntry[]>(`${this.apiUrl}/day-volume`, { params });
  }
}

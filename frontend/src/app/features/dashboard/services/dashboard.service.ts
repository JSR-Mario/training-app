import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CardioSummary {
  sessionsThisWeek: number;
  minutesThisWeek: number;
  minutesPercentageChange: number;
}

export interface WeightsSummary {
  sessionsThisWeek: number;
  volumeThisWeekKg: number;
  volumePercentageChange: number;
}

export interface BodyWeightSummary {
  currentWeekAvgKg: number;
  percentageChange: number;
}

export interface ActivitySummary {
  date: string;
  intensity: number;
}

export interface StreakSummary {
  currentStreak: number;
  longestStreak: number;
}

export interface ExperienceSummary {
  totalXp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
}

export interface DashboardSummaryResponse {
  cardio: CardioSummary;
  weights: WeightsSummary;
  bodyWeight: BodyWeightSummary;
  activityCalendar: ActivitySummary[];
  streak: StreakSummary;
  experience: ExperienceSummary;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/training/dashboard';

  getSummary(): Observable<DashboardSummaryResponse> {
    return this.http.get<DashboardSummaryResponse>(`${this.apiUrl}/summary`);
  }
}

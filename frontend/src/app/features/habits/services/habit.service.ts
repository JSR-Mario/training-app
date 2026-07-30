import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Habit, HabitRequest } from '../models/habit.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HabitService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/habits`;

  getHabits(today: string): Observable<Habit[]> {
    const params = new HttpParams().set('today', today);
    return this.http.get<Habit[]>(this.apiUrl, { params });
  }

  createHabit(request: HabitRequest): Observable<Habit> {
    return this.http.post<Habit>(this.apiUrl, request);
  }

  updateHabit(id: string, request: HabitRequest): Observable<Habit> {
    return this.http.put<Habit>(`${this.apiUrl}/${id}`, request);
  }

  deleteHabit(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  toggleLog(id: string, date: string, today: string): Observable<Habit> {
    const params = new HttpParams().set('date', date).set('today', today);
    return this.http.post<Habit>(`${this.apiUrl}/${id}/logs`, null, { params });
  }
}

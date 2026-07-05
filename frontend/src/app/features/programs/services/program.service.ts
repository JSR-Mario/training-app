import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  TrainingProgram, 
  WeekTemplate, 
  DayTemplate, 
  DayExercise 
} from '../../../core/types/training.types';

@Injectable({
  providedIn: 'root'
})
export class ProgramService {
  private http = inject(HttpClient);
  
  // Programs
  getPrograms(): Observable<TrainingProgram[]> {
    return this.http.get<TrainingProgram[]>('/api/v1/training/programs');
  }

  getProgram(id: string): Observable<TrainingProgram> {
    return this.http.get<TrainingProgram>(`/api/v1/training/programs/${id}`);
  }

  createProgram(name: string, durationWeeks: number): Observable<TrainingProgram> {
    return this.http.post<TrainingProgram>('/api/v1/training/programs', { name, durationWeeks });
  }

  updateProgram(id: string, name: string, durationWeeks: number, isActive: boolean): Observable<TrainingProgram> {
    return this.http.put<TrainingProgram>(`/api/v1/training/programs/${id}`, { name, durationWeeks, isActive });
  }

  deleteProgram(id: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/training/programs/${id}`);
  }

  advanceWeek(id: string): Observable<TrainingProgram> {
    return this.http.post<TrainingProgram>(`/api/v1/training/programs/${id}/advance-week`, {});
  }

  // Weeks
  getWeeks(programId: string): Observable<WeekTemplate[]> {
    return this.http.get<WeekTemplate[]>(`/api/v1/training/programs/${programId}/weeks`);
  }

  createWeek(programId: string, weekName: string): Observable<WeekTemplate> {
    return this.http.post<WeekTemplate>(`/api/v1/training/programs/${programId}/weeks`, { name: weekName });
  }

  updateWeek(weekId: string, weekName: string): Observable<WeekTemplate> {
    return this.http.put<WeekTemplate>(`/api/v1/training/weeks/${weekId}`, { name: weekName });
  }

  deleteWeek(weekId: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/training/weeks/${weekId}`);
  }

  // Days
  getDays(weekId: string): Observable<DayTemplate[]> {
    return this.http.get<DayTemplate[]>(`/api/v1/training/weeks/${weekId}/days`);
  }

  getDay(dayId: string): Observable<DayTemplate> {
    return this.http.get<DayTemplate>(`/api/v1/training/days/${dayId}`);
  }

  createDay(weekId: string, dayName: string): Observable<DayTemplate> {
    return this.http.post<DayTemplate>(`/api/v1/training/weeks/${weekId}/days`, { name: dayName });
  }

  updateDay(dayId: string, dayName: string): Observable<DayTemplate> {
    return this.http.put<DayTemplate>(`/api/v1/training/days/${dayId}`, { name: dayName });
  }

  deleteDay(dayId: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/training/days/${dayId}`);
  }

  // Day Exercises
  getDayExercises(dayId: string): Observable<DayExercise[]> {
    return this.http.get<DayExercise[]>(`/api/v1/training/days/${dayId}/exercises`);
  }

  addDayExercise(dayId: string, exerciseId: string, sets: number | undefined, reps: number | undefined, sortOrder: number, repsMax?: number, durationMinutes?: number, incline?: number, resistance?: number, isAmrap = false): Observable<DayExercise> {
    return this.http.post<DayExercise>(`/api/v1/training/days/${dayId}/exercises`, { exerciseId, sets, reps, sortOrder, repsMax, durationMinutes, incline, resistance, isAmrap });
  }

  updateDayExercise(dayExerciseId: string, sets: number | undefined, reps: number | undefined, sortOrder: number, repsMax?: number, durationMinutes?: number, incline?: number, resistance?: number, isAmrap = false): Observable<DayExercise> {
    return this.http.put<DayExercise>(`/api/v1/training/day-exercises/${dayExerciseId}`, { sets, reps, sortOrder, repsMax, durationMinutes, incline, resistance, isAmrap });
  }

  deleteDayExercise(dayExerciseId: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/training/day-exercises/${dayExerciseId}`);
  }

  reorderDayExercises(dayId: string, orderedItems: { id: string, sortOrder: number }[]): Observable<void> {
    return this.http.patch<void>(`/api/v1/training/days/${dayId}/exercises/reorder`, orderedItems);
  }
}

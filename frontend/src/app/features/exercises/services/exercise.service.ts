import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Exercise, ExerciseTarget } from '../../../core/types/training.types';

@Injectable({
  providedIn: 'root'
})
export class ExerciseService {
  private http = inject(HttpClient);
  private readonly BASE_URL = '/api/v1/training/exercises';

  getExercises(): Observable<Exercise[]> {
    return this.http.get<Exercise[]>(this.BASE_URL);
  }

  getExercise(id: string): Observable<Exercise> {
    return this.http.get<Exercise>(`${this.BASE_URL}/${id}`);
  }

  /** Returns up to 3 exercises matching the query for autocomplete. */
  searchExercises(query: string): Observable<Exercise[]> {
    return this.http.get<Exercise[]>(`${this.BASE_URL}/search`, {
      params: { q: query }
    });
  }

  createExercise(data: { name: string; equipmentBrand?: string; unilateral: boolean }): Observable<Exercise> {
    return this.http.post<Exercise>(this.BASE_URL, data);
  }

  updateExercise(id: string, data: { name: string; equipmentBrand?: string; unilateral: boolean }): Observable<Exercise> {
    return this.http.put<Exercise>(`${this.BASE_URL}/${id}`, data);
  }

  deleteExercise(id: string): Observable<void> {
    return this.http.delete<void>(`${this.BASE_URL}/${id}`);
  }

  getExerciseTargets(exerciseId: string): Observable<ExerciseTarget[]> {
    return this.http.get<ExerciseTarget[]>(`${this.BASE_URL}/${exerciseId}/targets`);
  }

  addTarget(exerciseId: string, target: { bodyPart: string; targetValue: number }): Observable<ExerciseTarget> {
    return this.http.post<ExerciseTarget>(`${this.BASE_URL}/${exerciseId}/targets`, target);
  }

  deleteTarget(exerciseId: string, targetId: string): Observable<void> {
    // Note: the backend route is actually /api/v1/training/exercise-targets/{id}
    return this.http.delete<void>(`/api/v1/training/exercise-targets/${targetId}`);
  }
}

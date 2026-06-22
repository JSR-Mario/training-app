export const BODY_PARTS = [
  'CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 
  'QUADS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'CORE', 
  'FOREARMS', 'TRAPS'
] as const;

export type BodyPart = typeof BODY_PARTS[number];

export interface ExerciseTarget {
  id?: string;
  bodyPart: BodyPart;
  targetValue: number;
}

export interface Exercise {
  id: string;
  userId: string;
  name: string;
  equipmentBrand?: string;
  unilateral: boolean;
  targets: ExerciseTarget[];
  createdAt: string;
  updatedAt: string;
}

export interface DayExercise {
  id: string;
  exerciseId: string;
  exerciseName?: string;
  sets: number;
  reps: number;
  sortOrder: number;
}

export interface DayTemplate {
  id: string;
  dayName: string;
  sortOrder: number;
  exercises: DayExercise[];
}

export interface WeekTemplate {
  id: string;
  weekName: string;
  sortOrder: number;
  days: DayTemplate[];
}

export interface TrainingProgram {
  id: string;
  userId: string;
  name: string;
  durationWeeks: number;
  isActive: boolean;
  weeks: WeekTemplate[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutSessionRequest {
  dayTemplateId: string;
  performedOn: string;
  weekNumber: number;
}

export interface WorkoutSessionResponse {
  id: string;
  dayTemplateId: string;
  dayTemplateName: string;
  performedOn: string;
  weekNumber: number;
  completedAt: string | null;
}

export interface WorkoutSetRequest {
  dayExerciseId: string;
  setNumber: number;
  repsCompleted: number;
  weightKg: number;
}

export interface WorkoutSetResponse {
  id: string;
  sessionId: string;
  dayExerciseId: string;
  setNumber: number;
  repsCompleted: number;
  weightKg: number;
  loggedAt: string;
}
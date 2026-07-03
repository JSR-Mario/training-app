export const BODY_PARTS_HIERARCHY = {
  'Upper Body': {
    'Chest': ['UPPER_CHEST', 'MID_CHEST', 'LOWER_CHEST'],
    'Back': ['LATS', 'MID_BACK', 'LOWER_BACK'],
    'Shoulders': ['FRONT_DELTS', 'LATERAL_DELTS', 'REAR_DELTS'],
    'Arms': ['BICEPS', 'TRICEPS', 'FOREARMS'],
    'Traps': ['TRAPS'],
    'Core': ['CORE']
  },
  'Lower Body': {
    'Quads': ['QUADS'],
    'Hamstrings': ['HAMSTRINGS'],
    'Glutes': ['GLUTES'],
    'Calves': ['CALVES'],
    'Adductors': ['ADDUCTORS']
  }
} as const;

export const BODY_PARTS = Object.values(BODY_PARTS_HIERARCHY)
  .flatMap(category => Object.values(category).flat());

export type BodyPart = typeof BODY_PARTS[number];

export function getBodyPartPath(bodyPart: BodyPart): { category: string, group: string } | null {
  for (const [category, groups] of Object.entries(BODY_PARTS_HIERARCHY)) {
    for (const [group, parts] of Object.entries(groups)) {
      if ((parts as readonly string[]).includes(bodyPart)) {
        return { category, group };
      }
    }
  }
  return null;
}

export interface ExerciseTarget {
  id?: string;
  bodyPart: BodyPart;
  targetValue: number;
}

export type ExerciseType = 'STRENGTH' | 'CARDIO';

export interface Exercise {
  id: string;
  userId: string;
  name: string;
  equipmentBrand?: string;
  unilateral: boolean;
  spinalLoading: boolean;
  isPublic: boolean;
  type: ExerciseType;
  targets: ExerciseTarget[];
  averageRating?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DayExercise {
  id: string;
  exerciseId: string;
  exerciseName?: string;
  sets?: number;
  reps?: number;
  repsMax?: number;
  durationMinutes?: number;
  incline?: number;
  resistance?: number;
  sortOrder: number;
  unilateral?: boolean;
}

export interface DayTemplate {
  id: string;
  weekTemplateId: string;
  name: string;
  exercises: DayExercise[];
}

export interface BodyWeightEntry {
  id?: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
}

export interface WeekTemplate {
  id: string;
  programId: string;
  name: string;
  days: DayTemplate[];
}

export interface TrainingProgram {
  id: string;
  userId: string;
  name: string;
  durationWeeks: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutSessionRequest {
  dayTemplateId: string;
  performedOn: string;
  weekNumber: number;
}

export interface SessionRatingResponse {
  id: string;
  dayExerciseId: string;
  rating: number;
}

export interface WorkoutSessionResponse {
  id: string;
  dayTemplateId: string;
  dayTemplateName: string;
  performedOn: string;
  weekNumber: number;
  completedAt: string | null;
  notes?: string;
  ratings?: SessionRatingResponse[];
}

export interface WorkoutSetRequest {
  dayExerciseId: string;
  setNumber: number;
  repsCompleted?: number;
  repsCompletedRight?: number;
  weightKg?: number;
  durationMinutes?: number;
  incline?: number;
  resistance?: number;
}

export interface WorkoutSetResponse {
  id: string;
  sessionId: string;
  dayExerciseId: string;
  setNumber: number;
  repsCompleted?: number;
  repsCompletedRight?: number;
  weightKg?: number;
  durationMinutes?: number;
  incline?: number;
  resistance?: number;
  loggedAt: string;
  performanceStatus?: 'GOOD' | 'WARNING' | 'CRITICAL';
}

export interface ExerciseSuggestionResponse {
  dayExerciseId: string;
  exerciseId: string;
  suggestedWeightKg?: number;
  suggestedReps?: number;
  suggestedDurationMinutes?: number;
  suggestedIncline?: number;
  suggestedResistance?: number;
}

export interface ExerciseHistoryResponse {
  setId: string;
  performedOn: string;
  durationMinutes?: number;
  incline?: number;
  resistance?: number;
  repsCompleted?: number;
  weightKg?: number;
}
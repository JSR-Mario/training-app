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
    'Legs': ['QUADS', 'HAMSTRINGS', 'CALVES', 'ADDUCTORS'],
    'Glutes': ['GLUTES']
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

export interface Exercise {
  id: string;
  userId: string;
  name: string;
  equipmentBrand?: string;
  unilateral: boolean;
  isPublic: boolean;
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
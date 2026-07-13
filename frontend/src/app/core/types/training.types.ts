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



export interface Exercise {
  id: string;
  userId: string;
  name: string;
  equipmentBrand?: string;
  unilateral: boolean;
  spinalLoading: boolean;
  isBodyweight: boolean;
  isPublic: boolean;
  targets: ExerciseTarget[];
  averageRating?: number;
  personalRecord?: {
    weightKg: number;
    reps: number;
  };
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
  sortOrder: number;
  isAmrap?: boolean;
  unilateral?: boolean;
  isBodyweight?: boolean;
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

export type ProgramGoal = 'CUT' | 'BULK' | 'MAINTENANCE';

export interface TrainingProgram {
  id: string;
  userId: string;
  name: string;
  durationWeeks: number;
  isActive: boolean;
  currentWeek: number;
  goal: ProgramGoal;
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
}

export interface WorkoutSetResponse {
  id: string;
  sessionId: string;
  dayExerciseId: string;
  setNumber: number;
  repsCompleted?: number;
  repsCompletedRight?: number;
  weightKg?: number;
  loggedAt: string;
  performanceStatus?: 'GOOD' | 'WARNING' | 'CRITICAL';
}

export interface ActivitySummary {
  date: string;
  intensity: number;
}

export interface DashboardSummaryResponse {
  activeGoal?: ProgramGoal;
  cardio: {
    sessionsThisWeek: number;
    minutesThisWeek: number;
    minutesPercentageChange: number;
  };
  weights: {
    sessionsThisWeek: number;
    volumeThisWeekKg: number;
    volumePercentageChange: number;
  };
  bodyWeight: {
    currentWeekAvgKg: number;
    percentageChange: number;
    absoluteChangeKg: number;
  };
  activityCalendar: ActivitySummary[];
  streak: {
    currentStreak: number;
    longestStreak: number;
  };
  experience: {
    totalXp: number;
    level: number;
    currentLevelXp: number;
    nextLevelXp: number;
  };
}

export interface ExerciseSuggestionResponse {
  dayExerciseId: string;
  exerciseId: string;
  suggestedWeightKg?: number;
  suggestedReps?: number;
}

export interface ExerciseHistoryResponse {
  setId: string;
  performedOn: string;
  repsCompleted?: number;
  weightKg?: number;
}

export interface CardioLogRequest {
  durationMinutes: number;
  cardioType?: string;
  performedOn: string;
}

export interface CardioLogResponse {
  id: string;
  durationMinutes: number;
  cardioType?: string;
  performedOn: string;
  createdAt: string;
}

export interface ProgramRequest {
  name: string;
  durationWeeks: number;
  startDate: string | null;
  isActive: boolean;
  goal: ProgramGoal;
  currentWeek?: number;
}
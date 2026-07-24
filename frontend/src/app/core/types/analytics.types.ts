export interface WeeklyVolumeSnapshot {
  bodyPart: string;
  totalSets: number;
}

export interface ExerciseProgressEntry {
  sessionDate: string;
  weekNumber: number;
  dayTemplateId: string;
  maxWeightKg: number;
  totalVolumeKg: number;
  totalSets: number;
}

/**
 * Aggregated volume for a single workout session, returned by
 * GET /api/v1/analytics/day-volume?dayTemplateId=.
 *
 * sessionId is used by the chart to highlight the current session bar
 * using an exact UUID comparison (never a date-string comparison).
 */
export interface DayVolumeEntry {
  sessionDate: string;
  sessionId: string;
  weekNumber: number;
  totalVolumeKg: number;
}

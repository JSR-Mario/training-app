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

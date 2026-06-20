export interface WeeklyVolumeSnapshot {
  bodyPart: string;
  totalSets: number;
}

export interface ExerciseProgressEntry {
  sessionDate: string;
  maxWeightKg: number;
  totalVolumeKg: number;
  totalSets: number;
}

export enum HabitFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY'
}

export interface Habit {
  id: string;
  title: string;
  description: string;
  frequency: HabitFrequency;
  currentStreak: number;
  longestStreak: number;
  completedDates: string[];
}

export interface HabitRequest {
  title: string;
  description: string;
  frequency: HabitFrequency;
}

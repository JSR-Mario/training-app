package com.trainingapp.training.dto;

import com.trainingapp.training.domain.ProgramGoal;

public class DashboardSummaryResponse {

    private CardioSummary cardio;
    private WeightsSummary weights;
    private BodyWeightSummary bodyWeight;
    private java.util.List<ActivitySummary> activityCalendar;
    private StreakSummary streak;
    private ExperienceSummary experience;
    private ProgramGoal activeGoal;

    public DashboardSummaryResponse() {}

    public DashboardSummaryResponse(CardioSummary cardio, WeightsSummary weights, BodyWeightSummary bodyWeight,
                                     java.util.List<ActivitySummary> activityCalendar,
                                     StreakSummary streak, ExperienceSummary experience,
                                     ProgramGoal activeGoal) {
        this.cardio = cardio;
        this.weights = weights;
        this.bodyWeight = bodyWeight;
        this.activityCalendar = activityCalendar;
        this.streak = streak;
        this.experience = experience;
        this.activeGoal = activeGoal;
    }

    public CardioSummary getCardio() { return cardio; }
    public void setCardio(CardioSummary cardio) { this.cardio = cardio; }

    public WeightsSummary getWeights() { return weights; }
    public void setWeights(WeightsSummary weights) { this.weights = weights; }

    public BodyWeightSummary getBodyWeight() { return bodyWeight; }
    public void setBodyWeight(BodyWeightSummary bodyWeight) { this.bodyWeight = bodyWeight; }

    public java.util.List<ActivitySummary> getActivityCalendar() { return activityCalendar; }
    public void setActivityCalendar(java.util.List<ActivitySummary> activityCalendar) { this.activityCalendar = activityCalendar; }

    public StreakSummary getStreak() { return streak; }
    public void setStreak(StreakSummary streak) { this.streak = streak; }

    public ExperienceSummary getExperience() { return experience; }
    public void setExperience(ExperienceSummary experience) {
        this.experience = experience;
    }

    public ProgramGoal getActiveGoal() {
        return activeGoal;
    }

    public void setActiveGoal(ProgramGoal activeGoal) {
        this.activeGoal = activeGoal;
    }

    public static class ActivitySummary {
        private String date;
        private int intensity;

        public ActivitySummary() {}

        public ActivitySummary(String date, int intensity) {
            this.date = date;
            this.intensity = intensity;
        }

        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }

        public int getIntensity() { return intensity; }
        public void setIntensity(int intensity) { this.intensity = intensity; }
    }

    public static class CardioSummary {
        private int sessionsThisWeek;
        private int minutesThisWeek;
        private double minutesPercentageChange;

        public CardioSummary() {}

        public CardioSummary(int sessionsThisWeek, int minutesThisWeek, double minutesPercentageChange) {
            this.sessionsThisWeek = sessionsThisWeek;
            this.minutesThisWeek = minutesThisWeek;
            this.minutesPercentageChange = minutesPercentageChange;
        }

        public int getSessionsThisWeek() { return sessionsThisWeek; }
        public void setSessionsThisWeek(int sessionsThisWeek) { this.sessionsThisWeek = sessionsThisWeek; }

        public int getMinutesThisWeek() { return minutesThisWeek; }
        public void setMinutesThisWeek(int minutesThisWeek) { this.minutesThisWeek = minutesThisWeek; }

        public double getMinutesPercentageChange() { return minutesPercentageChange; }
        public void setMinutesPercentageChange(double minutesPercentageChange) { this.minutesPercentageChange = minutesPercentageChange; }
    }

    public static class WeightsSummary {
        private int sessionsThisWeek;
        private double volumeThisWeekKg;
        private double volumePercentageChange;

        public WeightsSummary() {}

        public WeightsSummary(int sessionsThisWeek, double volumeThisWeekKg, double volumePercentageChange) {
            this.sessionsThisWeek = sessionsThisWeek;
            this.volumeThisWeekKg = volumeThisWeekKg;
            this.volumePercentageChange = volumePercentageChange;
        }

        public int getSessionsThisWeek() { return sessionsThisWeek; }
        public void setSessionsThisWeek(int sessionsThisWeek) { this.sessionsThisWeek = sessionsThisWeek; }

        public double getVolumeThisWeekKg() { return volumeThisWeekKg; }
        public void setVolumeThisWeekKg(double volumeThisWeekKg) { this.volumeThisWeekKg = volumeThisWeekKg; }

        public double getVolumePercentageChange() { return volumePercentageChange; }
        public void setVolumePercentageChange(double volumePercentageChange) { this.volumePercentageChange = volumePercentageChange; }
    }

    public static class BodyWeightSummary {
        private double currentWeekAvgKg;
        private double percentageChange;
        private double absoluteChangeKg;

        public BodyWeightSummary() {}

        public BodyWeightSummary(double currentWeekAvgKg, double percentageChange, double absoluteChangeKg) {
            this.currentWeekAvgKg = currentWeekAvgKg;
            this.percentageChange = percentageChange;
            this.absoluteChangeKg = absoluteChangeKg;
        }

        public double getCurrentWeekAvgKg() { return currentWeekAvgKg; }
        public void setCurrentWeekAvgKg(double currentWeekAvgKg) { this.currentWeekAvgKg = currentWeekAvgKg; }

        public double getPercentageChange() { return percentageChange; }
        public void setPercentageChange(double percentageChange) { this.percentageChange = percentageChange; }

        public double getAbsoluteChangeKg() { return absoluteChangeKg; }
        public void setAbsoluteChangeKg(double absoluteChangeKg) { this.absoluteChangeKg = absoluteChangeKg; }
    }

    /** Summary of the user's activity streak (consecutive active days). */
    public static class StreakSummary {
        private int currentStreak;
        private int longestStreak;

        public StreakSummary() {}

        public StreakSummary(int currentStreak, int longestStreak) {
            this.currentStreak = currentStreak;
            this.longestStreak = longestStreak;
        }

        public int getCurrentStreak() { return currentStreak; }
        public void setCurrentStreak(int currentStreak) { this.currentStreak = currentStreak; }

        public int getLongestStreak() { return longestStreak; }
        public void setLongestStreak(int longestStreak) { this.longestStreak = longestStreak; }
    }

    /** Summary of the user's XP and current level for the progression system. */
    public static class ExperienceSummary {
        private double totalXp;
        private int level;
        private double currentLevelXp;
        private double nextLevelXp;

        public ExperienceSummary() {}

        public ExperienceSummary(double totalXp, int level, double currentLevelXp, double nextLevelXp) {
            this.totalXp = totalXp;
            this.level = level;
            this.currentLevelXp = currentLevelXp;
            this.nextLevelXp = nextLevelXp;
        }

        public double getTotalXp() { return totalXp; }
        public void setTotalXp(double totalXp) { this.totalXp = totalXp; }

        public int getLevel() { return level; }
        public void setLevel(int level) { this.level = level; }

        public double getCurrentLevelXp() { return currentLevelXp; }
        public void setCurrentLevelXp(double currentLevelXp) { this.currentLevelXp = currentLevelXp; }

        public double getNextLevelXp() { return nextLevelXp; }
        public void setNextLevelXp(double nextLevelXp) { this.nextLevelXp = nextLevelXp; }
    }
}

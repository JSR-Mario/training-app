package com.trainingapp.training.dto;

public class DashboardSummaryResponse {

    private CardioSummary cardio;
    private WeightsSummary weights;
    private BodyWeightSummary bodyWeight;
    private java.util.List<ActivitySummary> activityCalendar;

    public DashboardSummaryResponse() {}

    public DashboardSummaryResponse(CardioSummary cardio, WeightsSummary weights, BodyWeightSummary bodyWeight, java.util.List<ActivitySummary> activityCalendar) {
        this.cardio = cardio;
        this.weights = weights;
        this.bodyWeight = bodyWeight;
        this.activityCalendar = activityCalendar;
    }

    public CardioSummary getCardio() { return cardio; }
    public void setCardio(CardioSummary cardio) { this.cardio = cardio; }

    public WeightsSummary getWeights() { return weights; }
    public void setWeights(WeightsSummary weights) { this.weights = weights; }

    public BodyWeightSummary getBodyWeight() { return bodyWeight; }
    public void setBodyWeight(BodyWeightSummary bodyWeight) { this.bodyWeight = bodyWeight; }

    public java.util.List<ActivitySummary> getActivityCalendar() { return activityCalendar; }
    public void setActivityCalendar(java.util.List<ActivitySummary> activityCalendar) { this.activityCalendar = activityCalendar; }

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

        public BodyWeightSummary() {}

        public BodyWeightSummary(double currentWeekAvgKg, double percentageChange) {
            this.currentWeekAvgKg = currentWeekAvgKg;
            this.percentageChange = percentageChange;
        }

        public double getCurrentWeekAvgKg() { return currentWeekAvgKg; }
        public void setCurrentWeekAvgKg(double currentWeekAvgKg) { this.currentWeekAvgKg = currentWeekAvgKg; }

        public double getPercentageChange() { return percentageChange; }
        public void setPercentageChange(double percentageChange) { this.percentageChange = percentageChange; }
    }
}

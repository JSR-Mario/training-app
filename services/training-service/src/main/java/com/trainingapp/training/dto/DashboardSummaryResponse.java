package com.trainingapp.training.dto;

public class DashboardSummaryResponse {

    private CardioSummary cardio;
    private WeightsSummary weights;

    public DashboardSummaryResponse() {}

    public DashboardSummaryResponse(CardioSummary cardio, WeightsSummary weights) {
        this.cardio = cardio;
        this.weights = weights;
    }

    public CardioSummary getCardio() { return cardio; }
    public void setCardio(CardioSummary cardio) { this.cardio = cardio; }

    public WeightsSummary getWeights() { return weights; }
    public void setWeights(WeightsSummary weights) { this.weights = weights; }

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
}

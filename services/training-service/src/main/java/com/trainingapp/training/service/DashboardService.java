package com.trainingapp.training.service;

import com.trainingapp.training.domain.CardioLog;
import com.trainingapp.training.domain.WorkoutSession;
import com.trainingapp.training.domain.WorkoutSet;
import com.trainingapp.training.dto.DashboardSummaryResponse;
import com.trainingapp.training.repository.CardioLogRepository;
import com.trainingapp.training.repository.WorkoutSessionRepository;
import com.trainingapp.training.repository.WorkoutSetRepository;
import com.trainingapp.training.repository.BodyWeightRepository;
import com.trainingapp.training.repository.TrainingProgramRepository;
import com.trainingapp.training.domain.BodyWeightEntry;
import com.trainingapp.training.domain.ProgramGoal;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

/**
 * Service that assembles the dashboard summary response.
 *
 * <p>Computes weekly stats for cardio, weights, and body weight; builds the 365-day
 * activity calendar; calculates the current and longest activity streak; and reads
 * the user's persisted XP to derive their level and level progress.
 */
@Service
public class DashboardService {

    private final CardioLogRepository cardioLogRepository;
    private final WorkoutSessionRepository sessionRepository;
    private final WorkoutSetRepository setRepository;
    private final BodyWeightRepository bodyWeightRepository;
    private final ExperienceService experienceService;
    private final TrainingProgramRepository programRepository;

    public DashboardService(CardioLogRepository cardioLogRepository,
                            WorkoutSessionRepository sessionRepository,
                            WorkoutSetRepository setRepository,
                            BodyWeightRepository bodyWeightRepository,
                            ExperienceService experienceService,
                            TrainingProgramRepository programRepository) {
        this.cardioLogRepository = cardioLogRepository;
        this.sessionRepository = sessionRepository;
        this.setRepository = setRepository;
        this.bodyWeightRepository = bodyWeightRepository;
        this.experienceService = experienceService;
        this.programRepository = programRepository;
    }

    /**
     * Builds the full dashboard summary for the given user.
     *
     * @param userId the authenticated user's UUID
     * @return a populated {@link DashboardSummaryResponse}
     */
    public DashboardSummaryResponse getSummary(UUID userId) {
        LocalDate today = LocalDate.now(ZoneId.of("UTC"));
        LocalDate endOfThisWeek = today;
        LocalDate startOfThisWeek = today.minusDays(6);

        LocalDate endOfLastWeek = today.minusDays(7);
        LocalDate startOfLastWeek = today.minusDays(13);

        // ── Cardio ────────────────────────────────────────────────────────────
        List<CardioLog> cardioThisWeek = cardioLogRepository.findByUserIdAndPerformedOnBetween(userId, startOfThisWeek, endOfThisWeek);
        List<CardioLog> cardioLastWeek = cardioLogRepository.findByUserIdAndPerformedOnBetween(userId, startOfLastWeek, endOfLastWeek);

        int cardioSessionsThisWeek = cardioThisWeek.size();
        int cardioMinutesThisWeek = cardioThisWeek.stream().mapToInt(CardioLog::getDurationMinutes).sum();
        int cardioMinutesLastWeek = cardioLastWeek.stream().mapToInt(CardioLog::getDurationMinutes).sum();
        double cardioPercentageChange = calculatePercentageChange(cardioMinutesLastWeek, cardioMinutesThisWeek);

        DashboardSummaryResponse.CardioSummary cardioSummary = new DashboardSummaryResponse.CardioSummary(
                cardioSessionsThisWeek, cardioMinutesThisWeek, cardioPercentageChange);

        // ── Weights ───────────────────────────────────────────────────────────
        List<WorkoutSession> sessionsThisWeek = sessionRepository.findByUserIdAndPerformedOnBetween(userId, startOfThisWeek, endOfThisWeek);
        List<WorkoutSet> setsThisWeek = setRepository.findByUserIdAndPerformedOnBetween(userId, startOfThisWeek, endOfThisWeek);
        List<WorkoutSet> setsLastWeek = setRepository.findByUserIdAndPerformedOnBetween(userId, startOfLastWeek, endOfLastWeek);

        int weightSessionsThisWeek = sessionsThisWeek.size();
        double volumeThisWeek = computeVolume(setsThisWeek);
        double volumeLastWeek = computeVolume(setsLastWeek);
        double volumePercentageChange = calculatePercentageChange(volumeLastWeek, volumeThisWeek);

        DashboardSummaryResponse.WeightsSummary weightsSummary = new DashboardSummaryResponse.WeightsSummary(
                weightSessionsThisWeek, volumeThisWeek, volumePercentageChange);

        // ── Body Weight ───────────────────────────────────────────────────────
        java.util.Optional<com.trainingapp.training.domain.TrainingProgram> activeProgramOpt = programRepository.findByUserIdAndIsActiveTrue(userId);
        
        LocalDate weightStartDate;
        String timeframeLabel;
        if (activeProgramOpt.isPresent() && activeProgramOpt.get().getStartDate() != null) {
            weightStartDate = activeProgramOpt.get().getStartDate();
            timeframeLabel = "Since program start";
        } else {
            weightStartDate = today.minusDays(30);
            timeframeLabel = "Last 30 days";
        }

        java.util.Optional<com.trainingapp.training.domain.BodyWeightEntry> currentWeightOpt = bodyWeightRepository.findFirstByUserIdOrderByDateDesc(userId);
        java.util.Optional<com.trainingapp.training.domain.BodyWeightEntry> baselineWeightOpt = bodyWeightRepository.findFirstByUserIdAndDateLessThanEqualOrderByDateDesc(userId, weightStartDate);
        if (baselineWeightOpt.isEmpty()) {
            baselineWeightOpt = bodyWeightRepository.findFirstByUserIdAndDateGreaterThanEqualOrderByDateAsc(userId, weightStartDate);
        }

        double currentWeightKg = currentWeightOpt.map(e -> e.getWeightKg().doubleValue()).orElse(0.0);
        double baselineWeightKg = baselineWeightOpt.map(e -> e.getWeightKg().doubleValue()).orElse(currentWeightKg);

        double absoluteChangeKg = (baselineWeightKg > 0 && currentWeightKg > 0) ? currentWeightKg - baselineWeightKg : 0.0;
        double bodyWeightPercentageChange = calculatePercentageChange(baselineWeightKg, currentWeightKg);

        DashboardSummaryResponse.BodyWeightSummary bodyWeightSummary = new DashboardSummaryResponse.BodyWeightSummary(
                currentWeightKg, bodyWeightPercentageChange, absoluteChangeKg, timeframeLabel);

        // ── Activity Calendar (last 365 days) ─────────────────────────────────
        LocalDate oneYearAgo = today.minusDays(364);
        List<WorkoutSession> yearSessions = sessionRepository.findByUserIdAndPerformedOnBetween(userId, oneYearAgo, today);
        List<CardioLog> yearCardio = cardioLogRepository.findByUserIdAndPerformedOnBetween(userId, oneYearAgo, today);
        List<BodyWeightEntry> yearWeights = bodyWeightRepository.findAllByUserIdAndDateBetweenOrderByDateAsc(userId, oneYearAgo, today);

        java.util.Map<LocalDate, Boolean> hasWorkout = new java.util.HashMap<>();
        for (WorkoutSession s : yearSessions) hasWorkout.put(s.getPerformedOn(), true);

        java.util.Map<LocalDate, Boolean> hasCardio = new java.util.HashMap<>();
        for (CardioLog c : yearCardio) hasCardio.put(c.getPerformedOn(), true);

        java.util.Map<LocalDate, Boolean> hasWeight = new java.util.HashMap<>();
        for (BodyWeightEntry b : yearWeights) hasWeight.put(b.getDate(), true);

        List<DashboardSummaryResponse.ActivitySummary> activityCalendar = new java.util.ArrayList<>();
        for (LocalDate d = oneYearAgo; !d.isAfter(today); d = d.plusDays(1)) {
            int intensity = 0;
            if (hasWorkout.getOrDefault(d, false)) intensity++;
            if (hasWeight.getOrDefault(d, false)) intensity++;
            if (hasCardio.getOrDefault(d, false)) intensity++;
            activityCalendar.add(new DashboardSummaryResponse.ActivitySummary(d.toString(), intensity));
        }

        // ── Streaks ───────────────────────────────────────────────────────────
        // Build a day-indexed array of active flags (index 0 = oneYearAgo, last index = today)
        int totalDays = activityCalendar.size();
        boolean[] active = new boolean[totalDays];
        for (int i = 0; i < totalDays; i++) {
            active[i] = activityCalendar.get(i).getIntensity() > 0;
        }

        // Walk backwards from today; if today has no activity yet, start from yesterday
        // so a streak is not broken mid-day.
        int current = 0;
        int end = totalDays - 1;
        if (!active[end]) end = totalDays - 2;
        for (int i = end; i >= 0 && active[i]; i--) {
            current++;
        }

        // Longest streak: single pass over all 365 days
        int longest = 0;
        int run = 0;
        for (boolean a : active) {
            if (a) {
                run++;
                if (run > longest) longest = run;
            } else {
                run = 0;
            }
        }

        DashboardSummaryResponse.StreakSummary streakSummary =
                new DashboardSummaryResponse.StreakSummary(current, longest);

        // ── Experience / Level ────────────────────────────────────────────────
        double totalXp = experienceService.getOrInitialize(userId).getTotalXp().doubleValue();
        int level = experienceService.calculateLevel(totalXp);
        double curLevelXp = experienceService.currentLevelXp(totalXp);
        double nxtLevelXp = experienceService.nextLevelXp(totalXp);

        DashboardSummaryResponse.ExperienceSummary experienceSummary =
                new DashboardSummaryResponse.ExperienceSummary(totalXp, level, curLevelXp, nxtLevelXp);

        ProgramGoal activeGoal = programRepository.findByUserIdAndIsActiveTrue(userId)
                .map(com.trainingapp.training.domain.TrainingProgram::getGoal)
                .orElse(ProgramGoal.MAINTENANCE);

        return new DashboardSummaryResponse(cardioSummary, weightsSummary, bodyWeightSummary,
                activityCalendar, streakSummary, experienceSummary, activeGoal);
    }

    /**
     * Computes total volume (weight × reps) from a list of workout sets.
     *
     * @param sets the sets to sum
     * @return total volume in kg
     */
    private double computeVolume(List<WorkoutSet> sets) {
        return sets.stream()
                .filter(s -> s.getWeightKg() != null && s.getRepsCompleted() != null)
                .mapToDouble(s -> {
                    int reps = s.getRepsCompleted()
                            + (s.getRepsCompletedRight() != null ? s.getRepsCompletedRight() : 0);
                    return s.getWeightKg().multiply(java.math.BigDecimal.valueOf(reps)).doubleValue();
                })
                .sum();
    }

    /**
     * Calculates the percentage change between two values.
     *
     * @param oldVal previous period value
     * @param newVal current period value
     * @return percentage change, or 100.0 / 0.0 if oldVal is zero
     */
    private double calculatePercentageChange(double oldVal, double newVal) {
        if (oldVal == 0) {
            return newVal > 0 ? 100.0 : 0.0;
        }
        return ((newVal - oldVal) / oldVal) * 100.0;
    }
}

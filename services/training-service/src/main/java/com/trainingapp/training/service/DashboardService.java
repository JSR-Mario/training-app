package com.trainingapp.training.service;

import com.trainingapp.training.domain.CardioLog;
import com.trainingapp.training.domain.WorkoutSession;
import com.trainingapp.training.domain.WorkoutSet;
import com.trainingapp.training.dto.DashboardSummaryResponse;
import com.trainingapp.training.repository.CardioLogRepository;
import com.trainingapp.training.repository.WorkoutSessionRepository;
import com.trainingapp.training.repository.WorkoutSetRepository;
import com.trainingapp.training.repository.BodyWeightRepository;
import com.trainingapp.training.domain.BodyWeightEntry;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.UUID;

@Service
public class DashboardService {

    private final CardioLogRepository cardioLogRepository;
    private final WorkoutSessionRepository sessionRepository;
    private final WorkoutSetRepository setRepository;
    private final BodyWeightRepository bodyWeightRepository;

    public DashboardService(CardioLogRepository cardioLogRepository,
                            WorkoutSessionRepository sessionRepository,
                            WorkoutSetRepository setRepository,
                            BodyWeightRepository bodyWeightRepository) {
        this.cardioLogRepository = cardioLogRepository;
        this.sessionRepository = sessionRepository;
        this.setRepository = setRepository;
        this.bodyWeightRepository = bodyWeightRepository;
    }

    public DashboardSummaryResponse getSummary(UUID userId) {
        LocalDate today = LocalDate.now(ZoneId.of("UTC"));
        LocalDate endOfThisWeek = today;
        LocalDate startOfThisWeek = today.minusDays(6);
        
        LocalDate endOfLastWeek = today.minusDays(7);
        LocalDate startOfLastWeek = today.minusDays(13);

        // Cardio
        List<CardioLog> cardioThisWeek = cardioLogRepository.findByUserIdAndPerformedOnBetween(userId, startOfThisWeek, endOfThisWeek);
        List<CardioLog> cardioLastWeek = cardioLogRepository.findByUserIdAndPerformedOnBetween(userId, startOfLastWeek, endOfLastWeek);

        int cardioSessionsThisWeek = cardioThisWeek.size();
        int cardioMinutesThisWeek = cardioThisWeek.stream().mapToInt(CardioLog::getDurationMinutes).sum();
        int cardioMinutesLastWeek = cardioLastWeek.stream().mapToInt(CardioLog::getDurationMinutes).sum();
        double cardioPercentageChange = calculatePercentageChange(cardioMinutesLastWeek, cardioMinutesThisWeek);

        DashboardSummaryResponse.CardioSummary cardioSummary = new DashboardSummaryResponse.CardioSummary(
                cardioSessionsThisWeek, cardioMinutesThisWeek, cardioPercentageChange);

        // Weights
        List<WorkoutSession> sessionsThisWeek = sessionRepository.findByUserIdAndPerformedOnBetween(userId, startOfThisWeek, endOfThisWeek);
        List<WorkoutSet> setsThisWeek = setRepository.findByUserIdAndPerformedOnBetween(userId, startOfThisWeek, endOfThisWeek);
        List<WorkoutSet> setsLastWeek = setRepository.findByUserIdAndPerformedOnBetween(userId, startOfLastWeek, endOfLastWeek);

        int weightSessionsThisWeek = sessionsThisWeek.size();
        double volumeThisWeek = setsThisWeek.stream()
                .filter(s -> s.getWeightKg() != null && s.getRepsCompleted() != null)
                .mapToDouble(s -> {
                    int totalReps = s.getRepsCompleted();
                    if (s.getRepsCompletedRight() != null) {
                        totalReps += s.getRepsCompletedRight();
                    }
                    return s.getWeightKg().multiply(java.math.BigDecimal.valueOf(totalReps)).doubleValue();
                })
                .sum();
        double volumeLastWeek = setsLastWeek.stream()
                .filter(s -> s.getWeightKg() != null && s.getRepsCompleted() != null)
                .mapToDouble(s -> {
                    int totalReps = s.getRepsCompleted();
                    if (s.getRepsCompletedRight() != null) {
                        totalReps += s.getRepsCompletedRight();
                    }
                    return s.getWeightKg().multiply(java.math.BigDecimal.valueOf(totalReps)).doubleValue();
                })
                .sum();
        
        double volumePercentageChange = calculatePercentageChange(volumeLastWeek, volumeThisWeek);

        DashboardSummaryResponse.WeightsSummary weightsSummary = new DashboardSummaryResponse.WeightsSummary(
                weightSessionsThisWeek, volumeThisWeek, volumePercentageChange);

        // Body Weight
        List<BodyWeightEntry> weightsThisWeek = bodyWeightRepository.findAllByUserIdAndDateBetweenOrderByDateAsc(userId, startOfThisWeek, endOfThisWeek);
        List<BodyWeightEntry> weightsLastWeek = bodyWeightRepository.findAllByUserIdAndDateBetweenOrderByDateAsc(userId, startOfLastWeek, endOfLastWeek);

        double avgWeightThisWeek = weightsThisWeek.stream().mapToDouble(e -> e.getWeightKg().doubleValue()).average().orElse(0.0);
        double avgWeightLastWeek = weightsLastWeek.stream().mapToDouble(e -> e.getWeightKg().doubleValue()).average().orElse(0.0);
        double bodyWeightPercentageChange = calculatePercentageChange(avgWeightLastWeek, avgWeightThisWeek);

        DashboardSummaryResponse.BodyWeightSummary bodyWeightSummary = new DashboardSummaryResponse.BodyWeightSummary(
                avgWeightThisWeek, bodyWeightPercentageChange);

        return new DashboardSummaryResponse(cardioSummary, weightsSummary, bodyWeightSummary);
    }

    private double calculatePercentageChange(double oldVal, double newVal) {
        if (oldVal == 0) {
            return newVal > 0 ? 100.0 : 0.0;
        }
        return ((newVal - oldVal) / oldVal) * 100.0;
    }
}

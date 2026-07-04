package com.trainingapp.training.service;

import com.trainingapp.training.domain.CardioLog;
import com.trainingapp.training.domain.WorkoutSession;
import com.trainingapp.training.domain.WorkoutSet;
import com.trainingapp.training.dto.DashboardSummaryResponse;
import com.trainingapp.training.repository.CardioLogRepository;
import com.trainingapp.training.repository.WorkoutSessionRepository;
import com.trainingapp.training.repository.WorkoutSetRepository;
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

    public DashboardService(CardioLogRepository cardioLogRepository,
                            WorkoutSessionRepository sessionRepository,
                            WorkoutSetRepository setRepository) {
        this.cardioLogRepository = cardioLogRepository;
        this.sessionRepository = sessionRepository;
        this.setRepository = setRepository;
    }

    public DashboardSummaryResponse getSummary(UUID userId) {
        LocalDate today = LocalDate.now(ZoneId.of("UTC"));
        LocalDate startOfThisWeek = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate endOfThisWeek = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
        
        LocalDate startOfLastWeek = startOfThisWeek.minusWeeks(1);
        LocalDate endOfLastWeek = endOfThisWeek.minusWeeks(1);

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
                .mapToDouble(s -> s.getWeightKg().multiply(java.math.BigDecimal.valueOf(s.getRepsCompleted())).doubleValue())
                .sum();
        double volumeLastWeek = setsLastWeek.stream()
                .filter(s -> s.getWeightKg() != null && s.getRepsCompleted() != null)
                .mapToDouble(s -> s.getWeightKg().multiply(java.math.BigDecimal.valueOf(s.getRepsCompleted())).doubleValue())
                .sum();
        
        double volumePercentageChange = calculatePercentageChange(volumeLastWeek, volumeThisWeek);

        DashboardSummaryResponse.WeightsSummary weightsSummary = new DashboardSummaryResponse.WeightsSummary(
                weightSessionsThisWeek, volumeThisWeek, volumePercentageChange);

        return new DashboardSummaryResponse(cardioSummary, weightsSummary);
    }

    private double calculatePercentageChange(double oldVal, double newVal) {
        if (oldVal == 0) {
            return newVal > 0 ? 100.0 : 0.0;
        }
        return ((newVal - oldVal) / oldVal) * 100.0;
    }
}

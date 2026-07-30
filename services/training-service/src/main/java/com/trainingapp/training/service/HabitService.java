package com.trainingapp.training.service;

import com.trainingapp.training.config.UserContext;
import com.trainingapp.training.domain.Habit;
import com.trainingapp.training.domain.HabitFrequency;
import com.trainingapp.training.domain.HabitLog;
import com.trainingapp.training.dto.HabitRequest;
import com.trainingapp.training.dto.HabitResponse;
import com.trainingapp.training.repository.HabitLogRepository;
import com.trainingapp.training.repository.HabitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.temporal.WeekFields;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HabitService {

    private final HabitRepository habitRepository;
    private final HabitLogRepository habitLogRepository;

    @Transactional(readOnly = true)
    public List<HabitResponse> getHabits(LocalDate today) {
        UUID userId = UserContext.getCurrentUserId();
        return habitRepository.findByUserId(userId).stream()
                .map(habit -> mapToResponse(habit, today))
                .collect(Collectors.toList());
    }

    @Transactional
    public HabitResponse createHabit(HabitRequest request) {
        Habit habit = new Habit();
        habit.setUserId(UserContext.getCurrentUserId());
        habit.setTitle(request.getTitle());
        habit.setDescription(request.getDescription());
        habit.setFrequency(request.getFrequency());
        
        habit = habitRepository.save(habit);
        return mapToResponse(habit, LocalDate.now());
    }

    @Transactional
    public HabitResponse updateHabit(UUID id, HabitRequest request) {
        Habit habit = getHabitByIdAndUser(id);
        habit.setTitle(request.getTitle());
        habit.setDescription(request.getDescription());
        habit.setFrequency(request.getFrequency());
        
        habit = habitRepository.save(habit);
        return mapToResponse(habit, LocalDate.now());
    }

    @Transactional
    public void deleteHabit(UUID id) {
        Habit habit = getHabitByIdAndUser(id);
        habitRepository.delete(habit);
    }

    @Transactional
    public HabitResponse toggleLog(UUID habitId, LocalDate date, LocalDate today) {
        Habit habit = getHabitByIdAndUser(habitId);
        Optional<HabitLog> logOpt = habitLogRepository.findByHabitIdAndCompletedDate(habitId, date);
        
        if (logOpt.isPresent()) {
            habitLogRepository.delete(logOpt.get());
            habit.getLogs().remove(logOpt.get());
        } else {
            HabitLog log = new HabitLog();
            log.setHabit(habit);
            log.setCompletedDate(date);
            habitLogRepository.save(log);
            habit.getLogs().add(log);
        }
        
        return mapToResponse(habit, today);
    }

    private Habit getHabitByIdAndUser(UUID id) {
        Habit habit = habitRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Habit not found"));
        if (!habit.getUserId().equals(UserContext.getCurrentUserId())) {
            throw new RuntimeException("Not authorized");
        }
        return habit;
    }

    private HabitResponse mapToResponse(Habit habit, LocalDate today) {
        HabitResponse response = new HabitResponse();
        response.setId(habit.getId());
        response.setTitle(habit.getTitle());
        response.setDescription(habit.getDescription());
        response.setFrequency(habit.getFrequency());
        
        List<LocalDate> completedDates = habit.getLogs().stream()
                .map(HabitLog::getCompletedDate)
                .sorted(Comparator.reverseOrder())
                .collect(Collectors.toList());
        
        response.setCompletedDates(completedDates);
        
        calculateStreaks(response, completedDates, habit.getFrequency(), today);
        
        return response;
    }

    private void calculateStreaks(HabitResponse response, List<LocalDate> completedDates, HabitFrequency frequency, LocalDate today) {
        if (completedDates.isEmpty()) {
            response.setCurrentStreak(0);
            response.setLongestStreak(0);
            return;
        }

        int currentStreak = 0;
        int longestStreak = 0;
        int tempStreak = 0;

        // Sort dates ascending for streak calculation
        List<LocalDate> sortedDates = new ArrayList<>(completedDates);
        Collections.sort(sortedDates);
        
        if (frequency == HabitFrequency.DAILY) {
            LocalDate current = sortedDates.get(0);
            tempStreak = 1;
            longestStreak = 1;
            
            for (int i = 1; i < sortedDates.size(); i++) {
                LocalDate next = sortedDates.get(i);
                long daysBetween = ChronoUnit.DAYS.between(current, next);
                if (daysBetween == 1) {
                    tempStreak++;
                } else if (daysBetween > 1) {
                    tempStreak = 1;
                }
                if (tempStreak > longestStreak) {
                    longestStreak = tempStreak;
                }
                current = next;
            }
            
            // Current streak logic
            LocalDate lastCompleted = sortedDates.get(sortedDates.size() - 1);
            long daysFromToday = ChronoUnit.DAYS.between(lastCompleted, today);
            if (daysFromToday == 0 || daysFromToday == 1) {
                currentStreak = tempStreak;
            } else {
                currentStreak = 0;
            }
            
        } else if (frequency == HabitFrequency.WEEKLY) {
            // Simplified weekly streak logic (consecutive weeks)
            WeekFields weekFields = WeekFields.of(Locale.getDefault());
            int prevWeek = sortedDates.get(0).get(weekFields.weekOfWeekBasedYear());
            int prevYear = sortedDates.get(0).get(weekFields.weekBasedYear());
            tempStreak = 1;
            longestStreak = 1;
            
            for (int i = 1; i < sortedDates.size(); i++) {
                LocalDate next = sortedDates.get(i);
                int currWeek = next.get(weekFields.weekOfWeekBasedYear());
                int currYear = next.get(weekFields.weekBasedYear());
                
                int weekDiff = (currYear - prevYear) * 52 + (currWeek - prevWeek);
                
                if (weekDiff == 0) {
                    // Same week, ignore or handle multiple logs in a week? Just ignore for streak count
                } else if (weekDiff == 1) {
                    tempStreak++;
                } else {
                    tempStreak = 1;
                }
                
                if (tempStreak > longestStreak) {
                    longestStreak = tempStreak;
                }
                prevWeek = currWeek;
                prevYear = currYear;
            }
            
            int todayWeek = today.get(weekFields.weekOfWeekBasedYear());
            int todayYear = today.get(weekFields.weekBasedYear());
            int weekDiffFromToday = (todayYear - prevYear) * 52 + (todayWeek - prevWeek);
            
            if (weekDiffFromToday == 0 || weekDiffFromToday == 1) {
                currentStreak = tempStreak;
            } else {
                currentStreak = 0;
            }
            
        } else if (frequency == HabitFrequency.MONTHLY) {
            // Monthly streak logic (consecutive months)
            int prevMonth = sortedDates.get(0).getMonthValue();
            int prevYear = sortedDates.get(0).getYear();
            tempStreak = 1;
            longestStreak = 1;
            
            for (int i = 1; i < sortedDates.size(); i++) {
                LocalDate next = sortedDates.get(i);
                int currMonth = next.getMonthValue();
                int currYear = next.getYear();
                
                int monthDiff = (currYear - prevYear) * 12 + (currMonth - prevMonth);
                
                if (monthDiff == 0) {
                    // Same month
                } else if (monthDiff == 1) {
                    tempStreak++;
                } else {
                    tempStreak = 1;
                }
                
                if (tempStreak > longestStreak) {
                    longestStreak = tempStreak;
                }
                prevMonth = currMonth;
                prevYear = currYear;
            }
            
            int todayMonth = today.getMonthValue();
            int todayYear = today.getYear();
            int monthDiffFromToday = (todayYear - prevYear) * 12 + (todayMonth - prevMonth);
            
            if (monthDiffFromToday == 0 || monthDiffFromToday == 1) {
                currentStreak = tempStreak;
            } else {
                currentStreak = 0;
            }
        }

        response.setCurrentStreak(currentStreak);
        response.setLongestStreak(longestStreak);
    }
}

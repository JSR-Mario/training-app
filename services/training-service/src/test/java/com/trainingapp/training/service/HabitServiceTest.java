package com.trainingapp.training.service;

import com.trainingapp.training.config.UserIdAuthenticationToken;
import com.trainingapp.training.domain.Habit;
import com.trainingapp.training.domain.HabitFrequency;
import com.trainingapp.training.domain.HabitLog;
import com.trainingapp.training.dto.HabitResponse;
import com.trainingapp.training.repository.HabitLogRepository;
import com.trainingapp.training.repository.HabitRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HabitServiceTest {

    @Mock
    private HabitRepository habitRepository;

    @Mock
    private HabitLogRepository habitLogRepository;

    @InjectMocks
    private HabitService habitService;

    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        UserIdAuthenticationToken token = new UserIdAuthenticationToken(userId, List.of());
        SecurityContextHolder.getContext().setAuthentication(token);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getHabits_weeklyHabitSingleCheckInWeek_calculatesStreakAndFulfillsWeek() {
        Habit habit = new Habit();
        habit.setId(UUID.randomUUID());
        habit.setUserId(userId);
        habit.setTitle("Weekly Handstand");
        habit.setFrequency(HabitFrequency.WEEKLY);

        LocalDate today = LocalDate.of(2026, 8, 5); // Wednesday
        LocalDate checkDate = LocalDate.of(2026, 8, 5);

        List<HabitLog> logs = new ArrayList<>();
        HabitLog log = new HabitLog();
        log.setHabit(habit);
        log.setCompletedDate(checkDate);
        logs.add(log);
        habit.setLogs(logs);

        when(habitRepository.findByUserId(userId)).thenReturn(List.of(habit));

        List<HabitResponse> responses = habitService.getHabits(today);

        assertEquals(1, responses.size());
        HabitResponse res = responses.get(0);
        assertEquals(1, res.getCurrentStreak());
        assertEquals(1, res.getLongestStreak());
        assertTrue(res.getCompletedDates().contains(checkDate));
    }

    @Test
    void getHabits_weeklyHabitMultipleChecksInSameWeek_countsAsSingleWeekStreak() {
        Habit habit = new Habit();
        habit.setId(UUID.randomUUID());
        habit.setUserId(userId);
        habit.setTitle("Weekly Handstand");
        habit.setFrequency(HabitFrequency.WEEKLY);

        LocalDate today = LocalDate.of(2026, 8, 5); // Wednesday
        List<HabitLog> logs = new ArrayList<>();

        for (LocalDate date : List.of(LocalDate.of(2026, 8, 3), LocalDate.of(2026, 8, 5))) {
            HabitLog log = new HabitLog();
            log.setHabit(habit);
            log.setCompletedDate(date);
            logs.add(log);
        }
        habit.setLogs(logs);

        when(habitRepository.findByUserId(userId)).thenReturn(List.of(habit));

        List<HabitResponse> responses = habitService.getHabits(today);

        assertEquals(1, responses.size());
        HabitResponse res = responses.get(0);
        assertEquals(1, res.getCurrentStreak());
        assertEquals(1, res.getLongestStreak());
    }

    @Test
    void getHabits_weeklyHabitConsecutiveWeeks_incrementsStreakCorrectly() {
        Habit habit = new Habit();
        habit.setId(UUID.randomUUID());
        habit.setUserId(userId);
        habit.setTitle("Weekly Handstand");
        habit.setFrequency(HabitFrequency.WEEKLY);

        LocalDate today = LocalDate.of(2026, 8, 5); // Week 32
        List<HabitLog> logs = new ArrayList<>();

        List<LocalDate> dates = List.of(
            LocalDate.of(2026, 7, 22), // Week 30
            LocalDate.of(2026, 7, 29), // Week 31
            LocalDate.of(2026, 8, 5)   // Week 32
        );

        for (LocalDate d : dates) {
            HabitLog log = new HabitLog();
            log.setHabit(habit);
            log.setCompletedDate(d);
            logs.add(log);
        }
        habit.setLogs(logs);

        when(habitRepository.findByUserId(userId)).thenReturn(List.of(habit));

        List<HabitResponse> responses = habitService.getHabits(today);

        assertEquals(1, responses.size());
        HabitResponse res = responses.get(0);
        assertEquals(3, res.getCurrentStreak());
        assertEquals(3, res.getLongestStreak());
    }

    @Test
    void getHabits_dailyHabit_calculatesDailyStreak() {
        Habit habit = new Habit();
        habit.setId(UUID.randomUUID());
        habit.setUserId(userId);
        habit.setTitle("Daily Pushups");
        habit.setFrequency(HabitFrequency.DAILY);

        LocalDate today = LocalDate.of(2026, 8, 5);
        List<HabitLog> logs = new ArrayList<>();

        for (LocalDate d : List.of(LocalDate.of(2026, 8, 4), LocalDate.of(2026, 8, 5))) {
            HabitLog log = new HabitLog();
            log.setHabit(habit);
            log.setCompletedDate(d);
            logs.add(log);
        }
        habit.setLogs(logs);

        when(habitRepository.findByUserId(userId)).thenReturn(List.of(habit));

        List<HabitResponse> responses = habitService.getHabits(today);

        assertEquals(1, responses.size());
        HabitResponse res = responses.get(0);
        assertEquals(2, res.getCurrentStreak());
        assertEquals(2, res.getLongestStreak());
    }
}

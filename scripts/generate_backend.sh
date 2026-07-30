#!/bin/bash

BASE_DIR="/home/mario/training-app/services/training-service/src/main/java/com/trainingapp/training"

cat << 'EOF' > "$BASE_DIR/domain/HabitFrequency.java"
package com.trainingapp.training.domain;

public enum HabitFrequency {
    DAILY,
    WEEKLY,
    MONTHLY
}
EOF

cat << 'EOF' > "$BASE_DIR/domain/Habit.java"
package com.trainingapp.training.domain;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Entity
@Table(name = "habits")
public class Habit {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String title;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private HabitFrequency frequency;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "habit", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<HabitLog> logs = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
EOF

cat << 'EOF' > "$BASE_DIR/domain/HabitLog.java"
package com.trainingapp.training.domain;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "habit_logs")
public class HabitLog {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "habit_id", nullable = false)
    private Habit habit;

    @Column(name = "completed_date", nullable = false)
    private LocalDate completedDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
EOF

cat << 'EOF' > "$BASE_DIR/repository/HabitRepository.java"
package com.trainingapp.training.repository;

import com.trainingapp.training.domain.Habit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface HabitRepository extends JpaRepository<Habit, UUID> {
    List<Habit> findByUserId(UUID userId);
}
EOF

cat << 'EOF' > "$BASE_DIR/repository/HabitLogRepository.java"
package com.trainingapp.training.repository;

import com.trainingapp.training.domain.HabitLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface HabitLogRepository extends JpaRepository<HabitLog, UUID> {
    Optional<HabitLog> findByHabitIdAndCompletedDate(UUID habitId, LocalDate completedDate);
}
EOF

cat << 'EOF' > "$BASE_DIR/dto/HabitRequest.java"
package com.trainingapp.training.dto;

import com.trainingapp.training.domain.HabitFrequency;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class HabitRequest {
    @NotBlank
    private String title;
    private String description;
    @NotNull
    private HabitFrequency frequency;
}
EOF

cat << 'EOF' > "$BASE_DIR/dto/HabitResponse.java"
package com.trainingapp.training.dto;

import com.trainingapp.training.domain.HabitFrequency;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class HabitResponse {
    private UUID id;
    private String title;
    private String description;
    private HabitFrequency frequency;
    private int currentStreak;
    private int longestStreak;
    private List<LocalDate> completedDates;
}
EOF

cat << 'EOF' > "$BASE_DIR/service/HabitService.java"
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
        UUID userId = UserContext.getUserId();
        return habitRepository.findByUserId(userId).stream()
                .map(habit -> mapToResponse(habit, today))
                .collect(Collectors.toList());
    }

    @Transactional
    public HabitResponse createHabit(HabitRequest request) {
        Habit habit = new Habit();
        habit.setUserId(UserContext.getUserId());
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
        if (!habit.getUserId().equals(UserContext.getUserId())) {
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
EOF

cat << 'EOF' > "$BASE_DIR/controller/HabitController.java"
package com.trainingapp.training.controller;

import com.trainingapp.training.dto.HabitRequest;
import com.trainingapp.training.dto.HabitResponse;
import com.trainingapp.training.service.HabitService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/habits")
@RequiredArgsConstructor
public class HabitController {

    private final HabitService habitService;

    @GetMapping
    public ResponseEntity<List<HabitResponse>> getHabits(
            @RequestParam(name = "today", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate today) {
        if (today == null) {
            today = LocalDate.now();
        }
        return ResponseEntity.ok(habitService.getHabits(today));
    }

    @PostMapping
    public ResponseEntity<HabitResponse> createHabit(@RequestBody @Valid HabitRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(habitService.createHabit(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<HabitResponse> updateHabit(@PathVariable UUID id, @RequestBody @Valid HabitRequest request) {
        return ResponseEntity.ok(habitService.updateHabit(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteHabit(@PathVariable UUID id) {
        habitService.deleteHabit(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/logs")
    public ResponseEntity<HabitResponse> toggleLog(
            @PathVariable UUID id,
            @RequestParam(name = "date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(name = "today", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate today) {
        if (today == null) {
            today = LocalDate.now();
        }
        return ResponseEntity.ok(habitService.toggleLog(id, date, today));
    }
}
EOF

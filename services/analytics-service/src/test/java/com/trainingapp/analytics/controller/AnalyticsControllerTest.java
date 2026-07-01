package com.trainingapp.analytics.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.trainingapp.analytics.config.UserIdAuthenticationToken;
import com.trainingapp.analytics.domain.ExerciseProgressEntry;
import com.trainingapp.analytics.domain.WeeklyVolumeSnapshot;
import com.trainingapp.analytics.repository.ExerciseProgressRepository;
import com.trainingapp.analytics.repository.WeeklyVolumeRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AnalyticsController.class)
@AutoConfigureMockMvc(addFilters = false)
class AnalyticsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private WeeklyVolumeRepository volumeRepository;

    @MockBean
    private ExerciseProgressRepository progressRepository;

    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        SecurityContextHolder.getContext().setAuthentication(new UserIdAuthenticationToken(userId));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getWeeklyVolume_ReturnsVolumeList() throws Exception {
        UUID programId = UUID.randomUUID();
        int weekNumber = 1;

        WeeklyVolumeSnapshot snapshot = new WeeklyVolumeSnapshot();
        snapshot.setBodyPart("MID_CHEST");
        snapshot.setTotalSets(new BigDecimal("5.00"));

        when(volumeRepository.findByUserIdAndProgramIdAndWeekNumber(userId, programId, weekNumber))
            .thenReturn(List.of(snapshot));

        mockMvc.perform(get("/api/v1/analytics/volume")
                .param("programId", programId.toString())
                .param("weekNumber", String.valueOf(weekNumber)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].bodyPart").value("MID_CHEST"))
                .andExpect(jsonPath("$[0].totalSets").value(5.00));
    }

    @Test
    void getExerciseProgress_ReturnsProgressList() throws Exception {
        UUID exerciseId = UUID.randomUUID();

        ExerciseProgressEntry progress = new ExerciseProgressEntry();
        progress.setSessionDate(LocalDate.of(2026, 6, 20));
        progress.setMaxWeightKg(new BigDecimal("100.00"));
        progress.setTotalVolumeKg(new BigDecimal("1000.00"));
        progress.setTotalSets(3);
        progress.setWeekNumber(1);
        UUID dayId = UUID.randomUUID();
        progress.setDayTemplateId(dayId);

        when(progressRepository.findByUserIdAndExerciseIdOrderBySessionDateAsc(userId, exerciseId))
            .thenReturn(List.of(progress));

        mockMvc.perform(get("/api/v1/analytics/progress/{exerciseId}", exerciseId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].sessionDate").value("2026-06-20"))
                .andExpect(jsonPath("$[0].maxWeightKg").value(100.00))
                .andExpect(jsonPath("$[0].totalVolumeKg").value(1000.00))
                .andExpect(jsonPath("$[0].totalSets").value(3))
                .andExpect(jsonPath("$[0].weekNumber").value(1))
                .andExpect(jsonPath("$[0].dayTemplateId").value(dayId.toString()));
    }
}

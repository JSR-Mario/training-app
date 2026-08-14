package com.trainingapp.training.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trainingapp.training.config.UserIdAuthenticationToken;
import com.trainingapp.training.domain.ProgramGoal;
import com.trainingapp.training.dto.ProgramRatingRequest;
import com.trainingapp.training.dto.ProgramRequest;
import com.trainingapp.training.dto.ProgramResponse;
import com.trainingapp.training.service.ProgramService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProgramController.class)
@AutoConfigureMockMvc(addFilters = false)
class ProgramControllerTest {
    private UUID testUserId;

    @BeforeEach
    void setUp() {
        testUserId = UUID.randomUUID();
        SecurityContextHolder.getContext().setAuthentication(new UserIdAuthenticationToken(testUserId, java.util.List.of()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ProgramService programService;

    @Test
    void createProgram_Success() throws Exception {
        UUID userId = testUserId;
        ProgramRequest req = new ProgramRequest("Hypertrophy", 8, LocalDate.now(), false, 1, ProgramGoal.MAINTENANCE, false, "Hypertrophy routine");
        ProgramResponse resp = new ProgramResponse(UUID.randomUUID(), userId, "Hypertrophy", "Hypertrophy routine", 8, LocalDate.now(), false, 1, Instant.now(), ProgramGoal.MAINTENANCE, false, null, 9.0, 1, 9);

        Mockito.when(programService.create(eq(userId), any())).thenReturn(resp);

        mockMvc.perform(post("/api/v1/training/programs")
                .header("X-User-Id", userId.toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Hypertrophy"))
                .andExpect(jsonPath("$.description").value("Hypertrophy routine"));
    }

    @Test
    void rateProgram_Success() throws Exception {
        UUID userId = testUserId;
        UUID programId = UUID.randomUUID();
        ProgramRatingRequest req = new ProgramRatingRequest(9);
        ProgramResponse resp = new ProgramResponse(programId, userId, "Hypertrophy", "Hypertrophy routine", 8, LocalDate.now(), false, 1, Instant.now(), ProgramGoal.MAINTENANCE, false, null, 9.0, 1, 9);

        Mockito.when(programService.rateProgram(eq(userId), eq(programId), eq(9))).thenReturn(resp);

        mockMvc.perform(post("/api/v1/training/programs/{id}/ratings", programId)
                .header("X-User-Id", userId.toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.averageRating").value(9.0))
                .andExpect(jsonPath("$.ratingsCount").value(1));
    }
}

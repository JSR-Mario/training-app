package com.trainingapp.training.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.trainingapp.training.config.UserContext;
import com.trainingapp.training.config.UserIdAuthenticationToken;
import com.trainingapp.training.dto.WorkoutSetRequest;
import com.trainingapp.training.dto.WorkoutSetResponse;
import com.trainingapp.training.service.WorkoutSetService;
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
import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(WorkoutSetController.class)
@AutoConfigureMockMvc(addFilters = false)
class WorkoutSetControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private WorkoutSetService setService;

    private ObjectMapper objectMapper;
    private UUID userId;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
        userId = UUID.randomUUID();
        SecurityContextHolder.getContext().setAuthentication(new UserIdAuthenticationToken(userId, java.util.List.of()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void logSet() throws Exception {
        UUID sessionId = UUID.randomUUID();
        UUID dayExerciseId = UUID.randomUUID();
        WorkoutSetRequest request = new WorkoutSetRequest(dayExerciseId, 1, 10, BigDecimal.valueOf(50.5));
        WorkoutSetResponse response = new WorkoutSetResponse(UUID.randomUUID(), sessionId, dayExerciseId, 1, 10, BigDecimal.valueOf(50.5), Instant.now());

        when(setService.logSet(eq(sessionId), eq(userId), any(WorkoutSetRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/training/sessions/{sessionId}/sets", sessionId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.repsCompleted").value(10));
    }
}

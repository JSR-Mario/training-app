package com.trainingapp.training.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trainingapp.training.dto.DayExerciseRequest;
import com.trainingapp.training.dto.DayExerciseResponse;
import com.trainingapp.training.service.DayExerciseService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import com.trainingapp.training.config.UserIdAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DayExerciseController.class)
@AutoConfigureMockMvc(addFilters = false)
class DayExerciseControllerTest {
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
    private DayExerciseService dayExerciseService;

    @Test
    void createDayExercise_Success() throws Exception {
        UUID userId = testUserId;
        UUID dayId = UUID.randomUUID();
        UUID exerciseId = UUID.randomUUID();
        DayExerciseRequest req = new DayExerciseRequest(exerciseId, 3, 10, 1);
        DayExerciseResponse resp = new DayExerciseResponse(UUID.randomUUID(), exerciseId, "Bench Press", 3, 10, 1);

        Mockito.when(dayExerciseService.create(eq(userId), eq(dayId), any())).thenReturn(resp);

        mockMvc.perform(post("/api/v1/training/days/{dayId}/exercises", dayId)
                .header("X-User-Id", userId.toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.exerciseName").value("Bench Press"));
    }
}



package com.trainingapp.training.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trainingapp.training.dto.ExerciseRequest;
import com.trainingapp.training.dto.ExerciseResponse;
import com.trainingapp.training.service.ExerciseService;
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

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ExerciseController.class)
@AutoConfigureMockMvc(addFilters = false)
class ExerciseControllerTest {
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
    private ExerciseService exerciseService;

    @Test
    void createExercise_Success() throws Exception {
        UUID userId = testUserId;
        UUID exerciseId = UUID.randomUUID();
        ExerciseRequest req = new ExerciseRequest("Bench Press", "Hammer Strength", false, false, false, false);
        ExerciseResponse resp = new ExerciseResponse(exerciseId, "Bench Press", "Hammer Strength", false, false, false, false, java.time.Instant.now(), java.util.Collections.emptyList(), 5.0, null);

        Mockito.when(exerciseService.create(eq(userId), any())).thenReturn(resp);

        mockMvc.perform(post("/api/v1/training/exercises")
                .header("X-User-Id", userId.toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Bench Press"))
                .andExpect(jsonPath("$.equipmentBrand").value("Hammer Strength"))
                .andExpect(jsonPath("$.unilateral").value(false));
    }

    @Test
    void searchExercises_Success() throws Exception {
        UUID userId = testUserId;
        ExerciseResponse resp = new ExerciseResponse(UUID.randomUUID(), "Bench Press", null, false, false, false, false, java.time.Instant.now(), java.util.Collections.emptyList(), 5.0, null);

        Mockito.when(exerciseService.search(eq(userId), eq("bench"))).thenReturn(List.of(resp));

        mockMvc.perform(get("/api/v1/training/exercises/search")
                .param("q", "bench")
                .header("X-User-Id", userId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Bench Press"));
    }
}

package com.trainingapp.training.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.trainingapp.training.config.UserContext;
import com.trainingapp.training.config.UserIdAuthenticationToken;
import com.trainingapp.training.dto.WorkoutSessionRequest;
import com.trainingapp.training.dto.WorkoutSessionResponse;
import com.trainingapp.training.service.WorkoutSessionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Test;
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
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(WorkoutSessionController.class)
@AutoConfigureMockMvc(addFilters = false)
class WorkoutSessionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private WorkoutSessionService sessionService;

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
    void startSession() throws Exception {
        UUID dayTemplateId = UUID.randomUUID();
        WorkoutSessionRequest request = new WorkoutSessionRequest(dayTemplateId, LocalDate.now(), 1);
        WorkoutSessionResponse response = new WorkoutSessionResponse(UUID.randomUUID(), dayTemplateId, "Push", LocalDate.now(), 1, null);

        when(sessionService.startSession(eq(userId), any(WorkoutSessionRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/training/sessions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.dayTemplateName").value("Push"));
    }
}

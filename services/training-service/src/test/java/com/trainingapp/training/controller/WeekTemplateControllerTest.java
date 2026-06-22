package com.trainingapp.training.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trainingapp.training.dto.WeekTemplateRequest;
import com.trainingapp.training.dto.WeekTemplateResponse;
import com.trainingapp.training.service.WeekTemplateService;
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

@WebMvcTest(WeekTemplateController.class)
@AutoConfigureMockMvc(addFilters = false)
class WeekTemplateControllerTest {
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
    private WeekTemplateService weekTemplateService;

    @Test
    void createWeek_Success() throws Exception {
        UUID userId = testUserId;
        UUID programId = UUID.randomUUID();
        WeekTemplateRequest req = new WeekTemplateRequest("Week A");
        WeekTemplateResponse resp = new WeekTemplateResponse(UUID.randomUUID(), programId, "Week A");

        Mockito.when(weekTemplateService.create(eq(userId), eq(programId), any())).thenReturn(resp);

        mockMvc.perform(post("/api/v1/training/programs/{programId}/weeks", programId)
                .header("X-User-Id", userId.toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Week A"));
    }
}



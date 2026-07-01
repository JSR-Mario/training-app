package com.trainingapp.analytics.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.trainingapp.analytics.dto.SessionCompletedEvent;
import com.trainingapp.analytics.service.MetricsCalculationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AnalyticsEventHandlerController.class)
@AutoConfigureMockMvc(addFilters = false)
class AnalyticsEventHandlerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MetricsCalculationService metricsCalculationService;

    @Test
    void handleSessionCompleted_CallsServiceAndReturnsOk() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

        SessionCompletedEvent.SetData set1 = new SessionCompletedEvent.SetData(
            UUID.randomUUID(), 10, null, new BigDecimal("50.00"), 
            Map.of("MID_CHEST", new BigDecimal("1.0"))
        );

        SessionCompletedEvent event = new SessionCompletedEvent(
            UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), 1, UUID.randomUUID(), LocalDate.now(), List.of(set1)
        );

        mockMvc.perform(post("/internal/events/session-completed")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(event)))
                .andExpect(status().isOk());

        verify(metricsCalculationService).processSessionCompleted(any(SessionCompletedEvent.class));
    }
}

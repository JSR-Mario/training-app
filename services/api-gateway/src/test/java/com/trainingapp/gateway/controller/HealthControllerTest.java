package com.trainingapp.gateway.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class HealthControllerTest {

    private HealthController healthController;

    @Mock
    private WebClient.Builder webClientBuilder;

    @Mock
    private WebClient webClient;

    @Mock
    private WebClient.RequestHeadersUriSpec requestHeadersUriSpec;

    @Mock
    private WebClient.RequestHeadersSpec requestHeadersSpec;

    @Mock
    private WebClient.ResponseSpec responseSpec;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(webClientBuilder.build()).thenReturn(webClient);
        
        when(webClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(anyString())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);

        healthController = new HealthController(webClientBuilder);
        org.springframework.test.util.ReflectionTestUtils.setField(healthController, "authServiceUrl", "http://localhost:8081");
        org.springframework.test.util.ReflectionTestUtils.setField(healthController, "trainingServiceUrl", "http://localhost:8082");
        org.springframework.test.util.ReflectionTestUtils.setField(healthController, "analyticsServiceUrl", "http://localhost:8083");
    }

    @Test
    void shouldReturnOkWhenAllServicesAreUp() {
        when(responseSpec.bodyToMono(Map.class)).thenReturn(Mono.just(Map.of("status", "UP")));

        ResponseEntity<Map<String, Object>> response = healthController.checkHealth().block();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("UP", response.getBody().get("status"));
        assertEquals("UP", response.getBody().get("auth-service"));
        assertEquals("UP", response.getBody().get("training-service"));
        assertEquals("UP", response.getBody().get("analytics-service"));
    }

    @Test
    void shouldReturnServiceUnavailableWhenOneServiceIsDown() {
        when(requestHeadersUriSpec.uri(anyString())).thenAnswer(invocation -> {
            String uri = invocation.getArgument(0);
            WebClient.RequestHeadersSpec spec = mock(WebClient.RequestHeadersSpec.class);
            WebClient.ResponseSpec resSpec = mock(WebClient.ResponseSpec.class);
            when(spec.retrieve()).thenReturn(resSpec);
            
            if (uri.contains("8081")) {
                when(resSpec.bodyToMono(Map.class)).thenReturn(Mono.just(Map.of("status", "DOWN")));
            } else {
                when(resSpec.bodyToMono(Map.class)).thenReturn(Mono.just(Map.of("status", "UP")));
            }
            return spec;
        });

        ResponseEntity<Map<String, Object>> response = healthController.checkHealth().block();

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertEquals("DOWN", response.getBody().get("status"));
        assertEquals("DOWN", response.getBody().get("auth-service"));
        assertEquals("UP", response.getBody().get("training-service"));
        assertEquals("UP", response.getBody().get("analytics-service"));
    }
}

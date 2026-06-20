package com.trainingapp.gateway.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.Map;

/**
 * Controller to expose an aggregated health status of all downstream services.
 */
@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

    private final WebClient webClient;

    @Value("${AUTH_SERVICE_URL:http://localhost:8081}")
    private String authServiceUrl;

    @Value("${TRAINING_SERVICE_URL:http://localhost:8082}")
    private String trainingServiceUrl;

    @Value("${ANALYTICS_SERVICE_URL:http://localhost:8083}")
    private String analyticsServiceUrl;

    public HealthController(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    @GetMapping
    public Mono<ResponseEntity<Map<String, Object>>> checkHealth() {
        Mono<String> authHealth = fetchHealth(authServiceUrl);
        Mono<String> trainingHealth = fetchHealth(trainingServiceUrl);
        Mono<String> analyticsHealth = fetchHealth(analyticsServiceUrl);

        return Mono.zip(authHealth, trainingHealth, analyticsHealth)
                .map(tuple -> {
                    Map<String, Object> statusMap = new HashMap<>();
                    statusMap.put("api-gateway", "UP");
                    statusMap.put("auth-service", tuple.getT1());
                    statusMap.put("training-service", tuple.getT2());
                    statusMap.put("analytics-service", tuple.getT3());

                    boolean isAllUp = "UP".equals(tuple.getT1()) &&
                            "UP".equals(tuple.getT2()) &&
                            "UP".equals(tuple.getT3());

                    statusMap.put("status", isAllUp ? "UP" : "DOWN");

                    if (isAllUp) {
                        return ResponseEntity.ok(statusMap);
                    } else {
                        return ResponseEntity.status(503).body(statusMap);
                    }
                });
    }

    private Mono<String> fetchHealth(String serviceUrl) {
        return webClient.get()
                .uri(serviceUrl + "/actuator/health")
                .retrieve()
                .bodyToMono(Map.class)
                .map(response -> (String) response.getOrDefault("status", "UNKNOWN"))
                .onErrorReturn("DOWN");
    }
}

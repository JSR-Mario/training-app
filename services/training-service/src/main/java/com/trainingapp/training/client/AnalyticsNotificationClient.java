package com.trainingapp.training.client;

import com.trainingapp.training.dto.SessionCompletedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * Client for sending fire-and-forget notifications to the analytics service.
 */
@Component
public class AnalyticsNotificationClient {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsNotificationClient.class);
    
    private final WebClient webClient;
    private final String analyticsServiceUrl;

    public AnalyticsNotificationClient(WebClient.Builder webClientBuilder, 
                                       @Value("${app.analytics.url}") String analyticsServiceUrl) {
        this.webClient = webClientBuilder.build();
        this.analyticsServiceUrl = analyticsServiceUrl;
    }

    /**
     * Sends the completed session payload to the analytics service.
     * Errors are caught and logged to prevent the training service from failing if analytics is down.
     *
     * @param event The session completed event payload
     */
    public void notifySessionCompleted(SessionCompletedEvent event) {
        String url = analyticsServiceUrl + "/internal/events/session-completed";
        
        webClient.post()
            .uri(url)
            .bodyValue(event)
            .retrieve()
            .toBodilessEntity()
            .doOnSuccess(res -> log.info("Successfully notified analytics service for session: {}", event.sessionId()))
            .doOnError(e -> log.error("Failed to notify analytics service for session: {}. Error: {}", event.sessionId(), e.getMessage()))
            .subscribe(); // Fire and forget
    }
}

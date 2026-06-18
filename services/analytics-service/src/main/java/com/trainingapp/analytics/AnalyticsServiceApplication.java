package com.trainingapp.analytics;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the Analytics Service.
 *
 * <p>Stores and serves pre-calculated training metrics derived from completed
 * workout sessions: weekly volume snapshots per body part and exercise progress
 * entries over time. Metrics are written exclusively by the internal event
 * handler; clients interact with read-only endpoints only.
 */
@SpringBootApplication
public class AnalyticsServiceApplication {

    /**
     * Bootstraps the Analytics Service Spring application context.
     *
     * @param args command-line arguments passed to the JVM
     */
    public static void main(String[] args) {
        SpringApplication.run(AnalyticsServiceApplication.class, args);
    }
}

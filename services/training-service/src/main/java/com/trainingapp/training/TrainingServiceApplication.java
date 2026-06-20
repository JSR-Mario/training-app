package com.trainingapp.training;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the Training Service.
 *
 * <p>Manages the complete training domain: the exercise catalog (with body-part
 * targets), training programs (weeks, days, and day-exercises), and workout
 * session logging (sessions and sets). Notifies the Analytics Service via a
 * fire-and-forget HTTP call when a session is marked as completed.
 */
@SpringBootApplication
public class TrainingServiceApplication {

    /**
     * Bootstraps the Training Service Spring application context.
     *
     * @param args command-line arguments passed to the JVM
     */
    public static void main(String[] args) {
        SpringApplication.run(TrainingServiceApplication.class, args);
    }
}

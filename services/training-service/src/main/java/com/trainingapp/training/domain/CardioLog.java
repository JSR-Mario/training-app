package com.trainingapp.training.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.Instant;
import java.util.UUID;

/**
 * A cardio session logged by the user, decoupled from strength training.
 */
@Entity
@Table(name = "cardio_logs", schema = "training")
public class CardioLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes;

    @Column(name = "cardio_type")
    private String cardioType;

    @Column(name = "performed_on", nullable = false)
    private LocalDate performedOn;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public int getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(int durationMinutes) { this.durationMinutes = durationMinutes; }
    public String getCardioType() { return cardioType; }
    public void setCardioType(String cardioType) { this.cardioType = cardioType; }
    public LocalDate getPerformedOn() { return performedOn; }
    public void setPerformedOn(LocalDate performedOn) { this.performedOn = performedOn; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}

package com.trainingapp.training.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.util.UUID;

/**
 * A training day within a {@link WeekTemplate}.
 *
 * <p>Each day template has a descriptive name (e.g., "Push", "Pull", "Legs A")
 * and contains {@link DayExercise}s defining which exercises are performed.
 */
@Entity
@Table(name = "day_templates", schema = "training")
public class DayTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "week_template_id", nullable = false)
    private WeekTemplate weekTemplate;

    @Column(nullable = false, length = 200)
    private String name;

    public UUID getId() { return id; }
    public WeekTemplate getWeekTemplate() { return weekTemplate; }
    public void setWeekTemplate(WeekTemplate weekTemplate) { this.weekTemplate = weekTemplate; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}

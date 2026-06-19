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
 * A repeating week blueprint within a {@link TrainingProgram}.
 *
 * <p>Each week template contains one or more {@link DayTemplate}s defining
 * which exercises are performed on each training day of the week.
 */
@Entity
@Table(name = "week_templates", schema = "training")
public class WeekTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "program_id", nullable = false)
    private TrainingProgram program;

    @Column(nullable = false, length = 200)
    private String name;

    public UUID getId() { return id; }
    public TrainingProgram getProgram() { return program; }
    public void setProgram(TrainingProgram program) { this.program = program; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}

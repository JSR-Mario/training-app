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
import java.math.BigDecimal;

/**
 * An exercise assigned to a {@link DayTemplate}, with prescribed sets, reps,
 * and a user-defined display order.
 *
 * <p>The {@code sortOrder} field determines the visual position of this
 * exercise within the day. The reorder endpoint allows batch-updating
 * sort orders without modifying other fields.
 */
@Entity
@Table(name = "day_exercises", schema = "training")
public class DayExercise {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "day_template_id", nullable = false)
    private DayTemplate dayTemplate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exercise_id", nullable = false)
    private Exercise exercise;

    @Column(name = "sets")
    private Integer sets;

    @Column(name = "reps")
    private Integer reps;

    @Column(name = "reps_max")
    private Integer repsMax;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Column(name = "incline", precision = 5, scale = 2)
    private BigDecimal incline;

    @Column(name = "resistance", precision = 5, scale = 2)
    private BigDecimal resistance;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    public UUID getId() { return id; }
    public DayTemplate getDayTemplate() { return dayTemplate; }
    public void setDayTemplate(DayTemplate dayTemplate) { this.dayTemplate = dayTemplate; }
    public Exercise getExercise() { return exercise; }
    public void setExercise(Exercise exercise) { this.exercise = exercise; }
    public Integer getSets() { return sets; }
    public void setSets(Integer sets) { this.sets = sets; }
    public Integer getReps() { return reps; }
    public void setReps(Integer reps) { this.reps = reps; }
    public Integer getRepsMax() { return repsMax; }
    public void setRepsMax(Integer repsMax) { this.repsMax = repsMax; }
    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }
    public BigDecimal getIncline() { return incline; }
    public void setIncline(BigDecimal incline) { this.incline = incline; }
    public BigDecimal getResistance() { return resistance; }
    public void setResistance(BigDecimal resistance) { this.resistance = resistance; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
}

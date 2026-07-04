package com.trainingapp.training.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import jakarta.persistence.OneToMany;
import jakarta.persistence.CascadeType;

/**
 * A user-defined exercise in the exercise catalog.
 *
 * <p>Every exercise belongs to a single user ({@code userId}). All queries
 * in the service layer must filter by this field to enforce data isolation.
 */
@Entity
@Table(name = "exercises", schema = "training")
public class Exercise {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "equipment_brand", length = 100)
    private String equipmentBrand;

    @Column(nullable = false)
    private boolean unilateral;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "is_public", nullable = false)
    private boolean isPublic = false;

    @Column(name = "spinal_loading", nullable = false)
    private boolean spinalLoading = false;

    @OneToMany(mappedBy = "exercise", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ExerciseBodyPartTarget> targets = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEquipmentBrand() { return equipmentBrand; }
    public void setEquipmentBrand(String equipmentBrand) { this.equipmentBrand = equipmentBrand; }
    public boolean isUnilateral() { return unilateral; }
    public void setUnilateral(boolean unilateral) { this.unilateral = unilateral; }
    public List<ExerciseBodyPartTarget> getTargets() { return targets; }
    public void setTargets(List<ExerciseBodyPartTarget> targets) { this.targets = targets; }
    public Instant getCreatedAt() { return createdAt; }

    /** Returns whether the exercise is public and visible to everyone. */
    public boolean getIsPublic() { return isPublic; }

    /** Sets whether the exercise is public and visible to everyone. */
    public void setIsPublic(boolean isPublic) { this.isPublic = isPublic; }

    public boolean isSpinalLoading() { return spinalLoading; }
    public void setSpinalLoading(boolean spinalLoading) { this.spinalLoading = spinalLoading; }
}

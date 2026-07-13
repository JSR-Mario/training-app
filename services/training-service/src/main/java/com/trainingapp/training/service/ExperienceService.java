package com.trainingapp.training.service;

import com.trainingapp.training.config.ExperienceConstants;
import com.trainingapp.training.domain.UserExperience;
import com.trainingapp.training.repository.UserExperienceRepository;
import com.trainingapp.training.repository.WorkoutSetRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Service responsible for all XP and level progression logic.
 *
 * <p>XP equals the user's all-time workout volume:
 * {@code SUM(weight_kg * (reps_completed + COALESCE(reps_completed_right, 0)))}.
 *
 * <p>Level formula: {@code level = floor(sqrt(totalXp / XP_BASE)) + 1}
 * where {@code XP_BASE = 80,000}. Each level requires progressively more XP,
 * making early levels quick to attain and high levels a long-term achievement.
 *
 * <p>The {@code user_experience} row is created lazily on the first call to
 * {@link #getOrInitialize(UUID)}, bootstrapping from the existing {@code workout_sets}
 * table. Subsequent updates are incremental and O(1).
 */
@Service
public class ExperienceService {

    private final UserExperienceRepository experienceRepository;
    private final WorkoutSetRepository setRepository;

    public ExperienceService(UserExperienceRepository experienceRepository,
                             WorkoutSetRepository setRepository) {
        this.experienceRepository = experienceRepository;
        this.setRepository = setRepository;
    }

    /**
     * Returns the {@link UserExperience} for the given user, creating and persisting
     * it from historical data if it does not yet exist.
     *
     * @param userId the user's UUID
     * @return the persisted {@link UserExperience} record
     */
    @Transactional
    public UserExperience getOrInitialize(UUID userId) {
        return experienceRepository.findByUserId(userId).orElseGet(() -> {
            double historicalVolume = setRepository.findTotalVolumeByUserId(userId);
            UserExperience xp = new UserExperience(userId, BigDecimal.valueOf(historicalVolume));
            return experienceRepository.save(xp);
        });
    }

    /**
     * Adds the given volume (in kg) to the user's total XP.
     * Called after a workout session is completed.
     *
     * @param userId   the user's UUID
     * @param volumeKg the session's volume to add
     */
    @Transactional
    public void addVolume(UUID userId, double volumeKg) {
        if (volumeKg <= 0) return;
        UserExperience xp = getOrInitialize(userId);
        xp.setTotalXp(xp.getTotalXp().add(BigDecimal.valueOf(volumeKg)));
        experienceRepository.save(xp);
    }

    /**
     * Subtracts the given volume (in kg) from the user's total XP.
     * Called when a completed session is un-completed. The result is floored at zero.
     *
     * @param userId   the user's UUID
     * @param volumeKg the session's volume to subtract
     */
    @Transactional
    public void subtractVolume(UUID userId, double volumeKg) {
        if (volumeKg <= 0) return;
        UserExperience xp = getOrInitialize(userId);
        BigDecimal updated = xp.getTotalXp().subtract(BigDecimal.valueOf(volumeKg));
        xp.setTotalXp(updated.max(BigDecimal.ZERO));
        experienceRepository.save(xp);
    }

    /**
     * Computes the level for the given total XP.
     *
     * @param totalXp cumulative workout volume in kg
     * @return level (minimum 1)
     */
    public int calculateLevel(double totalXp) {
        return (int) Math.floor(Math.sqrt(totalXp / ExperienceConstants.XP_BASE)) + 1;
    }

    /**
     * Computes the XP threshold at which a given level starts.
     *
     * @param level the level (must be >= 1)
     * @return the minimum total XP required to be at that level
     */
    public double levelThreshold(int level) {
        if (level <= 1) return 0;
        double n = level - 1;
        return n * n * ExperienceConstants.XP_BASE;
    }

    /**
     * Returns how much XP the user has accumulated within the current level.
     *
     * @param totalXp cumulative total XP
     * @return XP accumulated since the start of the current level
     */
    public double currentLevelXp(double totalXp) {
        int level = calculateLevel(totalXp);
        return totalXp - levelThreshold(level);
    }

    /**
     * Returns how much total XP the next level requires (relative to the current level start).
     *
     * @param totalXp cumulative total XP
     * @return XP span from current level threshold to next level threshold
     */
    public double nextLevelXp(double totalXp) {
        int level = calculateLevel(totalXp);
        return levelThreshold(level + 1) - levelThreshold(level);
    }
}

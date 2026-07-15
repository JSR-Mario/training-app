package com.trainingapp.training.config;

/**
 * Constants for the XP and level progression system.
 *
 * <p>Level formula: {@code level = floor(sqrt(totalXp / XP_BASE)) + 1}
 *
 * <p>This gives exponentially harder levels:
 * <ul>
 *   <li>Level 1:  0 XP (start)</li>
 *   <li>Level 2:  40,000 XP</li>
 *   <li>Level 3:  160,000 XP</li>
 *   <li>Level 4:  360,000 XP</li>
 *   <li>Level 5:  640,000 XP</li>
 *   <li>Level 6:  1,000,000 XP</li>
 *   <li>Level 10: 3,240,000 XP</li>
 *   <li>Level 20: 14,440,000 XP</li>
 * </ul>
 */
public final class ExperienceConstants {

    /**
     * Base divisor for the level formula.
     * Increasing this makes levels harder to gain; decreasing makes them easier.
     */
    public static final double XP_BASE = 40_000.0;

    private ExperienceConstants() {}
}

package com.trainingapp.training.config;

/**
 * Constants for the XP and level progression system.
 *
 * <p>Level formula: {@code level = floor(sqrt(totalXp / XP_BASE)) + 1}
 *
 * <p>This gives exponentially harder levels:
 * <ul>
 *   <li>Level 1:  0 XP (start)</li>
 *   <li>Level 2:  80,000 XP  (~0.5 weeks at 171k/week)</li>
 *   <li>Level 3:  320,000 XP (~2 weeks)</li>
 *   <li>Level 4:  720,000 XP (~4 weeks)</li>
 *   <li>Level 5:  1,280,000 XP (~7.5 weeks)</li>
 *   <li>Level 6:  2,000,000 XP (~12 weeks)</li>
 *   <li>Level 10: 6,480,000 XP (~38 weeks)</li>
 *   <li>Level 20: 30,400,000 XP (~3.4 years)</li>
 * </ul>
 */
public final class ExperienceConstants {

    /**
     * Base divisor for the level formula.
     * Increasing this makes levels harder to gain; decreasing makes them easier.
     */
    public static final double XP_BASE = 80_000.0;

    private ExperienceConstants() {}
}

package com.trainingapp.training.domain;

/**
 * Fixed set of body parts used to categorize exercise targets.
 *
 * <p>This enum is the single source of truth for body part values across
 * the entire application. It is stored as a {@code VARCHAR} in the database
 * (Hibernate's default for enums when using {@code @Enumerated(EnumType.STRING)}).
 *
 * <p>No CRUD operations exist for body parts — they are hardcoded as specified
 * in the project rules.
 */
public enum BodyPart {
    // UPPER & CORE
    UPPER_CHEST,
    MID_CHEST,
    LOWER_CHEST,
    LATS,
    MID_BACK,
    LOWER_BACK,
    FRONT_DELTS,
    LATERAL_DELTS,
    REAR_DELTS,
    TRAPS,
    BICEPS,
    TRICEPS,
    FOREARMS,
    CORE,

    // LOWER
    QUADS,
    HAMSTRINGS,
    GLUTES,
    CALVES,
    ADDUCTORS
}

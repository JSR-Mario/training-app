package com.trainingapp.training.repository;

import com.trainingapp.training.domain.UserExperience;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link UserExperience} entities.
 *
 * <p>Provides read and write access to the {@code training.user_experience} table.
 * Rows are created lazily via
 * {@link com.trainingapp.training.service.ExperienceService#getOrInitialize}.
 */
public interface UserExperienceRepository extends JpaRepository<UserExperience, UUID> {

    /**
     * Returns the experience record for the given user, if it exists.
     *
     * @param userId the user's UUID
     * @return an {@link Optional} containing the record, or empty if not yet initialized
     */
    Optional<UserExperience> findByUserId(UUID userId);
}

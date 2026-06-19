package com.trainingapp.auth.repository;

import com.trainingapp.auth.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link User} entities.
 *
 * <p>All query methods in this repository operate on the {@code auth.users} table.
 * Callers in the service layer are responsible for ensuring that data access
 * is scoped to the correct user when multi-user expansion occurs.
 */
public interface UserRepository extends JpaRepository<User, UUID> {

    /**
     * Finds a user by their unique login name.
     *
     * @param username the login name to search for
     * @return an {@link Optional} containing the user, or empty if not found
     */
    Optional<User> findByUsername(String username);

    /**
     * Checks whether a user with the given login name already exists.
     *
     * @param username the login name to check
     * @return {@code true} if a user with this username exists
     */
    boolean existsByUsername(String username);

    /**
     * Checks whether a user with the given email address already exists.
     *
     * @param email the email address to check
     * @return {@code true} if a user with this email exists
     */
    boolean existsByEmail(String email);
}

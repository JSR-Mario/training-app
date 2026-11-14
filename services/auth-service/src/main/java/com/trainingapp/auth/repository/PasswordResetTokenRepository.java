package com.trainingapp.auth.repository;

import com.trainingapp.auth.domain.PasswordResetToken;
import com.trainingapp.auth.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link PasswordResetToken}.
 */
@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    Optional<PasswordResetToken> findTopByUserOrderByCreatedAtDesc(User user);

    void deleteByUser(User user);

    /**
     * Atomically deletes a token by its hash and returns the number of affected rows.
     * Ensures single-use consumption even under concurrent requests.
     *
     * @param tokenHash SHA-256 hash of the reset token
     * @return number of affected rows (1 if deleted successfully, 0 if already consumed)
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("DELETE FROM PasswordResetToken t WHERE t.tokenHash = :tokenHash")
    int deleteByTokenHash(@Param("tokenHash") String tokenHash);

    @Modifying
    @Query("DELETE FROM PasswordResetToken t WHERE t.expiresAt < :now")
    void deleteExpiredTokens(@Param("now") Instant now);
}

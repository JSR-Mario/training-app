package com.trainingapp.auth.service;

import com.trainingapp.auth.config.AuthConstants;
import com.trainingapp.auth.config.JwtProperties;
import com.trainingapp.auth.exception.InvalidTokenException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.trainingapp.auth.domain.Role;
import com.trainingapp.auth.domain.User;

import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for {@link JwtService}.
 *
 * <p>No Spring context is loaded — only pure Java logic with a hard-coded
 * 32-byte test secret.
 */
class JwtServiceTest {

    /** 32-byte (64-char) hex test secret — safe to use only in tests. */
    private static final String TEST_SECRET =
            "0000000000000000000000000000000000000000000000000000000000000000";

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        JwtProperties props = new JwtProperties(TEST_SECRET, 15L, 7L, false);
        jwtService = new JwtService(props);
    }

    @Test
    void generateAccessToken_producesValidToken() {
        User user = new User();
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        user.setRole(Role.ROLE_USER);
        String token = jwtService.generateAccessToken(user);

        assertThat(token).isNotBlank();
        assertThat(jwtService.isValid(token)).isTrue();
    }

    @Test
    void generateAccessToken_subjectIsUserId() {
        User user = new User();
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        user.setRole(Role.ROLE_USER);
        String token = jwtService.generateAccessToken(user);

        assertThat(jwtService.extractUserId(token)).isEqualTo(user.getId());
    }

    @Test
    void generateAccessToken_isNotRefreshToken() {
        User user = new User();
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        user.setRole(Role.ROLE_USER);
        String token = jwtService.generateAccessToken(user);

        assertThat(jwtService.isRefreshToken(token)).isFalse();
    }

    @Test
    void generateRefreshToken_isRefreshToken() {
        User user = new User();
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        user.setRole(Role.ROLE_USER);
        String token = jwtService.generateRefreshToken(user);

        assertThat(jwtService.isRefreshToken(token)).isTrue();
    }

    @Test
    void generateRefreshToken_subjectIsUserId() {
        User user = new User();
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        user.setRole(Role.ROLE_USER);
        String token = jwtService.generateRefreshToken(user);

        assertThat(jwtService.extractUserId(token)).isEqualTo(user.getId());
    }

    @Test
    void isValid_returnsFalseForMalformedToken() {
        assertThat(jwtService.isValid("not.a.jwt")).isFalse();
    }

    @Test
    void extractUserId_throwsForInvalidToken() {
        assertThatThrownBy(() -> jwtService.extractUserId("bad.token.here"))
                .isInstanceOf(InvalidTokenException.class);
    }

    @Test
    void accessExpirySeconds_matchesConfiguredMinutes() {
        assertThat(jwtService.accessExpirySeconds()).isEqualTo(15L * 60);
    }

    @Test
    void differentUsers_produceDistinctTokens() {
        User userA = new User();
        ReflectionTestUtils.setField(userA, "id", UUID.randomUUID());
        userA.setRole(Role.ROLE_USER);
        User userB = new User();
        ReflectionTestUtils.setField(userB, "id", UUID.randomUUID());
        userB.setRole(Role.ROLE_USER);

        String tokenA = jwtService.generateAccessToken(userA);
        String tokenB = jwtService.generateAccessToken(userB);

        assertThat(tokenA).isNotEqualTo(tokenB);
        assertThat(jwtService.extractUserId(tokenA)).isEqualTo(userA.getId());
        assertThat(jwtService.extractUserId(tokenB)).isEqualTo(userB.getId());
    }
}

package com.trainingapp.training.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Spring Security configuration for the training-service.
 *
 * <p>JWT validation is handled at the API gateway layer. This service trusts the
 * {@code X-User-Id} header injected by the gateway and uses a
 * {@link UserIdAuthenticationFilter} to populate the {@link org.springframework.security.core.context.SecurityContext}.
 *
 * <p>All requests are permitted because the gateway has already authenticated them.
 * CSRF is disabled because this is a stateless JSON API.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final UserIdAuthenticationFilter userIdAuthenticationFilter;

    /**
     * Constructs the security configuration with the user ID filter.
     *
     * @param userIdAuthenticationFilter filter that extracts X-User-Id and populates SecurityContext
     */
    public SecurityConfig(UserIdAuthenticationFilter userIdAuthenticationFilter) {
        this.userIdAuthenticationFilter = userIdAuthenticationFilter;
    }

    /**
     * Configures the security filter chain.
     *
     * <ul>
     *   <li>CSRF disabled — stateless API.</li>
     *   <li>Sessions disabled — no server-side session state.</li>
     *   <li>All requests permitted — JWT validation is at the gateway.</li>
     *   <li>{@link UserIdAuthenticationFilter} registered before the default auth filter.</li>
     * </ul>
     *
     * @param http the {@link HttpSecurity} builder
     * @return the configured {@link SecurityFilterChain}
     * @throws Exception if Spring Security configuration fails
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .addFilterBefore(userIdAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class)
                .build();
    }
}

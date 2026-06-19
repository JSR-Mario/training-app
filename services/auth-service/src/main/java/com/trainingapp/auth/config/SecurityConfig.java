package com.trainingapp.auth.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Spring Security configuration for the auth-service.
 *
 * <p>JWT validation is handled at the API gateway layer. The auth-service
 * therefore permits all incoming requests — the gateway only forwards
 * pre-validated traffic (plus a forwarded {@code X-User-Id} header on
 * authenticated routes). CSRF is disabled because this is a stateless JSON API.
 *
 * <p>This class also registers the {@link PasswordEncoder} bean (BCrypt, cost 12)
 * and enables binding of {@link JwtProperties}.
 */
@Configuration
@EnableWebSecurity
@EnableConfigurationProperties(JwtProperties.class)
public class SecurityConfig {

    /**
     * Configures the security filter chain.
     *
     * <ul>
     *   <li>CSRF disabled — stateless API.</li>
     *   <li>Sessions disabled — no server-side session state.</li>
     *   <li>All requests permitted — JWT validation is at the gateway.</li>
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
                .build();
    }

    /**
     * Provides a BCrypt password encoder with the project-standard cost factor.
     *
     * @return a {@link BCryptPasswordEncoder} configured at cost {@link AuthConstants#BCRYPT_COST}
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(AuthConstants.BCRYPT_COST);
    }
}

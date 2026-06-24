package com.trainingapp.gateway.filter;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.Base64;
import java.util.Date;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class JwtValidationFilterTest {

    private JwtValidationFilter filterFactory;
    private GatewayFilter filter;
    private GatewayFilterChain filterChain;

    private String validSecret;

    @BeforeEach
    void setUp() {
        filterFactory = new JwtValidationFilter();
        
        // Generate a 256-bit key for HMAC-SHA256
        byte[] keyBytes = new byte[32];
        new java.util.Random().nextBytes(keyBytes);
        validSecret = java.util.HexFormat.of().formatHex(keyBytes);

        ReflectionTestUtils.setField(filterFactory, "jwtSecret", validSecret);

        filter = filterFactory.apply(new JwtValidationFilter.Config());
        filterChain = mock(GatewayFilterChain.class);
        when(filterChain.filter(any(ServerWebExchange.class))).thenReturn(Mono.empty());
    }

    @Test
    void shouldPassOptionsRequestWithoutAuth() {
        MockServerHttpRequest request = MockServerHttpRequest.options("/api/v1/training/programs").build();
        ServerWebExchange exchange = MockServerWebExchange.from(request);

        Mono<Void> result = filter.filter(exchange, filterChain);
        result.block();

        verify(filterChain, times(1)).filter(any());
    }

    @Test
    void shouldReturnUnauthorizedWhenNoAuthHeader() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/training/programs").build();
        ServerWebExchange exchange = MockServerWebExchange.from(request);

        Mono<Void> result = filter.filter(exchange, filterChain);
        result.block();

        assertEquals(HttpStatus.UNAUTHORIZED, exchange.getResponse().getStatusCode());
        verify(filterChain, never()).filter(any());
    }

    @Test
    void shouldReturnUnauthorizedWhenInvalidToken() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/training/programs")
                .header(HttpHeaders.AUTHORIZATION, "Bearer invalid.token.here")
                .build();
        ServerWebExchange exchange = MockServerWebExchange.from(request);

        Mono<Void> result = filter.filter(exchange, filterChain);
        result.block();

        assertEquals(HttpStatus.UNAUTHORIZED, exchange.getResponse().getStatusCode());
        verify(filterChain, never()).filter(any());
    }

    @Test
    void shouldPassAndAttachUserIdWhenValidToken() {
        String userId = UUID.randomUUID().toString();
        String token = Jwts.builder()
                .subject(userId)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 10000))
                .signWith(Keys.hmacShaKeyFor(java.util.HexFormat.of().parseHex(validSecret)))
                .compact();

        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/training/programs")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .build();
        ServerWebExchange exchange = MockServerWebExchange.from(request);

        Mono<Void> result = filter.filter(exchange, filterChain);
        result.block();

        verify(filterChain, times(1)).filter(argThat(ex -> {
            String injectedUserId = ex.getRequest().getHeaders().getFirst("X-User-Id");
            return userId.equals(injectedUserId);
        }));
    }
}

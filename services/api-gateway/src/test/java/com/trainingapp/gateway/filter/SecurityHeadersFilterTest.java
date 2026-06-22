package com.trainingapp.gateway.filter;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SecurityHeadersFilterTest {

    private SecurityHeadersFilter filter;
    private GatewayFilterChain filterChain;

    @BeforeEach
    void setUp() {
        filter = new SecurityHeadersFilter();
        filterChain = mock(GatewayFilterChain.class);
    }

    @Test
    void shouldAddSecurityHeadersToResponse() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/v1/auth/me").build();
        ServerWebExchange exchange = MockServerWebExchange.from(request);

        when(filterChain.filter(any(ServerWebExchange.class))).thenAnswer(invocation -> {
            // Simulate response being committed (triggers beforeCommit callbacks)
            return exchange.getResponse().setComplete();
        });

        Mono<Void> result = filter.filter(exchange, filterChain);
        result.block();

        HttpHeaders headers = exchange.getResponse().getHeaders();

        assertEquals("max-age=31536000 ; includeSubDomains", headers.getFirst("Strict-Transport-Security"));
        assertEquals("DENY", headers.getFirst("X-Frame-Options"));
        assertEquals("nosniff", headers.getFirst("X-Content-Type-Options"));
        assertEquals("no-referrer", headers.getFirst("Referrer-Policy"));
    }
}

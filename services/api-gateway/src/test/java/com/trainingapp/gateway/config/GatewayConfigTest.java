package com.trainingapp.gateway.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Unit tests for {@link GatewayConfig#ipKeyResolver()}.
 *
 * <p>Verifies that the resolver correctly extracts the real client IP when running
 * behind Cloudflare Tunnel or other reverse proxies, falling back gracefully when
 * no proxy headers are present.
 */
class GatewayConfigTest {

    private KeyResolver resolver;

    @BeforeEach
    void setUp() {
        resolver = new GatewayConfig().ipKeyResolver();
    }

    @Test
    void shouldUseCfConnectingIpWhenPresent() {
        MockServerHttpRequest request = MockServerHttpRequest
                .get("/api/v1/auth/login")
                .header("CF-Connecting-IP", "203.0.113.50")
                .header("X-Forwarded-For", "10.0.0.1")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        String ip = resolver.resolve(exchange).block();

        assertEquals("203.0.113.50", ip,
                "CF-Connecting-IP must take priority over X-Forwarded-For");
    }

    @Test
    void shouldUseXForwardedForWhenCfHeaderAbsent() {
        MockServerHttpRequest request = MockServerHttpRequest
                .get("/api/v1/auth/login")
                .header("X-Forwarded-For", "198.51.100.10")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        String ip = resolver.resolve(exchange).block();

        assertEquals("198.51.100.10", ip,
                "X-Forwarded-For should be used when CF-Connecting-IP is absent");
    }

    @Test
    void shouldExtractFirstIpFromChainedXForwardedFor() {
        MockServerHttpRequest request = MockServerHttpRequest
                .get("/api/v1/auth/login")
                .header("X-Forwarded-For", "198.51.100.10, 10.0.0.1, 172.16.0.5")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        String ip = resolver.resolve(exchange).block();

        assertEquals("198.51.100.10", ip,
                "Only the leftmost entry in X-Forwarded-For should be used (original client)");
    }

    @Test
    void shouldFallBackToRemoteAddressWhenNoProxyHeadersPresent() {
        MockServerHttpRequest request = MockServerHttpRequest
                .get("/api/v1/auth/login")
                .remoteAddress(new java.net.InetSocketAddress("192.168.1.1", 12345))
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        String ip = resolver.resolve(exchange).block();

        assertEquals("192.168.1.1", ip,
                "Raw socket address should be used as final fallback");
    }
}
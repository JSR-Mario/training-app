package com.trainingapp.gateway.config;

import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import reactor.core.publisher.Mono;

import java.util.Objects;

/**
 * Configuration class for the API Gateway.
 */
@Configuration
public class GatewayConfig {

    /**
     * Resolves the real client IP address for the Redis Rate Limiter.
     *
     * <p>When running behind Cloudflare Tunnel, {@code getRemoteAddress()} returns the local
     * tunnel daemon IP rather than the actual client. The resolver therefore checks headers in
     * priority order:
     * <ol>
     *   <li>{@code CF-Connecting-IP} — set by Cloudflare to the single, verified originating IP.</li>
     *   <li>{@code X-Forwarded-For} — standard proxy header; only the first (leftmost) entry is
     *       used to avoid trusting client-supplied values appended further right.</li>
     *   <li>Raw socket remote address — fallback for direct connections (e.g., local dev).</li>
     * </ol>
     *
     * @return a {@link Mono} emitting the resolved client IP address string.
     */
    @Bean
    public KeyResolver ipKeyResolver() {
        return exchange -> {
            String ip = exchange.getRequest().getHeaders().getFirst("CF-Connecting-IP");
            if (ip == null || ip.isEmpty()) {
                ip = exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
            }
            if (ip == null || ip.isEmpty()) {
                ip = Objects.requireNonNull(exchange.getRequest().getRemoteAddress())
                        .getAddress().getHostAddress();
            } else {
                // X-Forwarded-For may be comma-separated; the first entry is the original client
                ip = ip.split(",")[0].trim();
            }
            return Mono.just(ip);
        };
    }
}

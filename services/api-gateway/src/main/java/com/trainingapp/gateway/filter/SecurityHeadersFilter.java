package com.trainingapp.gateway.filter;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * A Global Filter that appends security headers to all responses.
 */
@Component
public class SecurityHeadersFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        return chain.filter(exchange).then(Mono.fromRunnable(() -> {
            var headers = exchange.getResponse().getHeaders();
            headers.add("Strict-Transport-Security", "max-age=31536000 ; includeSubDomains");
            headers.add("X-Frame-Options", "DENY");
            headers.add("X-Content-Type-Options", "nosniff");
            headers.add("Referrer-Policy", "no-referrer");
        }));
    }

    @Override
    public int getOrder() {
        return -1; // Execute early in the response phase
    }
}

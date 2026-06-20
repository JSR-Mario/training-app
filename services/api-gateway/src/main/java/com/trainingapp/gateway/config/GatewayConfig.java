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
     * Resolves the client IP address for the Redis Rate Limiter.
     *
     * @return a Mono emitting the client's IP address.
     */
    @Bean
    public KeyResolver ipKeyResolver() {
        return exchange -> Mono.just(Objects.requireNonNull(exchange.getRequest().getRemoteAddress()).getAddress().getHostAddress());
    }
}

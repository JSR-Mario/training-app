package com.trainingapp.training.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Registers WebMVC interceptors for the training-service.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final DemoUserInterceptor demoUserInterceptor;

    public WebConfig(DemoUserInterceptor demoUserInterceptor) {
        this.demoUserInterceptor = demoUserInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(demoUserInterceptor);
    }
}

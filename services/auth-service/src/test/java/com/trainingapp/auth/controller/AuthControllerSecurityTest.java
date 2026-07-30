package com.trainingapp.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trainingapp.auth.dto.RegisterRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private JavaMailSender mailSender;

    @Test
    void register_PublicEndpoint_AllowsRegistration() throws Exception {
        RegisterRequest req = new RegisterRequest("publicuser", "publicuser@example.com", "Password123");

        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());
    }

    @Test
    void verifyEmail_PublicEndpoint_AllowsVerificationCall() throws Exception {
        mockMvc.perform(get("/api/v1/auth/verify-email")
                .param("token", "non-existent-token"))
                .andExpect(status().isUnauthorized()); // Invalid token throws InvalidTokenException -> 401
    }
}

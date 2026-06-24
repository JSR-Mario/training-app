package com.trainingapp.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trainingapp.auth.dto.RegisterRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void register_WithoutAdminRole_ReturnsForbidden() throws Exception {
        RegisterRequest req = new RegisterRequest("hacker", "hacker@example.com", "password123");

        // The Gateway would normally inject X-User-Role, but we simulate a direct request
        // or a request from the Gateway where the user only has ROLE_USER
        mockMvc.perform(post("/api/v1/auth/register")
                .header("X-User-Role", "ROLE_USER")
                .header("X-User-Id", "123e4567-e89b-12d3-a456-426614174000")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    void register_WithAdminRole_AttemptsRegistration() throws Exception {
        RegisterRequest req = new RegisterRequest("newuser", "newuser@example.com", "password123");

        // With ROLE_ADMIN, it should bypass the 403 Forbidden and reach the controller.
        // It might return 400 Bad Request or 201 Created depending on DB state, 
        // but the important part is it's NOT 403.
        mockMvc.perform(post("/api/v1/auth/register")
                .header("X-User-Role", "ROLE_ADMIN")
                .header("X-User-Id", "123e4567-e89b-12d3-a456-426614174001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());
    }

    @Test
    void register_WithoutAnyHeaders_ReturnsForbidden() throws Exception {
        RegisterRequest req = new RegisterRequest("hacker", "hacker@example.com", "password123");

        // Completely unauthenticated request attempting to hit /register
        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }
}

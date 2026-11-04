package com.trainingapp.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trainingapp.auth.dto.AuthResponse;
import com.trainingapp.auth.dto.LoginRequest;
import com.trainingapp.auth.dto.RegisterRequest;
import com.trainingapp.auth.dto.UserResponse;
import com.trainingapp.auth.service.AuthService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false) // Disable security filters for unit test
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private com.trainingapp.auth.config.JwtProperties jwtProperties;

    @Test
    void register_Success() throws Exception {
        RegisterRequest req = new RegisterRequest("testuser", "test@example.com", "Password123");
        UserResponse resp = new UserResponse(UUID.randomUUID(), "testuser", "test@example.com", java.time.Instant.now(), "ROLE_USER", true, "light", "blue", "red");

        Mockito.when(authService.register(any())).thenReturn(resp);

        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("testuser"));
    }

    @Test
    void login_Success() throws Exception {
        LoginRequest req = new LoginRequest("testuser", "Password123");
        AuthResponse authResp = new AuthResponse("access-token-123", "Bearer", 900L);
        AuthService.LoginResult resp = new AuthService.LoginResult(authResp, "refresh-token-456");

        Mockito.when(authService.login(any())).thenReturn(resp);

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-token-123"))
                .andExpect(cookie().exists("refresh_token"))
                .andExpect(cookie().httpOnly("refresh_token", true));
    }

    @Test
    void forgotPassword_Success() throws Exception {
        com.trainingapp.auth.dto.ForgotPasswordRequest req = new com.trainingapp.auth.dto.ForgotPasswordRequest("test@example.com");

        mockMvc.perform(post("/api/v1/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("If that email address is in our system, we have sent a password reset link."));

        Mockito.verify(authService).forgotPassword("test@example.com");
    }

    @Test
    void resetPassword_Success() throws Exception {
        com.trainingapp.auth.dto.ResetPasswordRequest req = new com.trainingapp.auth.dto.ResetPasswordRequest("token-123", "NewValidPassword123");

        mockMvc.perform(post("/api/v1/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Password has been reset successfully."));

        Mockito.verify(authService).resetPassword("token-123", "NewValidPassword123");
    }

    @Test
    void resetPassword_invalidPasswordPattern_returnsBadRequest() throws Exception {
        com.trainingapp.auth.dto.ResetPasswordRequest req = new com.trainingapp.auth.dto.ResetPasswordRequest("token-123", "alllowercasepassword");

        mockMvc.perform(post("/api/v1/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());

        Mockito.verify(authService, Mockito.never()).resetPassword(any(), any());
    }
}

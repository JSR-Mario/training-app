package com.trainingapp.auth.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * Extracts the {@code X-User-Id} header from incoming requests and populates
 * the Spring Security {@link org.springframework.security.core.context.SecurityContext}.
 *
 * <p>The API gateway validates the JWT and forwards the user ID in this header.
 * This filter converts that header into a {@link UserIdAuthenticationToken} so
 * that downstream code can use {@link UserContext#getCurrentUserId()} to obtain
 * the authenticated user's UUID in a thread-safe, standard way.
 *
 * <p>Requests without the header (e.g., health checks) pass through unauthenticated.
 */
@Component
public class UserIdAuthenticationFilter extends OncePerRequestFilter {

    private static final String USER_ID_HEADER = "X-User-Id";
    private static final String USER_ROLE_HEADER = "X-User-Role";

    /**
     * Reads the {@code X-User-Id} header and, if present, creates a
     * {@link UserIdAuthenticationToken} and sets it in the security context.
     *
     * @param request     the incoming HTTP request
     * @param response    the outgoing HTTP response
     * @param filterChain the filter chain to continue processing
     * @throws ServletException if a servlet error occurs
     * @throws IOException      if an I/O error occurs
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String userIdHeader = request.getHeader(USER_ID_HEADER);
        String userRoleHeader = request.getHeader(USER_ROLE_HEADER);
        
        if (userIdHeader != null && !userIdHeader.isBlank()) {
            UUID userId = UUID.fromString(userIdHeader);
            String role = (userRoleHeader != null && !userRoleHeader.isBlank()) ? userRoleHeader : "ROLE_USER";
            
            UserIdAuthenticationToken authentication = new UserIdAuthenticationToken(
                    userId, 
                    List.of(new SimpleGrantedAuthority(role))
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }
}

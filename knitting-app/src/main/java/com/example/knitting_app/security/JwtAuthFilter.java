package com.example.knitting_app.security;

import com.example.knitting_app.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;
    private final List<String> publicPaths = Arrays.asList(
            "/api/auth/",
            "/api/catalog",
            "/api/thumbnails/",
            "/api/search/",
            "/api/ai/"
    );

    public JwtAuthFilter(JwtUtil jwtUtil, UserDetailsService userDetailsService) {
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
    }

    private boolean isPublicPath(String path) {
        return publicPaths.stream().anyMatch(path::startsWith);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        System.out.println("🔐 JwtAuthFilter: processing " + request.getRequestURI());

        String header = request.getHeader("Authorization");
        System.out.println("📨 Authorization header: " + (header != null ? "present" : "missing"));

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            System.out.println("🔑 Token: " + token.substring(0, Math.min(token.length(), 20)) + "...");

            boolean valid = jwtUtil.validateToken(token);
            System.out.println("✅ Token valid: " + valid);

            if (valid) {
                String username = jwtUtil.extractUsername(token);
                System.out.println("👤 Username from token: " + username);
                try {
                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                    System.out.println("📚 UserDetails authorities: " + userDetails.getAuthorities());
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    System.out.println("✅ Authentication set for " + username);
                } catch (Exception e) {
                    System.out.println("❌ Error loading user: " + e.getMessage());
                    e.printStackTrace();
                }
            } else {
                System.out.println("❌ Token is invalid or expired");
            }
        } else {
            System.out.println("⚠️ No Bearer token in header");
        }

        filterChain.doFilter(request, response);
    }
}
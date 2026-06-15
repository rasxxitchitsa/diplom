package com.example.knitting_app.dto;

public record AuthResponse(String token, String username, Long id, String role) {}
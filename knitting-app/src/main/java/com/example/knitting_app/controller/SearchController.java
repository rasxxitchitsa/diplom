package com.example.knitting_app.controller;

import com.example.knitting_app.dto.PatternDto;
import com.example.knitting_app.dto.YarnDto;
import com.example.knitting_app.repository.UserRepository;
import com.example.knitting_app.security.CustomUserDetails;
import com.example.knitting_app.service.PatternService;
import com.example.knitting_app.service.YarnService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/search")
@CrossOrigin(origins = "*")
public class SearchController {

    private final PatternService patternService;
    private final YarnService yarnService;
    private final UserRepository userRepository;

    public SearchController(PatternService patternService, YarnService yarnService, UserRepository userRepository) {
        this.patternService = patternService;
        this.yarnService = yarnService;
        this.userRepository = userRepository;
    }

    @GetMapping("/patterns")
    public ResponseEntity<List<PatternDto>> searchPatterns(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String difficulty,
            @RequestParam(required = false) String materials,
            Authentication auth) {
        Long userId = extractUserId(auth);
        List<PatternDto> result = patternService.searchPatterns(q, category, difficulty, materials, userId);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/yarns")
    public ResponseEntity<List<YarnDto>> searchYarns(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) String composition,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String hookSize,
            @RequestParam(required = false) String needleSize,
            @RequestParam(required = false) Double weightFrom,
            @RequestParam(required = false) Double weightTo,
            @RequestParam(required = false) Double lengthFrom,
            @RequestParam(required = false) Double lengthTo) {
        List<YarnDto> result = yarnService.searchYarns(q, brand, composition,
                country, hookSize, needleSize, weightFrom, weightTo, lengthFrom, lengthTo);
        return ResponseEntity.ok(result);
    }

    private Long extractUserId(Authentication authentication) {
        if (authentication != null && authentication.isAuthenticated()) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof CustomUserDetails) {
                return ((CustomUserDetails) principal).getUserId();
            }
        }
        return null;
    }
}
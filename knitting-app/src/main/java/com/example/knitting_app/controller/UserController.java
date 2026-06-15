package com.example.knitting_app.controller;

import com.example.knitting_app.dto.PurchaseDto;
import com.example.knitting_app.dto.UpdateProfileRequest;
import com.example.knitting_app.dto.UserProfileDto;
import com.example.knitting_app.model.Pattern;
import com.example.knitting_app.model.Purchase;
import com.example.knitting_app.model.User;
import com.example.knitting_app.repository.PatternRepository;
import com.example.knitting_app.repository.PurchaseRepository;
import com.example.knitting_app.repository.UserRepository;
import com.example.knitting_app.security.CustomUserDetails;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PurchaseRepository purchaseRepository;
    private final PatternRepository patternRepository;

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder, PurchaseRepository purchaseRepository, PatternRepository patternRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.purchaseRepository = purchaseRepository;
        this.patternRepository = patternRepository;
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails) {
            return ((CustomUserDetails) auth.getPrincipal()).getUserId();
        }
        throw new RuntimeException("Не авторизован");
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileDto> getCurrentUser() {
        Long userId = getCurrentUserId();
        User user = userRepository.findById(userId).orElseThrow();
        return ResponseEntity.ok(new UserProfileDto(user.getId(), user.getUsername(), user.getEmail()));
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateProfile(@RequestBody UpdateProfileRequest request) {
        Long userId = getCurrentUserId();
        User user = userRepository.findById(userId).orElseThrow();

        if (request.getUsername() != null && !request.getUsername().equals(user.getUsername())) {
            if (userRepository.findByUsername(request.getUsername()).isPresent()) {
                return ResponseEntity.badRequest().body("Имя пользователя уже занято");
            }
            user.setUsername(request.getUsername());
        }

        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.findByEmail(request.getEmail()).isPresent()) {
                return ResponseEntity.badRequest().body("Email уже используется");
            }
            user.setEmail(request.getEmail());
        }

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        userRepository.save(user);
        return ResponseEntity.ok(new UserProfileDto(user.getId(), user.getUsername(), user.getEmail()));
    }

    @GetMapping("/me/purchases")
    public ResponseEntity<List<PurchaseDto>> getPurchaseHistory() {
        Long userId = getCurrentUserId();
        List<Purchase> purchases = purchaseRepository.findByUserIdOrderByPurchaseDateDesc(userId);
        List<PurchaseDto> result = purchases.stream().map(p -> {
            Pattern pattern = patternRepository.findById(p.getPatternId()).orElse(null);
            String thumbPath = pattern != null ? pattern.getThumbnailPath() : null;
            System.out.println("DEBUG: patternId=" + p.getPatternId() +
                    ", name=" + (pattern != null ? pattern.getName() : "null") +
                    ", thumbPath=" + thumbPath);
            return new PurchaseDto(
                    p.getId(),
                    p.getPatternId(),
                    pattern != null ? pattern.getName() : "Удалённая схема",
                    thumbPath,
                    p.getAmount(),
                    p.getPurchaseDate()
            );
        }).collect(Collectors.toList());
        System.out.println("DEBUG: returning " + result.size() + " purchases");
        return ResponseEntity.ok(result);
    }
}
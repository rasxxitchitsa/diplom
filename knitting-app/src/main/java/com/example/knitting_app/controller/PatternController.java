package com.example.knitting_app.controller;

import com.example.knitting_app.dto.PatternDto;
import com.example.knitting_app.dto.PatternUpdateRequest;
import com.example.knitting_app.model.Pattern;
import com.example.knitting_app.security.CustomUserDetails;
import com.example.knitting_app.service.PatternService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.example.knitting_app.repository.UserRepository;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class PatternController {

    private final PatternService patternService;
    private final UserRepository userRepository;

    public PatternController(PatternService patternService, UserRepository userRepository) {
        this.patternService = patternService;
        this.userRepository = userRepository;
    }

    @Value("${upload.path}")
    private String uploadPath;

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails) {
            return ((CustomUserDetails) auth.getPrincipal()).getUserId();
        }
        throw new RuntimeException("Пользователь не аутентифицирован");
    }

    private String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails) {
            return ((CustomUserDetails) auth.getPrincipal()).getUsername();
        }
        return "Unknown";
    }

    @PostMapping("/patterns")
    public Pattern uploadPattern(@RequestParam("file") MultipartFile file,
                                 @RequestParam(value = "cover", required = false) MultipartFile cover,
                                 @RequestParam(value = "name", required = false) String name,
                                 @RequestParam(value = "author", required = false) String author,
                                 @RequestParam(value = "category", required = false) String category,
                                 @RequestParam(value = "difficulty", required = false) String difficulty,
                                 @RequestParam(value = "materials", required = false) String materials,
                                 @RequestParam(value = "description", required = false) String description,
                                 @RequestParam(value = "price", required = false) Integer price) throws IOException {
        String finalName = (name != null && !name.isEmpty()) ? name : file.getOriginalFilename();
        String finalAuthor = (author != null && !author.isEmpty()) ? author : getCurrentUsername();
        return patternService.saveUserPattern(file, cover, getCurrentUserId(), finalName, finalAuthor,
                category, difficulty, materials, description, price);
    }

    @GetMapping("/patterns/{id}/metadata")
    public PatternDto getPatternMetadata(@PathVariable Long id) {
        Pattern pattern = patternService.getPatternForUser(id, getCurrentUserId());
        return patternService.toDto(pattern, getCurrentUserId());
    }

    @GetMapping("/patterns")
    public List<PatternDto> getUserPatterns(Authentication authentication) {
        System.out.println("🔐 Authentication in controller: " + authentication);
        System.out.println("🔐 SecurityContext: " + SecurityContextHolder.getContext().getAuthentication());
        return patternService.getUserPatternsWithSaved(getCurrentUserId());
    }

    @GetMapping("/patterns/{id}")
    public ResponseEntity<Resource> getPatternFile(@PathVariable Long id) throws MalformedURLException {
        Path path = patternService.getFilePathForUser(id, getCurrentUserId());
        Resource resource = new UrlResource(path.toUri());
        Pattern pattern = patternService.getPatternForUser(id, getCurrentUserId());

        String contentDisposition = encodeContentDisposition(pattern.getName(), true);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition)
                .body(resource);
    }

    private String encodeContentDisposition(String filename, boolean inline) {
        if (filename == null || filename.isBlank()) {
            filename = "pattern.pdf";
        }
        String disposition = inline ? "inline" : "attachment";
        String encoded = URLEncoder.encode(filename, StandardCharsets.UTF_8)
                .replaceAll("\\+", "%20");
        return disposition + "; filename*=UTF-8''" + encoded;
    }

    @GetMapping("/patterns/{id}/download")
    public ResponseEntity<Resource> downloadPatternFile(@PathVariable Long id) throws MalformedURLException {
        Path path = patternService.getFilePathForUser(id, getCurrentUserId());
        Resource resource = new UrlResource(path.toUri());
        Pattern pattern = patternService.getPatternForUser(id, getCurrentUserId());

        String contentDisposition = encodeContentDisposition(pattern.getName(), false);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition)
                .body(resource);
    }

    @PostMapping("/patterns/{id}/publish")
    public Pattern publishPattern(@PathVariable Long id,
                                  @RequestParam String category,
                                  @RequestParam(required = false) String author,
                                  @RequestParam(required = false) String name,
                                  @RequestParam(required = false) Integer price ) throws IOException {
        return patternService.publishPattern(id, getCurrentUserId(), category, author, name, price);
    }

    @PutMapping("/patterns/{id}")
    public ResponseEntity<?> updatePattern(@PathVariable Long id,
                                           @Valid @RequestBody PatternUpdateRequest request) {
        try {
            Pattern updated = patternService.updatePatternMetadata(id, getCurrentUserId(), request);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        }
    }

    @PatchMapping("/patterns/{id}/notes")
    public ResponseEntity<?> updateNotes(@PathVariable Long id,
                                         @RequestBody Map<String, String> payload) {
        String notes = payload.get("notes");
        patternService.updateNotes(id, getCurrentUserId(), notes);
        return ResponseEntity.ok().body(Map.of("message", "Заметки сохранены"));
    }

    @DeleteMapping("/patterns/{id}")
    public ResponseEntity<Void> deletePattern(@PathVariable Long id) throws IOException {
        patternService.deleteUserPattern(id, getCurrentUserId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/catalog")
    public ResponseEntity<?> getCatalog(@RequestParam(required = false) String category) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean isAuthenticated = auth != null && auth.isAuthenticated()
                    && !(auth.getPrincipal() instanceof String && "anonymousUser".equals(auth.getPrincipal()));

            List<PatternDto> result;
            if (isAuthenticated) {
                Long userId = getCurrentUserId();
                result = patternService.getPublicPatternsByCategory(userId, category);
            } else {
                result = patternService.getPublicPatternsByCategoryForGuest(category);
            }
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Ошибка загрузки каталога: " + e.getMessage());
        }
    }


    @PostMapping("/catalog/{id}/save")
    public ResponseEntity<?> savePublicToLibrary(@PathVariable Long id) {
        try {
            Pattern saved = patternService.savePublicPatternToUser(id, getCurrentUserId());
            PatternDto dto = patternService.toDto(saved, getCurrentUserId(), true);
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        }
    }

    @GetMapping("/thumbnails/{filename}")
    public ResponseEntity<Resource> getThumbnail(@PathVariable String filename) throws IOException {
        Path thumbPath = Paths.get(uploadPath).resolve("thumbs").resolve(filename);
        if (!Files.exists(thumbPath)) {
            return ResponseEntity.notFound().build();
        }
        Resource resource = new UrlResource(thumbPath.toUri());
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .body(resource);
    }


    @GetMapping("/patterns/saved-ids")
    public List<Long> getSavedPatternIds() {
        return patternService.getUserSavedPatternIds(getCurrentUserId());
    }

    @DeleteMapping("/library/{patternId}")
    public ResponseEntity<?> removeFromLibrary(@PathVariable Long patternId) {
        try {
            patternService.removeFromLibrary(getCurrentUserId(), patternId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(e.getMessage());
        }
    }

    @GetMapping("/users/{userId}/patterns")
    public ResponseEntity<List<PatternDto>> getPatternsByUser(@PathVariable Long userId,
                                                              Authentication authentication) {
        Long currentUserId = extractUserId(authentication);
        List<PatternDto> patterns = patternService.getPublicPatternsByUserId(userId, currentUserId);
        return ResponseEntity.ok(patterns);
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

    @PostMapping("/patterns/{id}/buy")
    public ResponseEntity<?> buyPattern(@PathVariable Long id) {
        try {
            Pattern purchased = patternService.purchasePattern(id, getCurrentUserId());
            return ResponseEntity.ok(Map.of("message", "Схема куплена и добавлена в библиотеку"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PutMapping("/patterns/{id}/price")
    public ResponseEntity<?> updatePrice(@PathVariable Long id,
                                         @RequestParam Integer price) {
        try {
            Pattern updated = patternService.setPatternPrice(id, getCurrentUserId(), price);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        }
    }
}
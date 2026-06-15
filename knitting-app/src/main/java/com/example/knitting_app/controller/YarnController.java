package com.example.knitting_app.controller;

import com.example.knitting_app.dto.YarnDto;
import com.example.knitting_app.security.CustomUserDetails;
import com.example.knitting_app.service.YarnService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@RestController
@RequestMapping("/api/yarns")
public class YarnController {

    private final YarnService yarnService;

    @Value("${upload.yarn.path:uploads/yarns}")
    private String yarnUploadPath;

    public YarnController(YarnService yarnService) {
        this.yarnService = yarnService;
    }

    @GetMapping
    public ResponseEntity<List<YarnDto>> getAllPublicYarns(Authentication authentication) {
        Long userId = extractUserId(authentication);
        return ResponseEntity.ok(yarnService.getAllPublicYarns(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<YarnDto> getYarnById(@PathVariable Long id,
                                               Authentication authentication) {
        Long userId = extractUserId(authentication);
        return ResponseEntity.ok(yarnService.getYarnById(id, userId));
    }

    @PostMapping("/{id}/favorite")
    public ResponseEntity<?> addToFavorites(@PathVariable Long id,
                                            Authentication authentication) {
        Long userId = extractUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        yarnService.addToFavorites(userId, id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/favorite")
    public ResponseEntity<?> removeFromFavorites(@PathVariable Long id,
                                                 Authentication authentication) {
        Long userId = extractUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        yarnService.removeFromFavorites(userId, id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/favorites")
    public ResponseEntity<List<YarnDto>> getFavorites(Authentication authentication) {
        Long userId = extractUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(yarnService.getFavoriteYarns(userId));
    }

    @GetMapping("/image/{fileName}")
    public ResponseEntity<Resource> getImage(@PathVariable String fileName) {
        try {
            Path imagePath = Paths.get(yarnUploadPath).resolve(fileName).normalize();
            Resource resource = new UrlResource(imagePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_TYPE, MediaType.IMAGE_JPEG_VALUE)
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
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
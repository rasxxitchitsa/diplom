package com.example.knitting_app.controller;

import com.example.knitting_app.dto.*;
import com.example.knitting_app.model.*;
import com.example.knitting_app.repository.*;
import com.example.knitting_app.service.PatternService;
import com.example.knitting_app.service.YarnService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final YarnRepository yarnRepository;
    private final PatternRepository patternRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final UserFavoriteYarnRepository favoriteRepository;
    private final UserPatternRepository userPatternRepository;
    private final PurchaseRepository purchaseRepository;
    private final PatternService patternService;
    private final YarnService yarnService;

    @Value("${upload.yarn.path:uploads/yarns}")
    private String yarnUploadPath;

    @Value("${upload.path}")
    private String uploadPath;

    public AdminController(YarnRepository yarnRepository,
                           PatternRepository patternRepository,
                           UserRepository userRepository,
                           CategoryRepository categoryRepository,
                           UserFavoriteYarnRepository favoriteRepository,
                           UserPatternRepository userPatternRepository,
                           PurchaseRepository purchaseRepository,
                           PatternService patternService,
                           YarnService yarnService) {
        this.yarnRepository = yarnRepository;
        this.patternRepository = patternRepository;
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
        this.favoriteRepository = favoriteRepository;
        this.userPatternRepository = userPatternRepository;
        this.purchaseRepository = purchaseRepository;
        this.patternService = patternService;
        this.yarnService = yarnService;
    }

    @GetMapping("/yarns")
    public ResponseEntity<List<YarnDto>> getAllYarns() {
        List<YarnDto> dtos = yarnService.getAllPublicYarns(null);
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/yarns/{id}")
    public ResponseEntity<YarnDto> getYarnById(@PathVariable Long id) {
        Yarn yarn = yarnRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Пряжа не найдена"));
        return ResponseEntity.ok(yarnService.toDto(yarn));
    }

    @PostMapping("/yarns")
    public ResponseEntity<?> createYarn(@RequestBody YarnDto yarnDto) {
        Yarn yarn = new Yarn();
        copyYarnDtoToEntity(yarnDto, yarn);
        Yarn saved = yarnRepository.save(yarn);
        return ResponseEntity.ok(yarnService.toDto(saved));
    }

    @PutMapping("/yarns/{id}")
    public ResponseEntity<?> updateYarn(@PathVariable Long id, @RequestBody YarnDto yarnDto) {
        Yarn yarn = yarnRepository.findById(id).orElseThrow(() -> new RuntimeException("Пряжа не найдена"));
        copyYarnDtoToEntity(yarnDto, yarn);
        Yarn saved = yarnRepository.save(yarn);
        return ResponseEntity.ok(yarnService.toDto(saved));
    }

    @DeleteMapping("/yarns/{id}")
    public ResponseEntity<?> deleteYarn(@PathVariable Long id) {
        if (!yarnRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        favoriteRepository.deleteAll(favoriteRepository.findByYarnId(id));
        yarnRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private void copyYarnDtoToEntity(YarnDto dto, Yarn entity) {
        if (dto.getName() != null) entity.setName(dto.getName());
        if (dto.getBrand() != null) entity.setBrand(dto.getBrand());
        if (dto.getWeight() != null) entity.setWeight(dto.getWeight());
        if (dto.getLength() != null) entity.setLength(dto.getLength());
        if (dto.getComposition() != null) entity.setComposition(dto.getComposition());
        if (dto.getHookSize() != null) entity.setHookSize(dto.getHookSize());
        if (dto.getNeedleSize() != null) entity.setNeedleSize(dto.getNeedleSize());
        if (dto.getCountry() != null) entity.setCountry(dto.getCountry());
        if (dto.getStitches() != null) entity.setStitches(dto.getStitches());
        if (dto.getRows() != null) entity.setRows(dto.getRows());
        if (dto.getImagePath() != null) entity.setImagePath(dto.getImagePath());
    }

    @PostMapping("/yarns/{id}/image")
    public ResponseEntity<?> uploadYarnImage(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        Yarn yarn = yarnRepository.findById(id).orElseThrow();
        String fileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path uploadDir = Paths.get(yarnUploadPath);
        try {
            if (!Files.exists(uploadDir)) Files.createDirectories(uploadDir);
            Path targetPath = uploadDir.resolve(fileName);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            yarn.setImagePath(fileName);
            yarnRepository.save(yarn);
            return ResponseEntity.ok().build();
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Ошибка сохранения файла");
        }
    }

    @GetMapping("/patterns")
    public ResponseEntity<List<Pattern>> getAllPatterns() {
        return ResponseEntity.ok(patternRepository.findAll());
    }

    @DeleteMapping("/patterns/{id}")
    public ResponseEntity<?> deletePatternAsAdmin(@PathVariable Long id) {
        Pattern pattern = patternRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Схема не найдена"));
        userPatternRepository.deleteAll(userPatternRepository.findByPatternId(id));
        purchaseRepository.deleteAll(purchaseRepository.findByPatternId(id));
        try {
            Path pdfPath = Paths.get(uploadPath).resolve(pattern.getStoredName());
            Files.deleteIfExists(pdfPath);
            if (pattern.getThumbnailPath() != null) {
                Path thumbPath = Paths.get(uploadPath).resolve("thumbs").resolve(pattern.getThumbnailPath());
                Files.deleteIfExists(thumbPath);
            }
        } catch (IOException e) {
            System.err.println("Ошибка удаления файлов схемы: " + e.getMessage());
        }
        patternRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/patterns/{id}/category")
    public ResponseEntity<?> movePatternToCategory(@PathVariable Long id, @RequestParam String category) {
        Pattern pattern = patternRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Схема не найдена"));
        Category cat = categoryRepository.findByNameAndType(category, CategoryType.PATTERN)
                .orElseThrow(() -> new RuntimeException("Категория не найдена"));
        pattern.setCategory(cat);
        patternRepository.save(pattern);
        return ResponseEntity.ok(pattern);
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserDto>> getAllUsers() {
        List<User> users = userRepository.findAll();
        List<UserDto> dtos = users.stream()
                .map(u -> new UserDto(u.getId(), u.getUsername(), u.getEmail(), u.getRole().name()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<?> changeUserRole(@PathVariable Long id, @RequestParam String role) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));
        try {
            user.setRole(Role.valueOf(role.toUpperCase()));
            userRepository.save(user);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Неверная роль: " + role);
        }
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));
        List<Pattern> userPatterns = patternRepository.findByUserId(id);
        for (Pattern p : userPatterns) {
            userPatternRepository.deleteAll(userPatternRepository.findByPatternId(p.getId()));
            purchaseRepository.deleteAll(purchaseRepository.findByPatternId(p.getId()));
            try {
                Path pdfPath = Paths.get(uploadPath).resolve(p.getStoredName());
                Files.deleteIfExists(pdfPath);
                if (p.getThumbnailPath() != null) {
                    Path thumbPath = Paths.get(uploadPath).resolve("thumbs").resolve(p.getThumbnailPath());
                    Files.deleteIfExists(thumbPath);
                }
            } catch (IOException e) {
                System.err.println("Ошибка удаления файлов схемы " + p.getId() + ": " + e.getMessage());
            }
        }
        patternRepository.deleteAll(userPatterns);
        favoriteRepository.deleteAll(favoriteRepository.findByUserId(id));
        userPatternRepository.deleteAll(userPatternRepository.findByUserId(id));
        purchaseRepository.deleteAll(purchaseRepository.findByUserId(id));
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/categories")
    public ResponseEntity<List<Category>> getAllCategories() {
        return ResponseEntity.ok(categoryRepository.findAll());
    }

    @PostMapping("/categories")
    public ResponseEntity<?> createCategory(@RequestParam String name, @RequestParam String type) {
        Category category = new Category();
        category.setName(name);
        category.setType(CategoryType.valueOf(type));
        categoryRepository.save(category);
        return ResponseEntity.ok(category);
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<?> deleteCategory(@PathVariable Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Категория не найдена"));
        if (patternRepository.existsByCategoryName(category.getName())) {
            return ResponseEntity.badRequest().body("Нельзя удалить категорию, так как есть схемы с этой категорией");
        }
        categoryRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getStatistics() {
        Map<String, Object> stats = new HashMap<>();

        stats.put("totalUsers", userRepository.count());
        stats.put("totalPatterns", patternRepository.count());
        stats.put("totalYarns", yarnRepository.count());
        stats.put("totalCategories", categoryRepository.count());
        stats.put("newUsersLast7Days", 0);

        List<Object[]> topPatterns = userPatternRepository.countSavesPerPattern();
        stats.put("topSavedPatterns", topPatterns.stream().limit(5).toList());

        List<Object[]> topYarns = favoriteRepository.countFavoritesPerYarn();
        stats.put("topFavoriteYarns", topYarns.stream().limit(5).toList());

        long paidPatterns = patternRepository.countByPriceIsNotNull();
        long totalPurchases = purchaseRepository.count();
        stats.put("paidPatterns", paidPatterns);
        stats.put("totalPurchases", totalPurchases);

        List<Object[]> topAuthors = patternRepository.countPatternsPerUser();
        stats.put("topPatternAuthors", topAuthors.stream().limit(5).toList());

        return ResponseEntity.ok(stats);
    }

    @PutMapping("/categories/{id}")
    public ResponseEntity<?> updateCategory(@PathVariable Long id, @RequestParam String name) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Категория не найдена"));
        if (categoryRepository.existsByNameAndType(name, category.getType())) {
            return ResponseEntity.badRequest().body("Категория с таким именем уже существует");
        }
        category.setName(name);
        categoryRepository.save(category);
        return ResponseEntity.ok(category);
    }
}
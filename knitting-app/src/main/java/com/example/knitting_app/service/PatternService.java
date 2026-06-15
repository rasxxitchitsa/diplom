package com.example.knitting_app.service;

import com.example.knitting_app.dto.PatternDto;
import com.example.knitting_app.dto.PatternUpdateRequest;
import com.example.knitting_app.model.*;
import com.example.knitting_app.repository.CategoryRepository;
import com.example.knitting_app.repository.PatternRepository;
import com.example.knitting_app.repository.PurchaseRepository;
import com.example.knitting_app.repository.UserPatternRepository;
import jakarta.transaction.Transactional;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

@Service
public class PatternService {

    @Value("${upload.path}")
    private String uploadPath;

    private final PatternRepository patternRepository;
    private final UserPatternRepository userPatternRepository;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final PurchaseRepository purchaseRepository;
    private final CategoryRepository categoryRepository;

    public PatternService(PatternRepository patternRepository,
                          UserPatternRepository userPatternRepository,
                          PurchaseRepository purchaseRepository,
                          CategoryRepository categoryRepository) {
        this.patternRepository = patternRepository;
        this.userPatternRepository = userPatternRepository;
        this.purchaseRepository = purchaseRepository;
        this.categoryRepository = categoryRepository;
    }

    private Category getCategoryByName(String categoryName) {
        if (categoryName == null || categoryName.isBlank()) return null;
        return categoryRepository.findByNameAndType(categoryName, CategoryType.PATTERN)
                .orElseThrow(() -> new RuntimeException("Категория не найдена: " + categoryName));
    }

    public List<Pattern> getUserPatterns(Long userId) {
        return patternRepository.findByUserId(userId);
    }

    public List<PatternDto> getPublicPatternsByCategory(Long userId, String category) {
        List<Pattern> patterns;
        if (category == null || category.isEmpty() || category.equals("all")) {
            patterns = patternRepository.findByIsPublicTrue();
        } else {
            patterns = patternRepository.findByIsPublicTrueAndCategoryName(category);
        }
        Set<Long> savedPatternIds = userPatternRepository.findByUserId(userId)
                .stream()
                .map(up -> up.getPattern().getId())
                .collect(Collectors.toSet());
        return patterns.stream()
                .map(p -> toDto(p, userId, savedPatternIds.contains(p.getId())))
                .collect(Collectors.toList());
    }

    public List<PatternDto> getPublicPatternsByCategoryForGuest(String category) {
        List<Pattern> patterns;
        if (category == null || category.isEmpty() || category.equals("all")) {
            patterns = patternRepository.findByIsPublicTrue();
        } else {
            patterns = patternRepository.findByIsPublicTrueAndCategoryName(category);        }
        return patterns.stream()
                .map(p -> toDto(p, null, false))
                .collect(Collectors.toList());
    }

    public List<PatternDto> getUserPatternsWithSaved(Long userId) {
        List<PatternDto> result = new ArrayList<>();
        for (Pattern p : patternRepository.findByUserId(userId)) {
            result.add(toDto(p, userId, false));
        }
        for (UserPattern up : userPatternRepository.findByUserId(userId)) {
            Pattern p = up.getPattern();
            if (p.getUserId() != null && p.getUserId().equals(userId)) {
                continue;
            }
            result.add(toDto(p, userId, true));
        }
        return result;
    }

    public Pattern saveUserPattern(MultipartFile file, MultipartFile cover, Long userId,
                                   String name, String author, String category,
                                   String difficulty, String materials,
                                   String description, Integer price) throws IOException {
        String storedName = UUID.randomUUID() + ".pdf";
        Path uploadDir = Paths.get(uploadPath);
        if (!Files.exists(uploadDir)) {
            Files.createDirectories(uploadDir);
        }
        Path targetPath = uploadDir.resolve(storedName);
        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        String thumbnailPath;
        if (cover != null && !cover.isEmpty() && cover.getContentType() != null
                && cover.getContentType().startsWith("image/")) {
            thumbnailPath = saveCoverImage(cover, storedName);
        } else {
            thumbnailPath = generateThumbnail(targetPath, storedName);
        }

        Category cat = getCategoryByName(category);
        Pattern pattern = new Pattern(name, storedName, author, cat, userId, false);        pattern.setIsCatalogCopy(false);
        pattern.setDifficulty(difficulty);
        pattern.setMaterials(materials);
        pattern.setDescription(description);
        pattern.setPrice(price != null && price > 0 ? price : null);
        pattern.setThumbnailPath(thumbnailPath);
        Pattern saved = patternRepository.save(pattern);
        return saved;
    }

    private String saveCoverImage(MultipartFile cover, String pdfStoredName) throws IOException {
        Path thumbDir = Paths.get(uploadPath).resolve("thumbs");
        if (!Files.exists(thumbDir)) {
            Files.createDirectories(thumbDir);
        }
        String thumbFileName = pdfStoredName.replace(".pdf", ".png");
        Path thumbPath = thumbDir.resolve(thumbFileName);
        BufferedImage image = ImageIO.read(cover.getInputStream());
        if (image == null) {
            throw new IOException("Невозможно прочитать изображение обложки");
        }
        ImageIO.write(image, "png", thumbPath.toFile());
        return thumbFileName;
    }

    public List<Pattern> getUserFullLibrary(Long userId) {

        List<Pattern> allPatterns = new ArrayList<>(patternRepository.findByUserId(userId));

        List<UserPattern> saved = userPatternRepository.findByUserId(userId);
        for (UserPattern up : saved) {
            allPatterns.add(up.getPattern());
        }

        return allPatterns;
    }

    public List<PatternDto> getUserLibrary(Long userId) {
        List<PatternDto> result = new ArrayList<>();

        List<Pattern> own = patternRepository.findByUserId(userId);
        for (Pattern p : own) {
            result.add(toDto(p, userId));
        }

        List<UserPattern> saved = userPatternRepository.findByUserId(userId);
        for (UserPattern up : saved) {
            result.add(toDto(up.getPattern(), userId));
        }

        return result;
    }

    public PatternDto toDto(Pattern pattern, Long currentUserId, boolean isSaved) {
        PatternDto dto = new PatternDto();
        dto.setId(pattern.getId());
        dto.setUserId(pattern.getUserId());
        dto.setName(pattern.getName());
        dto.setAuthor(pattern.getAuthor());
        if (pattern.getCategory() != null) {
            dto.setCategoryName(pattern.getCategory().getName());
            dto.setCategoryId(pattern.getCategory().getId());
        }
        dto.setThumbnailPath(pattern.getThumbnailPath());
        dto.setDescription(pattern.getDescription());
        dto.setDifficulty(pattern.getDifficulty());
        dto.setMaterials(pattern.getMaterials());
        dto.setUploadDate(pattern.getUploadDate());
        dto.setPublic(pattern.getIsPublic() != null && pattern.getIsPublic());
        dto.setPrice(pattern.getPrice());

        boolean isOwn = pattern.getUserId() != null && pattern.getUserId().equals(currentUserId);
        dto.setOwn(isOwn);
        dto.setSaved(isSaved && !isOwn);
        dto.setCatalogCopy(isSaved && !isOwn);

        if (pattern.getPrice() != null && pattern.getPrice() > 0) {
            dto.setPurchaseCount((int) purchaseRepository.countByPatternId(pattern.getId()));
            if (currentUserId != null) {
                dto.setPurchased(purchaseRepository.existsByUserIdAndPatternId(currentUserId, pattern.getId()));
            } else {
                dto.setPurchased(false);
            }
        } else {
            dto.setPurchaseCount((int) userPatternRepository.countByPatternId(pattern.getId()));
            dto.setPurchased(false);
        }

        if (currentUserId != null) {
            Optional<UserPattern> up = userPatternRepository.findByUserIdAndPatternId(currentUserId, pattern.getId());
            dto.setNotes(up.map(UserPattern::getNotes).orElse(null));
        } else {
            dto.setNotes(null);
        }

        return dto;
    }

    public Pattern updatePatternCategory(Long patternId, String categoryName) {
        Pattern pattern = patternRepository.findById(patternId)
                .orElseThrow(() -> new RuntimeException("Схема не найдена"));
        Category category = categoryRepository.findByNameAndType(categoryName, CategoryType.PATTERN)
                .orElseThrow(() -> new RuntimeException("Категория не найдена: " + categoryName));
        pattern.setCategory(category);
        return patternRepository.save(pattern);
    }

    public PatternDto toDto(Pattern pattern, Long currentUserId) {
        boolean isSaved = pattern.getIsCatalogCopy() != null && pattern.getIsCatalogCopy();
        return toDto(pattern, currentUserId, isSaved);
    }

    public void updateNotes(Long patternId, Long userId, String notes) {
        Pattern pattern = patternRepository.findById(patternId).orElseThrow();
        UserPattern userPattern = userPatternRepository.findByUserIdAndPatternId(userId, patternId)
                .orElseGet(() -> {
                    UserPattern up = new UserPattern();
                    up.setUserId(userId);
                    up.setPattern(pattern);
                    up.setSavedDate(LocalDateTime.now());
                    return up;
                });
        userPattern.setNotes(notes);
        userPatternRepository.save(userPattern);
    }

    public Pattern publishPattern(Long patternId, Long userId, String category, String author, String newName, Integer price) {
        Pattern pattern = patternRepository.findById(patternId)
                .orElseThrow(() -> new RuntimeException("Схема не найдена"));
        if (!pattern.getUserId().equals(userId)) {
            throw new RuntimeException("Вы не являетесь владельцем этой схемы");
        }
        if (pattern.getIsCatalogCopy() != null && pattern.getIsCatalogCopy()) {
            throw new RuntimeException("Нельзя опубликовать скопированную из каталога схему");
        }
        if (pattern.getIsPublic() != null && pattern.getIsPublic()) {
            throw new RuntimeException("Схема уже опубликована");
        }

        pattern.setIsPublic(true);
        Category cat = getCategoryByName(category);
        pattern.setCategory(cat);
        if (author != null && !author.trim().isEmpty()) {
            pattern.setAuthor(author);
        }
        if (newName != null && !newName.trim().isEmpty()) {
            pattern.setName(newName);
        }
        pattern.setIsCatalogCopy(false);
        pattern.setPrice(price != null && price > 0 ? price : null);
        return patternRepository.save(pattern);
    }

    public Pattern setPatternPrice(Long patternId, Long userId, Integer price) {
        Pattern pattern = patternRepository.findById(patternId)
                .orElseThrow(() -> new RuntimeException("Схема не найдена"));
        if (!pattern.getUserId().equals(userId))
            throw new RuntimeException("Только владелец может установить цену");
        pattern.setPrice(price != null && price > 0 ? price : null);
        return patternRepository.save(pattern);
    }

    public Pattern getPatternForUser(Long patternId, Long userId) {
        Pattern pattern = patternRepository.findById(patternId)
                .orElseThrow(() -> new RuntimeException("Схема не найдена"));
        boolean isOwn = pattern.getUserId() != null && pattern.getUserId().equals(userId);
        if (!isOwn && !Boolean.TRUE.equals(pattern.getIsPublic())) {
            throw new RuntimeException("Доступ запрещён");
        }
        return pattern;
    }

    public void removeFromLibrary(Long userId, Long patternId) {
        userPatternRepository.deleteByUserIdAndPatternId(userId, patternId);
    }

    public List<Long> getUserSavedPatternIds(Long userId) {
        return userPatternRepository.findPatternIdsByUserId(userId);
    }

    public Pattern savePublicPatternToUser(Long publicPatternId, Long userId) {
        if (userPatternRepository.findByUserIdAndPatternId(userId, publicPatternId).isPresent()) {
            throw new RuntimeException("Схема уже сохранена");
        }
        Pattern publicPattern = patternRepository.findById(publicPatternId)
                .orElseThrow(() -> new RuntimeException("Публичная схема не найдена"));
        if (!Boolean.TRUE.equals(publicPattern.getIsPublic())) {
            throw new RuntimeException("Схема не является публичной");
        }
        if (publicPattern.getUserId() != null && publicPattern.getUserId().equals(userId)) {
            throw new RuntimeException("Нельзя добавить свою собственную схему в библиотеку");
        }
        UserPattern up = new UserPattern();
        up.setUserId(userId);
        up.setPattern(publicPattern);
        up.setSavedDate(LocalDateTime.now());
        up.setNotes("");
        userPatternRepository.save(up);
        return publicPattern;
    }

    public void deleteUserPattern(Long id, Long userId) {
        Pattern pattern = getPatternForUser(id, userId);
        List<UserPattern> userPatterns = userPatternRepository.findByPatternId(id);
        userPatternRepository.deleteAll(userPatterns);
        try {
            Path pdfPath = Paths.get(uploadPath).resolve(pattern.getStoredName());
            Files.deleteIfExists(pdfPath);
            if (pattern.getThumbnailPath() != null) {
                Path thumbPath = Paths.get(uploadPath).resolve("thumbs").resolve(pattern.getThumbnailPath());
                Files.deleteIfExists(thumbPath);
            }
        } catch (IOException e) {
            throw new RuntimeException("Ошибка при удалении файлов схемы: " + e.getMessage(), e);
        }
        patternRepository.deleteById(id);
    }

    public Path getFilePathForUser(Long id, Long userId) {
        Pattern pattern = getPatternForUser(id, userId);
        return Paths.get(uploadPath).resolve(pattern.getStoredName());
    }

    private String generateThumbnail(Path pdfPath, String storedName) throws IOException {
        Path thumbDir = Paths.get(uploadPath).resolve("thumbs");
        if (!Files.exists(thumbDir)) {
            Files.createDirectories(thumbDir);
        }
        String thumbFileName = storedName.replace(".pdf", ".png");
        Path thumbPath = thumbDir.resolve(thumbFileName);
        try (PDDocument document = PDDocument.load(pdfPath.toFile())) {
            PDFRenderer renderer = new PDFRenderer(document);
            float targetWidth = 500f;
            float scale = targetWidth / document.getPage(0).getMediaBox().getWidth();
            BufferedImage image = renderer.renderImage(0, scale);
            ImageIO.write(image, "png", thumbPath.toFile());
        } catch (IOException e) {
            System.err.println("Не удалось создать миниатюру для " + storedName + ": " + e.getMessage());
            return null;
        }
        return thumbFileName;
    }

    public String generateThumbnailAndReturnPath(Path pdfPath, String storedName) {
        try {
            return generateThumbnail(pdfPath, storedName);
        } catch (IOException e) {
            System.err.println("Ошибка генерации миниатюры для " + storedName + ": " + e.getMessage());
            return null;
        }
    }

    public Pattern updatePatternMetadata(Long id, Long userId, PatternUpdateRequest request) {
        Pattern pattern = patternRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Схема не найдена"));
        if (!pattern.getUserId().equals(userId)) {
            throw new RuntimeException("Вы не являетесь владельцем этой схемы");
        }
        if (request.getName() != null && !request.getName().isBlank()) {
            pattern.setName(request.getName());
        }
        if (request.getAuthor() != null && !request.getAuthor().isBlank()) {
            pattern.setAuthor(request.getAuthor());
        }
        if (request.getCategory() != null && !request.getCategory().isBlank()) {
            Category cat = getCategoryByName(request.getCategory());
            pattern.setCategory(cat);
        }
        if (request.getDifficulty() != null) {
            pattern.setDifficulty(request.getDifficulty());
        }
        if (request.getMaterials() != null) {
            pattern.setMaterials(request.getMaterials());
        }
        if (request.getDescription() != null) {
            pattern.setDescription(request.getDescription());
        }
        pattern.setPrice(request.getPrice() != null && request.getPrice() > 0 ? request.getPrice() : null);
        return patternRepository.save(pattern);
    }

    public List<PatternDto> searchPatterns(String rawQuery, String category, String difficulty, String materials, Long userId) {
        String tsQuery = null;
        if (rawQuery != null && !rawQuery.trim().isEmpty()) {
            tsQuery = SearchQueryHelper.toTsQuery(rawQuery);
            if (tsQuery.equals("''")) {
                tsQuery = null;
            }
        }
        List<Pattern> patterns = patternRepository.searchPublicPatterns(tsQuery, category, difficulty, materials);

        if (userId == null) {
            return patterns.stream().map(p -> toDto(p, null, false)).collect(Collectors.toList());
        } else {
            Set<Long> savedIds = userPatternRepository.findByUserId(userId)
                    .stream().map(up -> up.getPattern().getId()).collect(Collectors.toSet());
            return patterns.stream().map(p -> toDto(p, userId, savedIds.contains(p.getId()))).collect(Collectors.toList());
        }
    }

    public List<PatternDto> getPublicPatternsByUserId(Long authorId, Long currentUserId) {
        List<Pattern> patterns = patternRepository.findByIsPublicTrueAndUserId(authorId);
        Set<Long> savedPatternIds;
        if (currentUserId != null) {
            savedPatternIds = userPatternRepository.findByUserId(currentUserId)
                    .stream()
                    .map(up -> up.getPattern().getId())
                    .collect(Collectors.toSet());
        } else {
            savedPatternIds = new HashSet<>();
        }
        return patterns.stream()
                .map(p -> toDto(p, currentUserId, savedPatternIds.contains(p.getId())))
                .collect(Collectors.toList());
    }

    @Transactional
    public Pattern purchasePattern(Long patternId, Long userId) {
        Pattern pattern = patternRepository.findById(patternId)
                .orElseThrow(() -> new RuntimeException("Схема не найдена"));

        if (!Boolean.TRUE.equals(pattern.getIsPublic()))
            throw new RuntimeException("Схема не опубликована");

        if (pattern.getUserId().equals(userId))
            throw new RuntimeException("Нельзя купить свою собственную схему");

        Integer price = pattern.getPrice();
        if (price == null || price <= 0)
            throw new RuntimeException("Эта схема бесплатна, используйте сохранение");

        if (purchaseRepository.existsByUserIdAndPatternId(userId, patternId))
            throw new RuntimeException("Вы уже приобрели эту схему");

        Purchase purchase = new Purchase(userId, patternId, price);
        purchaseRepository.save(purchase);

        if (userPatternRepository.findByUserIdAndPatternId(userId, patternId).isEmpty()) {
            UserPattern up = new UserPattern();
            up.setUserId(userId);
            up.setPattern(pattern);
            up.setSavedDate(LocalDateTime.now());
            up.setNotes("");
            userPatternRepository.save(up);
        }

        return pattern;
    }

    public long countSaves(Long patternId) {
        return userPatternRepository.countByPatternId(patternId);
    }

    public long countPurchases(Long patternId) {
        return purchaseRepository.countByPatternId(patternId);
    }

}
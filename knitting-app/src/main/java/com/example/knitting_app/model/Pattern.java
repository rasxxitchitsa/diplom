package com.example.knitting_app.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "patterns")
public class Pattern {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    private String storedName;
    private LocalDateTime uploadDate;
    private String author;
    private Long userId;
    private Boolean isPublic;
    private Boolean isCatalogCopy = false;
    private String thumbnailPath;

    private String difficulty;
    private String materials;
    private String description;

    private Integer price;

    @ManyToOne
    @JoinColumn(name = "category_id")
    private Category category;

    public Pattern() {}

    public Pattern(String name, String storedName, String author, Category category, Long userId, Boolean isPublic) {
        this.name = name;
        this.storedName = storedName;
        this.author = author;
        this.category = category;
        this.userId = userId;
        this.isPublic = isPublic;
        this.uploadDate = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getStoredName() { return storedName; }
    public void setStoredName(String storedName) { this.storedName = storedName; }

    public LocalDateTime getUploadDate() { return uploadDate; }
    public void setUploadDate(LocalDateTime uploadDate) { this.uploadDate = uploadDate; }

    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Boolean getIsPublic() { return isPublic; }
    public void setIsPublic(Boolean isPublic) { this.isPublic = isPublic; }

    public Boolean getIsCatalogCopy() { return isCatalogCopy; }
    public void setIsCatalogCopy(Boolean isCatalogCopy) { this.isCatalogCopy = isCatalogCopy; }

    public String getThumbnailPath() { return thumbnailPath; }
    public void setThumbnailPath(String thumbnailPath) { this.thumbnailPath = thumbnailPath; }

    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }

    public String getMaterials() { return materials; }
    public void setMaterials(String materials) { this.materials = materials; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Integer getPrice() { return price; }
    public void setPrice(Integer price) { this.price = price; }

    public Category getCategory() {
        return category;
    }
    public void setCategory(Category category) {
        this.category = category;
    }
}
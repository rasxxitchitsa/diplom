package com.example.knitting_app.dto;

import java.time.LocalDateTime;

public class PatternDto {
    private Long id;
    private String name;
    private String author;
    private Long categoryId;
    private String categoryName;
    private String thumbnailPath;
    private String description;
    private String difficulty;
    private String materials;
    private LocalDateTime uploadDate;

    private boolean isPublic;
    private boolean isOwn;
    private boolean isSaved;
    private Long userId;
    private boolean catalogCopy;


    private String notes;

    private Integer price;
    private boolean purchased;
    private Integer purchaseCount;

    public PatternDto() {
    }

    public PatternDto(Long id, String name, String author, String thumbnailPath,
                      String description, String difficulty, String materials,
                      LocalDateTime uploadDate,
                      boolean isPublic, boolean isOwn, boolean isSaved) {
        this.id = id;
        this.name = name;
        this.author = author;
        this.thumbnailPath = thumbnailPath;
        this.description = description;
        this.difficulty = difficulty;
        this.materials = materials;
        this.uploadDate = uploadDate;
        this.isPublic = isPublic;
        this.isOwn = isOwn;
        this.isSaved = isSaved;
    }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }

    public String getThumbnailPath() { return thumbnailPath; }
    public void setThumbnailPath(String thumbnailPath) { this.thumbnailPath = thumbnailPath; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }

    public String getMaterials() { return materials; }
    public void setMaterials(String materials) { this.materials = materials; }

    public LocalDateTime getUploadDate() { return uploadDate; }
    public void setUploadDate(LocalDateTime uploadDate) { this.uploadDate = uploadDate; }

    public boolean isPublic() { return isPublic; }
    public void setPublic(boolean isPublic) { this.isPublic = isPublic; }

    public boolean isOwn() { return isOwn; }
    public void setOwn(boolean own) { isOwn = own; }

    public boolean isSaved() { return isSaved; }
    public void setSaved(boolean saved) { isSaved = saved; }

    public Integer getPrice() { return price; }
    public void setPrice(Integer price) { this.price = price; }
    public boolean isPurchased() { return purchased; }
    public void setPurchased(boolean purchased) { this.purchased = purchased; }

    public Integer getPurchaseCount() {
        return purchaseCount;
    }
    public void setPurchaseCount(Integer purchaseCount) {
        this.purchaseCount = purchaseCount;
    }

    public boolean isCatalogCopy() {
        return catalogCopy;
    }
    public void setCatalogCopy(boolean catalogCopy) {
        this.catalogCopy = catalogCopy;
    }

    public Long getCategoryId() {
        return categoryId;
    }
    public void setCategoryId(Long categoryId) {
        this.categoryId = categoryId;
    }
    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public String getNotes() {
        return notes;
    }
    public void setNotes(String notes) {
        this.notes = notes;
    }
}
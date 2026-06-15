package com.example.knitting_app.dto;

import java.time.LocalDateTime;

public class PurchaseDto {
    private Long id;
    private Long patternId;
    private String patternName;
    private String patternThumbnail;
    private Integer price;
    private LocalDateTime purchaseDate;

    public PurchaseDto() {}
    public PurchaseDto(Long id, Long patternId, String patternName, String patternThumbnail, Integer price, LocalDateTime purchaseDate) {
        this.id = id;
        this.patternId = patternId;
        this.patternName = patternName;
        this.patternThumbnail = patternThumbnail;
        this.price = price;
        this.purchaseDate = purchaseDate;
    }

    public Long getId() {
        return id;
    }
    public void setId(Long id) {
        this.id = id;
    }
    public Long getPatternId() {
        return patternId;
    }
    public void setPatternId(Long patternId) {
        this.patternId = patternId;
    }
    public Integer getPrice() {
        return price;
    }
    public void setPrice(Integer price) {
        this.price = price;
    }
    public LocalDateTime getPurchaseDate() {
        return purchaseDate;
    }
    public void setPurchaseDate(LocalDateTime purchaseDate) {
        this.purchaseDate = purchaseDate;
    }
    public String getPatternName() {
        return patternName;
    }
    public void setPatternName(String patternName) {
        this.patternName = patternName;
    }
    public String getPatternThumbnail() {
        return patternThumbnail;
    }
    public void setPatternThumbnail(String patternThumbnail) {
        this.patternThumbnail = patternThumbnail;
    }
}
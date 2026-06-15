package com.example.knitting_app.dto;

import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;

public class YarnDto {
    private Long id;
    private String name;
    private String brand;
    private Double weight;
    private Double length;
    private String composition;
    private String gauge;
    private String hookSize;
    private String needleSize;
    private String country;
    private String imagePath;
    private boolean isPublic;
    private LocalDateTime uploadDate;
    private Long userId;
    private Integer stitches;
    private Integer rows;
    private boolean favorite;
    private MultipartFile imageFile;

    public YarnDto() {}

    public YarnDto(Long id, String name, String brand, Double weight, Double length, String composition,
                   String gauge, String hookSize, String needleSize, String country, String imagePath,
                   boolean isPublic, LocalDateTime uploadDate, Long userId, Integer stitches, Integer rows, boolean favorite) {
        this.id = id;
        this.name = name;
        this.brand = brand;
        this.weight = weight;
        this.length = length;
        this.composition = composition;
        this.gauge = gauge;
        this.hookSize = hookSize;
        this.needleSize = needleSize;
        this.country = country;
        this.imagePath = imagePath;
        this.isPublic = isPublic;
        this.uploadDate = uploadDate;
        this.userId = userId;
        this.stitches = stitches;
        this.rows = rows;
    }

    public boolean isFavorite() {
        return favorite;
    }

    public void setFavorite(boolean favorite) {
        this.favorite = favorite;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getBrand() {
        return brand;
    }

    public Double getWeight() {
        return weight;
    }

    public Double getLength() {
        return length;
    }

    public String getComposition() {
        return composition;
    }

    public String getGauge() {
        return gauge;
    }

    public String getHookSize() {
        return hookSize;
    }

    public String getNeedleSize() {
        return needleSize;
    }

    public String getCountry() {
        return country;
    }

    public String getImagePath() {
        return imagePath;
    }

    public boolean isPublic() {
        return isPublic;
    }

    public LocalDateTime getUploadDate() {
        return uploadDate;
    }

    public Long getUserId() {
        return userId;
    }

    public Integer getStitches() {
        return stitches;
    }

    public Integer getRows() {
        return rows;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setBrand(String brand) {
        this.brand = brand;
    }

    public void setWeight(Double weight) {
        this.weight = weight;
    }

    public void setLength(Double length) {
        this.length = length;
    }

    public void setComposition(String composition) {
        this.composition = composition;
    }

    public void setGauge(String gauge) {
        this.gauge = gauge;
    }

    public void setHookSize(String hookSize) {
        this.hookSize = hookSize;
    }

    public void setNeedleSize(String needleSize) {
        this.needleSize = needleSize;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public void setImagePath(String imagePath) {
        this.imagePath = imagePath;
    }

    public void setPublic(boolean aPublic) {
        isPublic = aPublic;
    }

    public void setUploadDate(LocalDateTime uploadDate) {
        this.uploadDate = uploadDate;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public void setStitches(Integer stitches) {
        this.stitches = stitches;
    }

    public void setRows(Integer rows) {
        this.rows = rows;
    }

    public MultipartFile getImageFile() {
        return imageFile;
    }
    public void setImageFile(MultipartFile imageFile) {
        this.imageFile = imageFile;
    }
}
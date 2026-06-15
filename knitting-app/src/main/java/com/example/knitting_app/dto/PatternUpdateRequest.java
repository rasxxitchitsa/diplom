package com.example.knitting_app.dto;

public class PatternUpdateRequest {
    private String name;
    private String author;
    private String category;
    private String difficulty;
    private String materials;
    private String description;
    private Integer price;

    public Integer getPrice() { return price; }
    public void setPrice(Integer price) { this.price = price; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }

    public String getMaterials() { return materials; }
    public void setMaterials(String materials) { this.materials = materials; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
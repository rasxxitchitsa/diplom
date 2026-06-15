package com.example.knitting_app.model;

import jakarta.persistence.*;

@Entity
@Table(name = "yarns")
public class Yarn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;
    private String brand;
    private Double weight;
    private Double length;
    private String composition;
    private String hookSize;
    private String needleSize;
    private String country;
    private Integer stitches;
    private Integer rows;
    private String imagePath;

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

    public String getHookSize() {
        return hookSize;
    }

    public String getNeedleSize() {
        return needleSize;
    }

    public String getCountry() {
        return country;
    }

    public Integer getStitches() {
        return stitches;
    }

    public Integer getRows() {
        return rows;
    }

    public String getImagePath() {
        return imagePath;
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


    public void setHookSize(String hookSize) {
        this.hookSize = hookSize;
    }

    public void setNeedleSize(String needleSize) {
        this.needleSize = needleSize;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public void setStitches(Integer stitches) {
        this.stitches = stitches;
    }

    public void setRows(Integer rows) {
        this.rows = rows;
    }

    public void setImagePath(String imagePath) {
        this.imagePath = imagePath;
    }

}
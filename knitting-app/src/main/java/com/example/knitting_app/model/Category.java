package com.example.knitting_app.model;

import jakarta.persistence.*;

import java.util.List;

@Entity
@Table(name = "categories")
public class Category {
    @OneToMany(mappedBy = "category")
    private List<Pattern> patterns;
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true)
    private String name;
    @Enumerated(EnumType.STRING)
    private CategoryType type;


    public Category() {    }

     public Category(String name, CategoryType type) {
        this.name = name;
        this.type = type;
     }

     public Long getId() {
        return id;
     }
     public void setId(Long id) {
        this.id = id;
     }
     public String getName() {
        return name;
     }
     public void setName(String name) {
        this.name = name;
     }
     public CategoryType getType() {
        return type;
     }
     public void setType(CategoryType type) {
        this.type = type;
     }
}
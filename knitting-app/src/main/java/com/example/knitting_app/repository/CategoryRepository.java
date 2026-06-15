package com.example.knitting_app.repository;

import com.example.knitting_app.model.Category;
import com.example.knitting_app.model.CategoryType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    boolean existsByNameAndType(String name, CategoryType type);
    Optional<Category> findByName(String name);
    Optional<Category> findByNameAndType(String name, CategoryType type);
}
package com.example.knitting_app.repository;

import com.example.knitting_app.model.Pattern;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Pageable;
import java.util.List;

@Repository
public interface PatternRepository extends JpaRepository<Pattern, Long> {
    List<Pattern> findByUserId(Long userId);
    List<Pattern> findByIsPublicTrue();

    @Query("SELECT p FROM Pattern p WHERE p.isPublic = true AND (LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(p.category.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(p.author) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    List<Pattern> searchPublicPatterns(@Param("keyword") String keyword);

    @Query(value = "SELECT * FROM patterns p WHERE p.is_public = true AND p.search_vector @@ to_tsquery('russian', :tsquery)", nativeQuery = true)
    List<Pattern> searchPublicPatternsFullText(@Param("tsquery") String tsquery);

    @Query(value = "SELECT p.* FROM patterns p " +
            "LEFT JOIN categories c ON p.category_id = c.id " +
            "WHERE p.is_public = true " +
            "AND (:tsQuery IS NULL OR to_tsvector('russian', " +
            "COALESCE(p.name,'') || ' ' || COALESCE(p.author,'') || ' ' || COALESCE(p.description,'') || ' ' || COALESCE(c.name,'')) " +
            "@@ to_tsquery('russian', :tsQuery)) " +
            "AND (:category IS NULL OR c.name = :category) " +
            "AND (:difficulty IS NULL OR p.difficulty = :difficulty) " +
            "AND (:materials IS NULL OR p.materials = :materials) " +
            "ORDER BY p.upload_date DESC", nativeQuery = true)
    List<Pattern> searchPublicPatterns(@Param("tsQuery") String tsQuery,
                                       @Param("category") String category,
                                       @Param("difficulty") String difficulty,
                                       @Param("materials") String materials);

    List<Pattern> findByIsPublicTrueAndUserId(Long userId);

    @Query("SELECT p FROM Pattern p WHERE p.isPublic = true AND " +
            "(LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(p.description) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(p.category.name) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Pattern> searchPublicPatterns(@Param("query") String query, Pageable pageable);

    @Query(value = """
    SELECT * FROM patterns
    WHERE is_public = true
      AND search_vector @@ to_tsquery('russian', :tsquery)
    ORDER BY ts_rank(search_vector, to_tsquery('russian', :tsquery)) DESC
    LIMIT :limit
    """, nativeQuery = true)
    List<Pattern> fullTextSearch(@Param("tsquery") String tsquery, @Param("limit") int limit);

    @Query(value = """
    SELECT p.* FROM patterns p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_public = true
      AND (p.name % :query OR p.description % :query OR c.name % :query)
    ORDER BY GREATEST(
        similarity(p.name, :query),
        similarity(p.description, :query),
        similarity(c.name, :query)
    ) DESC
    LIMIT :limit
    """, nativeQuery = true)
    List<Pattern> trigramSearch(@Param("query") String query, @Param("limit") int limit);

    @Query("SELECT p.userId, COUNT(p) FROM Pattern p WHERE p.isPublic = true GROUP BY p.userId ORDER BY COUNT(p) DESC")
    List<Object[]> countPatternsPerUser();

    @Query("SELECT p FROM Pattern p WHERE p.isPublic = true AND p.category.name = :categoryName")
    List<Pattern> findByIsPublicTrueAndCategoryName(@Param("categoryName") String categoryName);

    @Query("SELECT COUNT(p) > 0 FROM Pattern p WHERE p.category.name = :categoryName")
    boolean existsByCategoryName(@Param("categoryName") String categoryName);

    long countByPriceIsNotNull();
}
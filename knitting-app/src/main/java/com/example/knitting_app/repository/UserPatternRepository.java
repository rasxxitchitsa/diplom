package com.example.knitting_app.repository;

import com.example.knitting_app.model.UserPattern;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface UserPatternRepository extends JpaRepository<UserPattern, Long> {

    Optional<UserPattern> findByUserIdAndPatternId(Long userId, Long patternId);

    List<UserPattern> findByUserId(Long userId);

    List<UserPattern> findByPatternId(Long patternId);

    long countByPatternId(Long patternId);

    @Query("SELECT up.pattern.id FROM UserPattern up WHERE up.userId = :userId")
    List<Long> findPatternIdsByUserId(@Param("userId") Long userId);

    @Transactional
    @Modifying
    @Query("DELETE FROM UserPattern up WHERE up.userId = :userId AND up.pattern.id = :patternId")
    void deleteByUserIdAndPatternId(@Param("userId") Long userId, @Param("patternId") Long patternId);

    @Query("SELECT up.pattern.id, COUNT(up) FROM UserPattern up GROUP BY up.pattern.id ORDER BY COUNT(up) DESC")
    List<Object[]> countSavesPerPattern();

    @Modifying
    @Transactional
    @Query("DELETE FROM UserPattern up WHERE up.pattern.id = :patternId")
    void deleteByPatternId(@Param("patternId") Long patternId);

    @Modifying
    @Transactional
    @Query("DELETE FROM UserPattern up WHERE up.userId = :userId")
    void deleteByUserId(@Param("userId") Long userId);

}
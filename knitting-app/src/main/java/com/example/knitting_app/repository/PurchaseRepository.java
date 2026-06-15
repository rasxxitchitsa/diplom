package com.example.knitting_app.repository;

import com.example.knitting_app.model.Purchase;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PurchaseRepository extends JpaRepository<Purchase, Long> {
    Optional<Purchase> findByUserIdAndPatternId(Long userId, Long patternId);
    boolean existsByUserIdAndPatternId(Long userId, Long patternId);
    long countByPatternId(Long patternId);
    List<Purchase> findByUserIdOrderByPurchaseDateDesc(Long userId);
    List<Purchase> findByPatternId(Long patternId);
    void deleteByPatternId(Long patternId);
    List<Purchase> findByUserId(Long userId);


}
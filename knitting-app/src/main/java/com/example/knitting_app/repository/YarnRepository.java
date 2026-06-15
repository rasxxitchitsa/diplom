package com.example.knitting_app.repository;

import com.example.knitting_app.model.Yarn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

@Repository
public interface YarnRepository extends JpaRepository<Yarn, Long> {
    @Query("SELECT y FROM Yarn y WHERE (:query IS NULL OR y.name ILIKE CONCAT('%', :query, '%') " +
            "OR y.brand ILIKE CONCAT('%', :query, '%') " +
            "OR y.composition ILIKE CONCAT('%', :query, '%')) " +
            "AND (:brand IS NULL OR y.brand ILIKE CAST(:brand AS text)) " +
            "AND (:composition IS NULL OR y.composition ILIKE CONCAT('%', CAST(:composition AS text), '%')) " +
            "AND (:country IS NULL OR y.country ILIKE CAST(:country AS text)) " +
            "AND (:hookSize IS NULL OR y.hookSize ILIKE CAST(:hookSize AS text)) " +
            "AND (:needleSize IS NULL OR y.needleSize ILIKE CAST(:needleSize AS text)) " +
            "AND (:weightFrom IS NULL OR y.weight >= :weightFrom) " +
            "AND (:weightTo IS NULL OR y.weight <= :weightTo) " +
            "AND (:lengthFrom IS NULL OR y.length >= :lengthFrom) " +
            "AND (:lengthTo IS NULL OR y.length <= :lengthTo)")
    List<Yarn> searchYarns(@Param("query") String query,
                           @Param("brand") String brand,
                           @Param("composition") String composition,
                           @Param("country") String country,
                           @Param("hookSize") String hookSize,
                           @Param("needleSize") String needleSize,
                           @Param("weightFrom") Double weightFrom,
                           @Param("weightTo") Double weightTo,
                           @Param("lengthFrom") Double lengthFrom,
                           @Param("lengthTo") Double lengthTo);


}
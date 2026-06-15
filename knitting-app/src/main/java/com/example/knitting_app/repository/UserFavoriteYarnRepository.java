package com.example.knitting_app.repository;

import com.example.knitting_app.model.UserYarn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface UserFavoriteYarnRepository extends JpaRepository<UserYarn, Long> {
    List<UserYarn> findByUserId(Long userId);
    boolean existsByUserIdAndYarnId(Long userId, Long yarnId);
    void deleteByUserIdAndYarnId(Long userId, Long yarnId);

    @Query("SELECT uy.yarnId, COUNT(uy) FROM UserYarn uy GROUP BY uy.yarnId ORDER BY COUNT(uy) DESC")
    List<Object[]> countFavoritesPerYarn();

    List<UserYarn> findByYarnId(Long yarnId);
}
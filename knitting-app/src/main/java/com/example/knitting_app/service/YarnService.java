package com.example.knitting_app.service;

import com.example.knitting_app.dto.YarnDto;
import com.example.knitting_app.model.UserYarn;
import com.example.knitting_app.model.Yarn;
import com.example.knitting_app.repository.UserFavoriteYarnRepository;
import com.example.knitting_app.repository.YarnRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class YarnService {

    @Value("${upload.yarn.path:uploads/yarns}")
    private String uploadPath;

    private final YarnRepository yarnRepository;
    private final UserFavoriteYarnRepository favoriteRepository;

    public YarnService(YarnRepository yarnRepository,
                       UserFavoriteYarnRepository favoriteRepository) {
        this.yarnRepository = yarnRepository;
        this.favoriteRepository = favoriteRepository;
    }

    public YarnDto toDto(Yarn yarn) {
        YarnDto dto = new YarnDto();
        dto.setId(yarn.getId());
        dto.setName(yarn.getName());
        dto.setBrand(yarn.getBrand());
        dto.setWeight(yarn.getWeight());
        dto.setLength(yarn.getLength());
        dto.setComposition(yarn.getComposition());
        dto.setHookSize(yarn.getHookSize());
        dto.setNeedleSize(yarn.getNeedleSize());
        dto.setCountry(yarn.getCountry());
        dto.setImagePath(yarn.getImagePath());
        dto.setStitches(yarn.getStitches());
        dto.setRows(yarn.getRows());
        return dto;
    }
    public List<YarnDto> getAllPublicYarns(Long userId) {
        List<Yarn> yarns = yarnRepository.findAll();

        Set<Long> favoriteIds;
        if (userId != null) {
            favoriteIds = favoriteRepository.findByUserId(userId).stream()
                    .map(UserYarn::getYarnId)
                    .collect(Collectors.toSet());
        } else {
            favoriteIds = new HashSet<>();
        }

        return yarns.stream()
                .map(yarn -> {
                    YarnDto dto = toDto(yarn);
                    dto.setFavorite(favoriteIds.contains(yarn.getId()));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public YarnDto getYarnById(Long yarnId, Long userId) {
        Yarn yarn = yarnRepository.findById(yarnId)
                .orElseThrow(() -> new RuntimeException("Пряжа не найдена"));
        YarnDto dto = toDto(yarn);
        if (userId != null) {
            dto.setFavorite(favoriteRepository.existsByUserIdAndYarnId(userId, yarnId));
        }
        return dto;
    }

    public List<YarnDto> searchYarns(String query, String brand, String composition,
                                     String country, String hookSize, String needleSize,
                                     Double weightFrom, Double weightTo,
                                     Double lengthFrom, Double lengthTo) {
        List<Yarn> yarns = yarnRepository.searchYarns(query, brand, composition,
                country, hookSize, needleSize, weightFrom, weightTo, lengthFrom, lengthTo);
        return yarns.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public void addToFavorites(Long userId, Long yarnId) {
        Yarn yarn = yarnRepository.findById(yarnId)
                .orElseThrow(() -> new RuntimeException("Пряжа не найдена"));
        if (!favoriteRepository.existsByUserIdAndYarnId(userId, yarnId)) {
            UserYarn uy = new UserYarn();
            uy.setUserId(userId);
            uy.setYarnId(yarnId);
            uy.setAddedDate(LocalDateTime.now());
            favoriteRepository.save(uy);
        }
    }

    @Transactional
    public void removeFromFavorites(Long userId, Long yarnId) {
        favoriteRepository.deleteByUserIdAndYarnId(userId, yarnId);
    }

    public List<YarnDto> getFavoriteYarns(Long userId) {
        List<UserYarn> favorites = favoriteRepository.findByUserId(userId);
        if (favorites.isEmpty()) return Collections.emptyList();
        List<Long> yarnIds = favorites.stream()
                .map(UserYarn::getYarnId)
                .collect(Collectors.toList());
        List<Yarn> yarns = yarnRepository.findAllById(yarnIds);
        Map<Long, Yarn> yarnMap = yarns.stream().collect(Collectors.toMap(Yarn::getId, y -> y));
        return yarnIds.stream()
                .map(yarnMap::get)
                .filter(Objects::nonNull)
                .map(yarn -> {
                    YarnDto dto = toDto(yarn);
                    dto.setFavorite(true);
                    return dto;
                })
                .collect(Collectors.toList());
    }
}
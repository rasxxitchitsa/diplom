package com.example.knitting_app.service;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

public class SearchQueryHelper {

    private static final List<String> STOP_WORDS = List.of(
            "найди", "покажи", "схема", "схему", "схемы", "и", "в", "на", "для", "с", "без", "через", "по"
    );

    public static String toTsQuery(String rawQuery) {
        String lower = rawQuery.toLowerCase();
        String cleaned = lower.replaceAll("[^а-яa-z0-9\\s]", " ");
        String[] words = cleaned.trim().split("\\s+");
        List<String> keywords = Arrays.stream(words)
                .filter(w -> w.length() > 2)
                .filter(w -> !STOP_WORDS.contains(w))
                .toList();

        if (keywords.isEmpty()) {
            return "''";
        }

        return keywords.stream()
                .map(word -> word + ":*")
                .collect(Collectors.joining(" & "));
    }
}
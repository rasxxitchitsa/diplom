package com.example.knitting_app.dto;

import java.util.List;

public class AIPatternRecommendation {
    private String message;
    private List<Long> patternIds;


    public AIPatternRecommendation(String message, List<Long> patternIds) {
        this.message = message;
        this.patternIds = patternIds;
    }

    public String getMessage() {
        return message;
    }
    public List<Long> getPatternIds() {
        return patternIds;
    }
    public void setPatternIds(List<Long> patternIds) {
        this.patternIds = patternIds;
    }
    public void setMessage(String message) {
        this.message = message;
    }
}
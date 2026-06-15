package com.example.knitting_app.dto;

import java.util.List;

public class AiChatResponse {
    private String type;
    private String message;
    private List<Long> patternIds;
    private List<Long> yarnIds;

    public AiChatResponse() {}

    public AiChatResponse(String type, String message, List<Long> patternIds, List<Long> yarnIds) {
        this.type = type;
        this.message = message;
        this.patternIds = patternIds;
        this.yarnIds = yarnIds;
    }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public List<Long> getPatternIds() { return patternIds; }
    public void setPatternIds(List<Long> patternIds) { this.patternIds = patternIds; }
    public List<Long> getYarnIds() { return yarnIds; }
    public void setYarnIds(List<Long> yarnIds) { this.yarnIds = yarnIds; }
}
package com.example.knitting_app.controller;

import com.example.knitting_app.dto.AIPatternRecommendation;
import com.example.knitting_app.dto.AiChatResponse;
import com.example.knitting_app.service.AiAssistantService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiAssistantController {

    private final AiAssistantService aiService;

    public AiAssistantController(AiAssistantService aiService) {
        this.aiService = aiService;
    }

    @PostMapping("/chat")
    public AiChatResponse chat(@RequestBody Map<String, Object> body) {
        System.out.println("DEBUG /chat body: " + body);

        String userMessage = "";
        for (Object value : body.values()) {
            if (value instanceof String && !((String) value).isBlank()) {
                userMessage = (String) value;
                break;
            }
        }

        System.out.println("DEBUG extracted message: '" + userMessage + "'");
        return aiService.processUserMessage(userMessage);
    }

    @PostMapping("/ask")
    public String ask(@RequestBody AskRequest request) {
        return aiService.ask(request.message());
    }

    @PostMapping(value = "/ask-stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> askStream(@RequestBody AskRequest request) {
        return aiService.askStream(request.message());
    }

    @PostMapping("/yarn-alternatives")
    public String yarnAlternatives(@RequestBody YarnRequest request) {
        return aiService.findYarnAlternatives(request.yarnName());
    }

    @PostMapping("/select-yarn")
    public String selectYarn(@RequestBody SelectYarnRequest request) {
        return aiService.selectYarnForProject(request.projectDescription());
    }

    @PostMapping("/explain-term")
    public String explainTerm(@RequestBody TermRequest request) {
        return aiService.explainKnittingTerm(request.term());
    }

    @PostMapping("/translate-pattern")
    public String translatePattern(@RequestBody TranslateRequest request) {
        return aiService.translateKnittingPattern(request.foreignText(),
                request.sourceLang(), request.targetLang());
    }

    @PostMapping("/recommend-patterns-v2")
    public AIPatternRecommendation recommendPatternsV2(@RequestBody RecommendRequest request) {
        System.out.println("DEBUG: request.userQuestion() = '" + request.userQuestion() + "'");
        String userMessage = request.userQuestion();
        if (userMessage == null || userMessage.isBlank()) {
            System.out.println("DEBUG: userMessage is null or blank, trying to read raw body...");
        }
        AiChatResponse response = aiService.processUserMessage(userMessage != null ? userMessage : "");
        return new AIPatternRecommendation(response.getMessage(),
                response.getPatternIds() != null ? response.getPatternIds() : List.of());
    }

    record AskRequest(String message) {}
    record YarnRequest(String yarnName) {}
    record SelectYarnRequest(String projectDescription) {}
    record TermRequest(String term) {}
    record TranslateRequest(String foreignText, String sourceLang, String targetLang) {}
    record RecommendRequest(String userQuestion) {}
}
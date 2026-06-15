package com.example.knitting_app.service;

import com.example.knitting_app.dto.AIPatternRecommendation;
import com.example.knitting_app.dto.AiChatResponse;
import com.example.knitting_app.model.Pattern;
import com.example.knitting_app.model.Yarn;
import com.example.knitting_app.repository.PatternRepository;
import com.example.knitting_app.repository.YarnRepository;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import java.util.LinkedHashSet;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AiAssistantService {

    private final ChatClient chatClient;
    private final PatternRepository patternRepository;
    private final YarnRepository yarnRepository;
    private static final Logger log = LoggerFactory.getLogger(AiAssistantService.class);

    public AiAssistantService(ChatClient.Builder chatClientBuilder,
                              PatternRepository patternRepository,
                              YarnRepository yarnRepository) {
        this.chatClient = chatClientBuilder.build();
        this.patternRepository = patternRepository;
        this.yarnRepository = yarnRepository;
    }

    public AiChatResponse processUserMessage(String userMessage) {
        if (userMessage == null || userMessage.isBlank()) {
            return new AiChatResponse("text", "Пожалуйста, напишите ваш вопрос.", null, null);
        }
        userMessage = userMessage.trim();
        String lower = userMessage.toLowerCase();

        if (!isKnittingRelated(userMessage)) {
            return new AiChatResponse("text",
                    "🧶 Я отвечаю только на вопросы, связанные с вязанием. Пожалуйста, задайте вопрос о схемах, пряже, техниках вязания, терминах и т.д.",
                    null, null);
        }

        if (lower.contains("аналог пряжи") || lower.contains("заменить пряжу") || lower.contains("чем заменить") || lower.matches(".*аналог.*пряж.*")) {
            return findYarnAlternativesWithDb(userMessage);
        }

        if (lower.contains("подобрать пряжу для") || lower.contains("какую пряжу взять для")) {
            String answer = selectYarnForProject(userMessage);
            return new AiChatResponse("yarnSelection", answer, null, null);
        }

        if (lower.contains("что значит") || lower.contains("объясни термин") || lower.contains("что такое")) {
            String term = extractTerm(userMessage);
            String answer = explainKnittingTerm(term);
            return new AiChatResponse("termExplanation", answer, null, null);
        }

        if (lower.contains("переведи схему")) {
            String foreignText = userMessage.replaceAll("(?i)переведи схему", "").trim();
            String answer = translateKnittingPattern(foreignText, "english", "russian");
            return new AiChatResponse("translation", answer, null, null);
        }

        if (isGeneralQuestion(lower)) {
            String answer = ask(userMessage);
            return new AiChatResponse("text", answer, null, null);
        }

        if (lower.contains("схем") && (lower.contains("найди") || lower.contains("покажи") || lower.contains("рекомендуй"))) {
            AIPatternRecommendation rec = recommendPatterns(userMessage);
            return new AiChatResponse("patternRecommendations", rec.getMessage(), rec.getPatternIds(), null);
        }

        String answer = ask(userMessage);
        return new AiChatResponse("text", answer, null, null);
    }

    private boolean isKnittingRelated(String message) {
        String lower = message.toLowerCase();
        String[] keywords = {
                "вязан", "схем", "пряж", "спиц", "крючк", "петл", "узор", "модель",
                "свитер", "шапк", "шарф", "игрушк", "плед", "салфетк", "жаккард",
                "реглан", "накид", "убавк", "прибавк", "лицевая", "изнаночная",
                "кромочная", "платочная", "чулочная", "резинк", "кос", "жгут", "раппорт",
                "аналог пряжи", "подобрать пряжу", "переведи схему", "что значит",
                "объясни термин", "рекомендуй схему", "найди схему",
                "шерсть", "меринос", "хлопок", "акрил", "заменить", "аналог", "замена"
        };
        for (String kw : keywords) {
            if (lower.contains(kw)) return true;
        }
        if (lower.matches("^(как|что|почему|зачем|где|когда|можно ли|нужно ли|сложно ли|сколько).*")) {
            String[] words = lower.split("\\s+");
            return words.length >= 4;
        }
        return false;
    }

    private List<String> expandQueryWithAI(String userQuery) {
        String prompt = """
        Ты — помощник по вязанию. Пользователь ищет схемы вязания по запросу: "%s".
        Сгенерируй 5–10 ключевых слов и фраз (синонимы, связанные понятия, обобщения), которые помогут найти подходящие схемы.
        Верни ТОЛЬКО список слов/фраз через запятую, без пояснений, без нумерации.
        Например, для запроса "котят" ответ: "котенок, кошка, котик, животные, игрушки, амигуруми, зверюшки".
        """.formatted(userQuery);

        try {
            String response = chatClient.prompt()
                    .system("Ты генерируешь поисковые термины для вязания. Отвечай только списком через запятую.")
                    .user(prompt)
                    .call()
                    .content();

            String clean = response.replaceAll("[^\\p{L}\\p{N}, ]", "").trim();
            List<String> terms = Arrays.stream(clean.split("\\s*,\\s*"))
                    .map(String::trim)
                    .filter(t -> t.length() > 1)
                    .collect(Collectors.toList());

            if (!terms.contains(userQuery.toLowerCase())) {
                terms.add(0, userQuery.toLowerCase());
            }
            return terms;
        } catch (Exception e) {
            log.error("AI expansion failed", e);
            return extractKeyTerms(userQuery);
        }
    }

    private List<String> extractKeyTerms(String query) {
        String cleaned = query.toLowerCase()
                .replaceAll("[^а-яa-z0-9\\s]", "")
                .trim();
        String[] words = cleaned.split("\\s+");
        return Arrays.stream(words)
                .filter(w -> w.length() >= 3 && !isStopWord(w))
                .collect(Collectors.toList());
    }

    private boolean isGeneralQuestion(String lower) {
        return lower.startsWith("как") || lower.startsWith("что") || lower.startsWith("почему") ||
                lower.startsWith("зачем") || lower.startsWith("где") || lower.startsWith("когда") ||
                lower.startsWith("можно ли") || lower.startsWith("нужно ли") || lower.startsWith("сложно ли") ||
                lower.startsWith("сколько");
    }

    private String extractTerm(String userMessage) {
        return userMessage.replaceAll("(?i)(что значит|объясни термин|что такое)\\s*", "").trim();
    }

    public String ask(String userMessage) {
        if (!isKnittingRelated(userMessage)) {
            return "🧶 Я отвечаю только на вопросы, связанные с вязанием.";
        }
        return chatClient.prompt().user(userMessage).call().content();
    }

    public Flux<String> askStream(String userMessage) {
        return chatClient.prompt().user(userMessage).stream().content();
    }

    public String findYarnAlternatives(String yarnName) {
        String prompt = """
            Ты — эксперт по вязанию. Найди аналоги для пряжи "%s".
            Ответ дай в виде маркированного списка. Для каждого аналога укажи производителя, 
            состав, толщину и почему он подходит вместо оригинальной пряжи.
            """.formatted(yarnName);
        return ask(prompt);
    }

    public String selectYarnForProject(String projectDescription) {
        return chatClient.prompt()
                .system("Ты — консультант по вязанию. Давай рекомендации по выбору пряжи.")
                .user(projectDescription)
                .call().content();
    }

    public String explainKnittingTerm(String term) {
        return chatClient.prompt()
                .options(OpenAiChatOptions.builder().temperature(0.2).build())
                .user("Дай определение и инструкцию для термина: " + term)
                .call().content();
    }

    public String translateKnittingPattern(String foreignText, String sourceLang, String targetLang) {
        String glossary = "knit = лицевая петля\npurl = изнаночная\nyarn over = накид\ndecrease = убавка\nincrease = прибавка";
        return chatClient.prompt()
                .user("Переведи с %s на %s, используя терминологию:\n%s\nТекст: %s".formatted(sourceLang, targetLang, glossary, foreignText))
                .call().content();
    }

    public AIPatternRecommendation recommendPatterns(String userQuestion) {
        if (userQuestion == null || userQuestion.isBlank()) {
            return new AIPatternRecommendation("Пожалуйста, напишите ваш вопрос.", List.of());
        }
        if (!isKnittingRelated(userQuestion)) {
            return new AIPatternRecommendation("🧶 Я отвечаю только на вопросы по вязанию.", List.of());
        }

        List<String> searchTerms = expandQueryWithAI(userQuestion);
        System.out.println("AI expanded terms: " + searchTerms);

        Set<Pattern> uniquePatterns = new LinkedHashSet<>();
        for (String term : searchTerms) {
            if (term.isBlank()) continue;
            String tsQuery = buildTsQueryWithPrefix(term);
            List<Pattern> found = patternRepository.fullTextSearch(tsQuery, 5);
            uniquePatterns.addAll(found);

            if (uniquePatterns.size() < 10) {
                List<Pattern> trigramFound = patternRepository.trigramSearch(term, 5);
                uniquePatterns.addAll(trigramFound);
            }
        }

        if (uniquePatterns.isEmpty()) {
            String categoryGuess = guessCategoryFromQuery(userQuestion);
            if (categoryGuess != null) {
                List<Pattern> byCategory = patternRepository.findByIsPublicTrueAndCategoryName(categoryGuess);
                uniquePatterns.addAll(byCategory);
            }
        }

        List<Pattern> sorted = uniquePatterns.stream()
                .sorted((p1, p2) -> {
                    int score1 = relevanceScore(p1, userQuestion);
                    int score2 = relevanceScore(p2, userQuestion);
                    return Integer.compare(score2, score1);
                })
                .limit(8)
                .collect(Collectors.toList());

        if (sorted.isEmpty()) {
            return new AIPatternRecommendation(
                    "К сожалению, в базе данных нет схем по вашему запросу. Попробуйте изменить ключевые слова.",
                    List.of()
            );
        }

        StringBuilder context = new StringBuilder("Вот рекомендуемые схемы (от наиболее подходящих):\n");
        for (Pattern p : sorted) {
            context.append(String.format("- %s (автор: %s, категория: %s). %s\n",
                    p.getName(), p.getAuthor(),
                    p.getCategory() != null ? p.getCategory().getName() : "без категории",
                    p.getDescription() != null ? p.getDescription() : ""));
        }

        String systemPrompt = "Ты — консультант по схемам вязания. Из предложенного списка выбери 1-5 наиболее подходящих под запрос пользователя. Объясни, почему они подходят, и при необходимости предложи другие похожие идеи.";
        String aiResponse = chatClient.prompt()
                .system(systemPrompt)
                .user("Вопрос пользователя: " + userQuestion + "\n\n" + context.toString())
                .call()
                .content();

        List<Long> ids = sorted.stream().map(Pattern::getId).collect(Collectors.toList());
        return new AIPatternRecommendation(aiResponse, ids);
    }

    private String guessCategoryFromQuery(String query) {
        String lower = query.toLowerCase();
        if (lower.contains("игрушк") || lower.contains("амигуруми") ||
                lower.contains("кот") || lower.contains("собак") || lower.contains("лис") || lower.contains("зайц")) {
            return "Игрушки";
        }
        if (lower.contains("свитер") || lower.contains("шапк") || lower.contains("кофт") ||
                lower.contains("джемпер") || lower.contains("пуловер")) {
            return "Одежда";
        }
        if (lower.contains("шарф") || lower.contains("снуд") || lower.contains("сумк") ||
                lower.contains("чехол") || lower.contains("повязк")) {
            return "Аксессуары";
        }
        return null;
    }

    private int relevanceScore(Pattern pattern, String userQuestion) {
        String lowerQ = userQuestion.toLowerCase();
        String name = (pattern.getName() != null ? pattern.getName().toLowerCase() : "");
        String desc = (pattern.getDescription() != null ? pattern.getDescription().toLowerCase() : "");
        String category = (pattern.getCategory() != null && pattern.getCategory().getName() != null)
                ? pattern.getCategory().getName().toLowerCase() : "";

        int score = 0;
        String[] words = lowerQ.split("\\s+");
        for (String w : words) {
            if (w.length() > 2) {
                if (name.contains(w)) score += 10;
                if (desc.contains(w)) score += 3;
                if (category.contains(w)) score += 5;
            }
        }
        if (name.contains(lowerQ)) score += 15;
        if (desc.contains(lowerQ)) score += 5;
        return score;
    }

    private String buildTsQueryWithPrefix(String query) {
        if (query == null || query.isBlank()) return "";
        String[] words = query.toLowerCase().split("\\s+");
        return Arrays.stream(words)
                .filter(w -> w.length() > 1)
                .map(w -> w + ":*")
                .collect(Collectors.joining(" & "));
    }

    private String extractSearchKeywords(String userMessage) {
        String cleaned = userMessage.toLowerCase()
                .replaceAll("(?U)(найди|покажи|рекомендуй|предложи|подбери|схем[а-я]*|модель|описание|найти|поиск|схему|схемы|мне|вязания)\\s*", "")
                .replaceAll("[^а-яa-z0-9\\s]", "")
                .trim();
        String[] words = cleaned.split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String w : words) {
            if (w.length() >= 3 && !isStopWord(w)) {
                if (sb.length() > 0) sb.append(" ");
                sb.append(w);
            }
        }
        return sb.toString();
    }

    private boolean isStopWord(String word) {
        Set<String> stop = Set.of("как", "что", "это", "так", "все", "для", "без", "можно",
                "нужно", "будет", "если", "когда", "тогда", "также");
        return stop.contains(word);
    }

    private AiChatResponse findYarnAlternativesWithDb(String userMessage) {
        String yarnName = extractYarnNameFromQuery(userMessage);
        if (yarnName == null || yarnName.isBlank()) {
            String fallback = ask("Пользователь спрашивает: " + userMessage + ". Ответь как эксперт по подбору аналогов пряжи.");
            return new AiChatResponse("text", fallback, null, null);
        }

        YarnCharacteristics characteristics = getYarnCharacteristics(yarnName);
        List<Yarn> similarYarns = findSimilarYarns(characteristics);

        if (similarYarns.isEmpty()) {
            String answer = ask("Найди аналоги для пряжи " + yarnName + ". В базе данных нет подходящих вариантов, но ты можешь дать общие рекомендации.");
            return new AiChatResponse("text", answer, null, null);
        }

        String recommendation = buildRecommendationWithAI(yarnName, similarYarns);
        List<Long> yarnIds = similarYarns.stream().map(Yarn::getId).collect(Collectors.toList());
        return new AiChatResponse("yarnAlternatives", recommendation, null, yarnIds);
    }

    private String extractYarnNameFromQuery(String userMessage) {
        String lower = userMessage.toLowerCase();
        String removed = lower
                .replaceAll("^(найди|покажи|подбери|предложи)?\\s*(аналог|заменитель|заменить|чем заменить)\\s+(пряжи|пряжу)\\s*", "")
                .replaceAll("(аналог|заменитель)\\s+пряжи\\s*", "")
                .replaceAll("пряжу\\s*", "");
        removed = removed.replaceAll("\\b(для|и|с|со|без|через)\\b", "").trim();
        if (removed.isEmpty()) return null;
        return removed;
    }

    private static class YarnCharacteristics {
        String composition;
        Double metersPer100g;
        Integer stitches;
        Integer rows;
    }

    private YarnCharacteristics getYarnCharacteristics(String yarnName) {
        String cleanYarnName = chatClient.prompt()
                .user("Из фразы пользователя \"" + yarnName + "\" извлеки только название пряжи (без слов 'найди', 'аналог', 'пряжа' и т.п.). Ответь только одним словом или короткой фразой.")
                .call()
                .content()
                .trim();

        List<Yarn> found = yarnRepository.searchYarns(cleanYarnName, null, null, null, null, null, null, null, null, null);
        Yarn sample = found.isEmpty() ? null : found.get(0);
        if (sample != null) {
            YarnCharacteristics ch = new YarnCharacteristics();
            ch.composition = sample.getComposition();
            if (sample.getWeight() != null && sample.getLength() != null && sample.getWeight() > 0) {
                ch.metersPer100g = (sample.getLength() / sample.getWeight()) * 100;
            }
            ch.stitches = sample.getStitches();
            ch.rows = sample.getRows();
            return ch;
        } else {
            String prompt = """
            Ты – эксперт по пряже. Из названия пряжи "%s" определи характеристики:
            - состав
            - метраж на 100 грамм
            - плотность (петли и ряды на 10 см)
            Ответ дай JSON: {"composition": "...", "metersPer100g": число, "stitches": число, "rows": число}
            """.formatted(cleanYarnName);
            String jsonResponse = chatClient.prompt().user(prompt).call().content();
            return parseCharacteristicsFromJson(jsonResponse);
        }
    }

    private YarnCharacteristics parseCharacteristicsFromJson(String json) {
        YarnCharacteristics ch = new YarnCharacteristics();
        try {
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("\"composition\"\\s*:\\s*\"([^\"]*)\"").matcher(json);
            if (m.find()) ch.composition = m.group(1);
            m = java.util.regex.Pattern.compile("\"metersPer100g\"\\s*:\\s*(\\d+\\.?\\d*)").matcher(json);
            if (m.find()) ch.metersPer100g = Double.parseDouble(m.group(1));
            m = java.util.regex.Pattern.compile("\"stitches\"\\s*:\\s*(\\d+)").matcher(json);
            if (m.find()) ch.stitches = Integer.parseInt(m.group(1));
            m = java.util.regex.Pattern.compile("\"rows\"\\s*:\\s*(\\d+)").matcher(json);
            if (m.find()) ch.rows = Integer.parseInt(m.group(1));
        } catch (Exception e) {
            System.err.println("Ошибка парсинга JSON: " + e.getMessage());
        }
        return ch;
    }

    private List<Yarn> findSimilarYarns(YarnCharacteristics characteristics) {
        if (characteristics.composition == null || characteristics.composition.isBlank()) {
            return List.of();
        }
        String mainFiber = extractMainFibers(characteristics.composition);
        List<Yarn> candidates = yarnRepository.searchYarns(null, null, mainFiber, null, null, null, null, null, null, null);

        if (characteristics.metersPer100g != null) {
            candidates = candidates.stream()
                    .filter(y -> matchesMetersPer100g(y, characteristics.metersPer100g))
                    .collect(Collectors.toList());
        }

        return candidates.stream().limit(5).collect(Collectors.toList());
    }

    private String extractMainFibers(String composition) {
        String[] fibers = {"хлопок", "шерсть", "акрил", "полиамид", "лен", "вискоза", "меринос", "альпака", "кашемир"};
        String lower = composition.toLowerCase();
        for (String fiber : fibers) {
            if (lower.contains(fiber)) return fiber;
        }
        return composition.length() > 20 ? composition.substring(0, 20) : composition;
    }

    private boolean matchesMetersPer100g(Yarn yarn, Double targetMp100g) {
        if (targetMp100g == null || yarn.getWeight() == null || yarn.getLength() == null || yarn.getWeight() == 0)
            return true;
        double actual = (yarn.getLength() / yarn.getWeight()) * 100;
        double tolerance = 0.2;
        return actual >= targetMp100g * (1 - tolerance) && actual <= targetMp100g * (1 + tolerance);
    }

    private boolean matchesStitches(Yarn yarn, Integer targetStitches) {
        if (targetStitches == null || yarn.getStitches() == null) return true;
        return Math.abs(yarn.getStitches() - targetStitches) <= 3;
    }

    private boolean matchesRows(Yarn yarn, Integer targetRows) {
        if (targetRows == null || yarn.getRows() == null) return true;
        return Math.abs(yarn.getRows() - targetRows) <= 3;
    }

    private String buildRecommendationWithAI(String originalYarn, List<Yarn> analogs) {
        StringBuilder sb = new StringBuilder();
        sb.append("Пользователь ищет аналог пряжи \"").append(originalYarn).append("\".\n");
        sb.append("В базе данных найдены подходящие пряжи:\n");
        for (int i = 0; i < analogs.size(); i++) {
            Yarn y = analogs.get(i);
            sb.append(i + 1).append(". ").append(y.getBrand()).append(" ").append(y.getName())
                    .append(", состав: ").append(y.getComposition())
                    .append(", толщина: ").append(String.format("%.0f", (y.getLength() / y.getWeight()) * 100)).append("м/100г");
            if (y.getStitches() != null) sb.append(", плотность: ").append(y.getStitches()).append("п × ").append(y.getRows()).append("р");
            sb.append("\n");
        }
        sb.append("Объясни, почему эти пряжи подходят как аналоги, сравни с оригиналом.");
        return chatClient.prompt().user(sb.toString()).call().content();
    }
}
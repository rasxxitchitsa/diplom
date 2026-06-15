package com.example.knitting_app.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_patterns")
public class UserPattern {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pattern_id", nullable = false)
    private Pattern pattern;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "saved_date")
    private LocalDateTime savedDate;

    public UserPattern() {
    }

    public UserPattern(Long userId, Pattern pattern, String notes) {
        this.userId = userId;
        this.pattern = pattern;
        this.notes = notes;
    }

    public UserPattern(Long id, Long userId, Pattern pattern, String notes, LocalDateTime savedDate) {
        this.id = id;
        this.userId = userId;
        this.pattern = pattern;
        this.notes = notes;
        this.savedDate = savedDate;
    }


    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Pattern getPattern() { return pattern; }
    public void setPattern(Pattern pattern) { this.pattern = pattern; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LocalDateTime getSavedDate() { return savedDate; }
    public void setSavedDate(LocalDateTime savedDate) { this.savedDate = savedDate; }

}
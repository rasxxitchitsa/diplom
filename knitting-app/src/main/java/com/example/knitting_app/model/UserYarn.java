package com.example.knitting_app.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_yarns", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "yarn_id"})
})
public class UserYarn {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "yarn_id", nullable = false)
    private Long yarnId;

    @Column(name = "added_date")
    private LocalDateTime addedDate;

    public UserYarn() {
        this.userId = userId;
        this.yarnId = yarnId;
        this.addedDate = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() {
        return userId;
    }
    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getYarnId() {
        return yarnId;
    }
    public void setYarnId(Long yarnId) {
        this.yarnId = yarnId;
    }

    public LocalDateTime getAddedDate() {
        return addedDate;
    }
    public void setAddedDate(LocalDateTime addedDate) {
        this.addedDate = addedDate;
    }

}
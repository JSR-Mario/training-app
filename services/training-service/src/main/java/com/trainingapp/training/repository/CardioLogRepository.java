package com.trainingapp.training.repository;

import com.trainingapp.training.domain.CardioLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CardioLogRepository extends JpaRepository<CardioLog, UUID> {
    List<CardioLog> findByUserIdOrderByPerformedOnAsc(UUID userId);
}

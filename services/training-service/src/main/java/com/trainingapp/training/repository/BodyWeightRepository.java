package com.trainingapp.training.repository;

import com.trainingapp.training.domain.BodyWeightEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BodyWeightRepository extends JpaRepository<BodyWeightEntry, UUID> {

    List<BodyWeightEntry> findAllByUserIdAndDateBetweenOrderByDateAsc(UUID userId, LocalDate startDate, LocalDate endDate);

    Optional<BodyWeightEntry> findByUserIdAndDate(UUID userId, LocalDate date);
}

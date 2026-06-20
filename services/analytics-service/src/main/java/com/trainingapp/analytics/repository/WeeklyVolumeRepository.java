package com.trainingapp.analytics.repository;

import com.trainingapp.analytics.domain.WeeklyVolumeSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WeeklyVolumeRepository extends JpaRepository<WeeklyVolumeSnapshot, UUID> {
    Optional<WeeklyVolumeSnapshot> findByUserIdAndProgramIdAndWeekNumberAndBodyPart(
            UUID userId, UUID programId, int weekNumber, String bodyPart);

    List<WeeklyVolumeSnapshot> findByUserIdAndProgramIdAndWeekNumber(
            UUID userId, UUID programId, int weekNumber);
}

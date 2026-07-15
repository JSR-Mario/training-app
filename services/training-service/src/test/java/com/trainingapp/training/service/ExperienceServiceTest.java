package com.trainingapp.training.service;

import com.trainingapp.training.config.ExperienceConstants;
import com.trainingapp.training.domain.UserExperience;
import com.trainingapp.training.repository.UserExperienceRepository;
import com.trainingapp.training.repository.WorkoutSetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExperienceServiceTest {

    @Mock
    private UserExperienceRepository experienceRepository;

    @Mock
    private WorkoutSetRepository setRepository;

    private ExperienceService experienceService;
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        experienceService = new ExperienceService(experienceRepository, setRepository);
    }

    @Test
    void calculateLevel_ReturnsCorrectLevels() {
        // level = floor(sqrt(totalXp / 40000)) + 1
        assertThat(experienceService.calculateLevel(0)).isEqualTo(1);
        assertThat(experienceService.calculateLevel(39_999)).isEqualTo(1);
        
        assertThat(experienceService.calculateLevel(40_000)).isEqualTo(2); // (1^2 * 40k)
        assertThat(experienceService.calculateLevel(159_999)).isEqualTo(2);
        
        assertThat(experienceService.calculateLevel(160_000)).isEqualTo(3); // (2^2 * 40k)
        
        assertThat(experienceService.calculateLevel(640_000)).isEqualTo(5); // (4^2 * 40k)
        assertThat(experienceService.calculateLevel(3_240_000)).isEqualTo(10); // (9^2 * 40k)
    }

    @Test
    void levelThreshold_ReturnsCorrectXp() {
        assertThat(experienceService.levelThreshold(1)).isEqualTo(0);
        assertThat(experienceService.levelThreshold(2)).isEqualTo(40_000);
        assertThat(experienceService.levelThreshold(3)).isEqualTo(160_000);
        assertThat(experienceService.levelThreshold(5)).isEqualTo(640_000);
        assertThat(experienceService.levelThreshold(10)).isEqualTo(3_240_000);
    }

    @Test
    void currentLevelXp_ReturnsCorrectAccumulatedXpInCurrentLevel() {
        // At 50,000 XP total:
        // Level is 2 (requires 40,000)
        // Current level XP = 50,000 - 40,000 = 10,000
        assertThat(experienceService.currentLevelXp(50_000)).isEqualTo(10_000);

        // At 159,999 XP total:
        // Level is 2 (requires 40,000)
        // Current level XP = 159,999 - 40,000 = 119,999
        assertThat(experienceService.currentLevelXp(159_999)).isEqualTo(119_999);
    }

    @Test
    void nextLevelXp_ReturnsCorrectSpanToNextLevel() {
        // If user is Level 2, they started at 40k. Level 3 is at 160k.
        // Span = 160k - 40k = 120,000
        assertThat(experienceService.nextLevelXp(50_000)).isEqualTo(120_000);
        assertThat(experienceService.nextLevelXp(40_000)).isEqualTo(120_000);

        // If user is Level 1, started at 0. Level 2 is at 40k.
        // Span = 40,000
        assertThat(experienceService.nextLevelXp(20_000)).isEqualTo(40_000);
    }

    @Test
    void getOrInitialize_WhenExists_ReturnsExisting() {
        UserExperience existing = new UserExperience(userId, BigDecimal.valueOf(1500));
        when(experienceRepository.findByUserId(userId)).thenReturn(Optional.of(existing));

        UserExperience result = experienceService.getOrInitialize(userId);

        assertThat(result).isSameAs(existing);
        verify(setRepository, never()).findTotalVolumeByUserId(any());
        verify(experienceRepository, never()).save(any());
    }

    @Test
    void getOrInitialize_WhenMissing_InitializesFromHistoricalData() {
        when(experienceRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(setRepository.findTotalVolumeByUserId(userId)).thenReturn(8500.5);
        when(experienceRepository.save(any(UserExperience.class))).thenAnswer(i -> i.getArgument(0));

        UserExperience result = experienceService.getOrInitialize(userId);

        assertThat(result.getUserId()).isEqualTo(userId);
        assertThat(result.getTotalXp()).isEqualByComparingTo(BigDecimal.valueOf(8500.5));
        verify(experienceRepository).save(any(UserExperience.class));
    }

    @Test
    void addVolume_AddsXpAndSaves() {
        UserExperience existing = new UserExperience(userId, BigDecimal.valueOf(1000));
        when(experienceRepository.findByUserId(userId)).thenReturn(Optional.of(existing));

        experienceService.addVolume(userId, 250.5);

        ArgumentCaptor<UserExperience> captor = ArgumentCaptor.forClass(UserExperience.class);
        verify(experienceRepository).save(captor.capture());
        
        assertThat(captor.getValue().getTotalXp()).isEqualByComparingTo(BigDecimal.valueOf(1250.5));
    }

    @Test
    void addVolume_ZeroOrNegative_DoesNothing() {
        experienceService.addVolume(userId, 0);
        experienceService.addVolume(userId, -50);

        verify(experienceRepository, never()).findByUserId(any());
        verify(experienceRepository, never()).save(any());
    }

    @Test
    void subtractVolume_SubtractsAndSaves() {
        UserExperience existing = new UserExperience(userId, BigDecimal.valueOf(1000));
        when(experienceRepository.findByUserId(userId)).thenReturn(Optional.of(existing));

        experienceService.subtractVolume(userId, 200.0);

        ArgumentCaptor<UserExperience> captor = ArgumentCaptor.forClass(UserExperience.class);
        verify(experienceRepository).save(captor.capture());
        
        assertThat(captor.getValue().getTotalXp()).isEqualByComparingTo(BigDecimal.valueOf(800.0));
    }

    @Test
    void subtractVolume_ZeroOrNegative_DoesNothing() {
        experienceService.subtractVolume(userId, 0);
        experienceService.subtractVolume(userId, -50);

        verify(experienceRepository, never()).findByUserId(any());
        verify(experienceRepository, never()).save(any());
    }

    @Test
    void subtractVolume_FloorsAtZero() {
        UserExperience existing = new UserExperience(userId, BigDecimal.valueOf(100));
        when(experienceRepository.findByUserId(userId)).thenReturn(Optional.of(existing));

        experienceService.subtractVolume(userId, 150.0);

        ArgumentCaptor<UserExperience> captor = ArgumentCaptor.forClass(UserExperience.class);
        verify(experienceRepository).save(captor.capture());
        
        assertThat(captor.getValue().getTotalXp()).isEqualByComparingTo(BigDecimal.ZERO);
    }
}

package com.trainingapp.training.service;

import com.trainingapp.training.domain.DayTemplate;
import com.trainingapp.training.domain.WeekTemplate;
import com.trainingapp.training.dto.DayTemplateRequest;
import com.trainingapp.training.dto.DayTemplateResponse;
import com.trainingapp.training.exception.ResourceNotFoundException;
import com.trainingapp.training.repository.DayTemplateRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Business logic for day templates. Validates that the parent week
 * belongs to the authenticated user before any read or write.
 */
@Service
public class DayTemplateService {

    private final DayTemplateRepository dayRepository;
    private final WeekTemplateService weekService;

    public DayTemplateService(DayTemplateRepository dayRepository,
                              WeekTemplateService weekService) {
        this.dayRepository = dayRepository;
        this.weekService = weekService;
    }

    @Transactional(readOnly = true)
    public List<DayTemplateResponse> findByWeek(UUID userId, UUID weekId) {
        weekService.findOwned(userId, weekId);
        return dayRepository.findByWeekTemplateId(weekId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public DayTemplateResponse findById(UUID userId, UUID dayId) {
        return toResponse(findOwned(userId, dayId));
    }

    @Transactional
    public DayTemplateResponse create(UUID userId, UUID weekId, DayTemplateRequest request) {
        WeekTemplate week = weekService.findOwned(userId, weekId);
        DayTemplate day = new DayTemplate();
        day.setWeekTemplate(week);
        day.setName(request.name());
        return toResponse(dayRepository.save(day));
    }

    @Transactional
    public DayTemplateResponse update(UUID userId, UUID dayId, DayTemplateRequest request) {
        DayTemplate day = findOwned(userId, dayId);
        day.setName(request.name());
        return toResponse(dayRepository.save(day));
    }

    @Transactional
    public void delete(UUID userId, UUID dayId) {
        DayTemplate day = findOwned(userId, dayId);
        dayRepository.delete(day);
    }

    /** Package-private: validates day's parent week belongs to user. */
    DayTemplate findOwned(UUID userId, UUID dayId) {
        DayTemplate day = dayRepository.findById(dayId)
                .orElseThrow(() -> new ResourceNotFoundException("Day template not found."));
        weekService.findOwned(userId, day.getWeekTemplate().getId());
        return day;
    }

    private DayTemplateResponse toResponse(DayTemplate d) {
        return new DayTemplateResponse(d.getId(), d.getWeekTemplate().getId(), d.getName());
    }
}

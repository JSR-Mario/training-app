package com.trainingapp.training.controller;

import com.trainingapp.training.config.UserContext;
import com.trainingapp.training.dto.DashboardSummaryResponse;
import com.trainingapp.training.service.DashboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** REST endpoints for dashboard summaries. */
@RestController
@RequestMapping("/api/v1/training/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/summary")
    public DashboardSummaryResponse getSummary(
            @RequestParam(name = "tz", required = false) String tz,
            @RequestHeader(name = "X-Timezone", required = false) String headerTz) {
        String timezone = (tz != null && !tz.isBlank()) ? tz : headerTz;
        return dashboardService.getSummary(UserContext.getCurrentUserId(), timezone);
    }
}

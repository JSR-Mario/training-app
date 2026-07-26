package com.trainingapp.training.init;

import com.trainingapp.training.client.AnalyticsNotificationClient;
import com.trainingapp.training.domain.*;
import com.trainingapp.training.dto.SessionCompletedEvent;
import com.trainingapp.training.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

/**
 * Seeds rich English sample workout data for the Demo User account on application startup.
 */
@Component
public class DemoTrainingDataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoTrainingDataInitializer.class);
    public static final UUID DEMO_USER_ID = UUID.nameUUIDFromBytes("demo".getBytes(StandardCharsets.UTF_8));

    private final ExerciseRepository exerciseRepository;
    private final ExerciseBodyPartTargetRepository targetRepository;
    private final TrainingProgramRepository programRepository;
    private final WeekTemplateRepository weekRepository;
    private final DayTemplateRepository dayRepository;
    private final DayExerciseRepository dayExerciseRepository;
    private final WorkoutSessionRepository sessionRepository;
    private final SessionExerciseRepository sessionExerciseRepository;
    private final WorkoutSetRepository setRepository;
    private final BodyWeightRepository bodyWeightRepository;
    private final CardioLogRepository cardioLogRepository;
    private final AnalyticsNotificationClient analyticsClient;

    public DemoTrainingDataInitializer(ExerciseRepository exerciseRepository,
                                       ExerciseBodyPartTargetRepository targetRepository,
                                       TrainingProgramRepository programRepository,
                                       WeekTemplateRepository weekRepository,
                                       DayTemplateRepository dayRepository,
                                       DayExerciseRepository dayExerciseRepository,
                                       WorkoutSessionRepository sessionRepository,
                                       SessionExerciseRepository sessionExerciseRepository,
                                       WorkoutSetRepository setRepository,
                                       BodyWeightRepository bodyWeightRepository,
                                       CardioLogRepository cardioLogRepository,
                                       AnalyticsNotificationClient analyticsClient) {
        this.exerciseRepository = exerciseRepository;
        this.targetRepository = targetRepository;
        this.programRepository = programRepository;
        this.weekRepository = weekRepository;
        this.dayRepository = dayRepository;
        this.dayExerciseRepository = dayExerciseRepository;
        this.sessionRepository = sessionRepository;
        this.sessionExerciseRepository = sessionExerciseRepository;
        this.setRepository = setRepository;
        this.bodyWeightRepository = bodyWeightRepository;
        this.cardioLogRepository = cardioLogRepository;
        this.analyticsClient = analyticsClient;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!exerciseRepository.findByUserIdAndIsDeletedFalse(DEMO_USER_ID).isEmpty()) {
            log.info("Demo user training data already exists — skipping seed.");
            return;
        }

        log.info("Seeding rich English sample training data for Demo User (ID: {})...", DEMO_USER_ID);

        // 1. Create Exercises & Body Part Targets
        Exercise benchPress = createExercise("Barbell Bench Press", DEMO_USER_ID,
                Map.of(BodyPart.MID_CHEST, 1.0, BodyPart.TRICEPS, 0.5, BodyPart.FRONT_DELTS, 0.5));

        Exercise inclinePress = createExercise("Incline Dumbbell Press", DEMO_USER_ID,
                Map.of(BodyPart.UPPER_CHEST, 1.0, BodyPart.FRONT_DELTS, 0.5));

        Exercise squat = createExercise("Barbell Back Squat", DEMO_USER_ID,
                Map.of(BodyPart.QUADS, 1.0, BodyPart.GLUTES, 0.5, BodyPart.LOWER_BACK, 0.3));

        Exercise rdl = createExercise("Romanian Deadlift", DEMO_USER_ID,
                Map.of(BodyPart.HAMSTRINGS, 1.0, BodyPart.GLUTES, 0.5, BodyPart.LOWER_BACK, 0.5));

        Exercise ohp = createExercise("Overhead Barbell Press", DEMO_USER_ID,
                Map.of(BodyPart.FRONT_DELTS, 1.0, BodyPart.TRICEPS, 0.5, BodyPart.TRAPS, 0.3));

        Exercise pullUps = createExercise("Pull-Ups", DEMO_USER_ID,
                Map.of(BodyPart.LATS, 1.0, BodyPart.BICEPS, 0.5, BodyPart.MID_BACK, 0.5));

        Exercise bicepCurl = createExercise("Barbell Bicep Curl", DEMO_USER_ID,
                Map.of(BodyPart.BICEPS, 1.0, BodyPart.FOREARMS, 0.3));

        Exercise tricepPushdown = createExercise("Cable Tricep Pushdown", DEMO_USER_ID,
                Map.of(BodyPart.TRICEPS, 1.0));

        // 2. Create Training Program (4 weeks, 4 days per week)
        TrainingProgram program = new TrainingProgram();
        program.setUserId(DEMO_USER_ID);
        program.setName("Upper / Lower Hypertrophy Split");
        program.setDurationWeeks(4);
        program.setGoal(ProgramGoal.BULK);
        program.setActive(true);
        program.setCurrentWeek(4);
        program = programRepository.save(program);

        // 3. Create Weeks & Days templates
        Map<Integer, List<DayTemplate>> daysByWeek = new HashMap<>();

        for (int weekNum = 1; weekNum <= 4; weekNum++) {
            WeekTemplate week = new WeekTemplate();
            week.setProgram(program);
            week.setName("Week " + weekNum);
            week = weekRepository.save(week);

            List<DayTemplate> weekDays = new ArrayList<>();

            // Day 1: Upper Body A
            DayTemplate d1 = createDay(week, 1, "Upper Body A");
            addDayExercise(d1, benchPress, 1, 4, 6, 8);
            addDayExercise(d1, pullUps, 2, 4, 6, 8);
            addDayExercise(d1, ohp, 3, 3, 8, 10);
            addDayExercise(d1, bicepCurl, 4, 3, 10, 12);
            weekDays.add(d1);

            // Day 2: Lower Body A
            DayTemplate d2 = createDay(week, 2, "Lower Body A");
            addDayExercise(d2, squat, 1, 4, 6, 8);
            addDayExercise(d2, rdl, 2, 4, 8, 10);
            weekDays.add(d2);

            // Day 3: Upper Body B
            DayTemplate d3 = createDay(week, 3, "Upper Body B");
            addDayExercise(d3, inclinePress, 1, 4, 8, 10);
            addDayExercise(d3, pullUps, 2, 4, 8, 10);
            addDayExercise(d3, tricepPushdown, 3, 3, 10, 12);
            weekDays.add(d3);

            // Day 4: Lower Body B
            DayTemplate d4 = createDay(week, 4, "Lower Body B");
            addDayExercise(d4, squat, 1, 3, 8, 10);
            addDayExercise(d4, rdl, 2, 3, 10, 12);
            weekDays.add(d4);

            daysByWeek.put(weekNum, weekDays);
        }

        // 4. Create Completed Workout Sessions (Spotty calendar schedule across last 28 days)
        LocalDate startDate = LocalDate.now().minusDays(28);

        int[][] attendancePlan = {
            // Week 1 (4/4 complete)
            {1, 1, 0, 0}, {1, 2, 2, 0}, {1, 3, 4, 0}, {1, 4, 5, 0},
            // Week 2 (3/4 complete - Day 4 missed)
            {2, 1, 7, 1}, {2, 2, 9, 1}, {2, 3, 11, 1},
            // Week 3 (3/4 complete - Day 2 missed)
            {3, 1, 14, 2}, {3, 3, 17, 2}, {3, 4, 19, 2},
            // Week 4 (2/4 complete - Day 3 and 4 missed)
            {4, 1, 21, 3}, {4, 2, 23, 3}
        };

        for (int[] entry : attendancePlan) {
            int weekNum = entry[0];
            int dayNum = entry[1];
            int dayOffset = entry[2];
            double weightBump = entry[3] * 2.5;

            DayTemplate dayTpl = daysByWeek.get(weekNum).get(dayNum - 1);
            LocalDate performedDate = startDate.plusDays(dayOffset);
            Instant sessionTime = performedDate.atTime(18, 0).toInstant(java.time.ZoneOffset.UTC);

            WorkoutSession session = new WorkoutSession();
            session.setUserId(DEMO_USER_ID);
            session.setDayTemplate(dayTpl);
            session.setWeekNumber(weekNum);
            session.setPerformedOn(performedDate);
            session.setStartedAt(sessionTime);
            session.setCompletedAt(sessionTime.plusSeconds(3600));
            session.setNotes("Great workout session! Progressive overload achieved.");
            session = sessionRepository.save(session);

            List<SessionCompletedEvent.SetData> setEventList = new ArrayList<>();

            if (dayNum == 1) { // Upper A
                addSessionExerciseAndSets(session, benchPress, 1, 4, 8, 70.0 + weightBump, setEventList);
                addSessionExerciseAndSets(session, pullUps, 2, 4, 8, 0.0, setEventList);
                addSessionExerciseAndSets(session, ohp, 3, 3, 8, 45.0 + weightBump, setEventList);
                addSessionExerciseAndSets(session, bicepCurl, 4, 3, 10, 25.0 + (weightBump * 0.5), setEventList);
            } else if (dayNum == 2) { // Lower A
                addSessionExerciseAndSets(session, squat, 1, 4, 6, 90.0 + (weightBump * 1.5), setEventList);
                addSessionExerciseAndSets(session, rdl, 2, 4, 8, 80.0 + weightBump, setEventList);
            } else if (dayNum == 3) { // Upper B
                addSessionExerciseAndSets(session, inclinePress, 1, 4, 8, 24.0 + (weightBump * 0.5), setEventList);
                addSessionExerciseAndSets(session, pullUps, 2, 4, 10, 0.0, setEventList);
                addSessionExerciseAndSets(session, tricepPushdown, 3, 3, 12, 30.0 + weightBump, setEventList);
            } else if (dayNum == 4) { // Lower B
                addSessionExerciseAndSets(session, squat, 1, 3, 8, 85.0 + (weightBump * 1.5), setEventList);
                addSessionExerciseAndSets(session, rdl, 2, 3, 10, 75.0 + weightBump, setEventList);
            }

            // Notify analytics service
            notifyAnalytics(session, program.getId(), setEventList);
        }

        // 5. Body Weight Entries (Progressive trend 78.5 kg -> 77.1 kg over 30 days)
        for (int i = 0; i < 30; i += 2) {
            LocalDate date = LocalDate.now().minusDays(30 - i);
            double weight = 78.5 - (i * 0.05) + (Math.sin(i) * 0.2);
            BodyWeightEntry bwe = new BodyWeightEntry();
            bwe.setUserId(DEMO_USER_ID);
            bwe.setDate(date);
            bwe.setWeightKg(BigDecimal.valueOf(Math.round(weight * 10.0) / 10.0));
            bodyWeightRepository.save(bwe);
        }

        // 6. Cardio Logs
        createCardioLog(DEMO_USER_ID, LocalDate.now().minusDays(20), "Outdoor Running", 30);
        createCardioLog(DEMO_USER_ID, LocalDate.now().minusDays(12), "Outdoor Running", 25);
        createCardioLog(DEMO_USER_ID, LocalDate.now().minusDays(5), "Outdoor Running", 35);

        log.info("Demo user training data seeded successfully!");
    }

    private Exercise createExercise(String name, UUID userId, Map<BodyPart, Double> targets) {
        Exercise ex = new Exercise();
        ex.setUserId(userId);
        ex.setName(name);
        ex = exerciseRepository.save(ex);

        for (Map.Entry<BodyPart, Double> entry : targets.entrySet()) {
            ExerciseBodyPartTarget target = new ExerciseBodyPartTarget();
            target.setExercise(ex);
            target.setBodyPart(entry.getKey());
            target.setTargetValue(BigDecimal.valueOf(entry.getValue()));
            targetRepository.save(target);
        }
        return ex;
    }

    private DayTemplate createDay(WeekTemplate week, int dayNum, String name) {
        DayTemplate day = new DayTemplate();
        day.setWeekTemplate(week);
        day.setName(name);
        day.setSortOrder(dayNum);
        return dayRepository.save(day);
    }

    private void addDayExercise(DayTemplate day, Exercise exercise, int order, int sets, int minReps, int maxReps) {
        DayExercise de = new DayExercise();
        de.setDayTemplate(day);
        de.setExercise(exercise);
        de.setSortOrder(order);
        de.setSets(sets);
        de.setReps(minReps);
        de.setRepsMax(maxReps);
        dayExerciseRepository.save(de);
    }

    private void addSessionExerciseAndSets(WorkoutSession session, Exercise exercise, int order, int setCount, int reps, double weight, List<SessionCompletedEvent.SetData> setEventList) {
        SessionExercise se = new SessionExercise();
        se.setSession(session);
        se.setExercise(exercise);
        se.setSortOrder(order);
        se.setSets(setCount);
        se.setReps(reps);
        se = sessionExerciseRepository.save(se);

        Map<String, BigDecimal> multipliers = new HashMap<>();
        for (ExerciseBodyPartTarget t : targetRepository.findByExerciseId(exercise.getId())) {
            multipliers.put(t.getBodyPart().name(), t.getTargetValue());
        }

        for (int i = 1; i <= setCount; i++) {
            WorkoutSet set = new WorkoutSet();
            set.setSession(session);
            set.setSessionExercise(se);
            set.setSetNumber(i);
            set.setRepsCompleted(reps);
            set.setWeightKg(BigDecimal.valueOf(weight));
            setRepository.save(set);

            setEventList.add(new SessionCompletedEvent.SetData(
                exercise.getId(),
                reps,
                null,
                BigDecimal.valueOf(weight),
                multipliers
            ));
        }
    }

    private void createCardioLog(UUID userId, LocalDate date, String type, int duration) {
        CardioLog log = new CardioLog();
        log.setUserId(userId);
        log.setPerformedOn(date);
        log.setCardioType(type);
        log.setDurationMinutes(duration);
        cardioLogRepository.save(log);
    }

    private void notifyAnalytics(WorkoutSession session, UUID programId, List<SessionCompletedEvent.SetData> sets) {
        SessionCompletedEvent event = new SessionCompletedEvent(
            session.getId(),
            session.getUserId(),
            programId,
            session.getWeekNumber(),
            session.getDayTemplate().getId(),
            session.getPerformedOn(),
            sets
        );

        boolean success = false;
        int attempts = 0;
        while (!success && attempts < 10) {
            try {
                analyticsClient.notifySessionCompletedSync(event);
                success = true;
            } catch (Exception e) {
                attempts++;
                log.warn("Could not notify analytics for demo session (attempt {}/10): {}. Retrying in 3s...", attempts, e.getMessage());
                try {
                    Thread.sleep(3000);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
    }
}

# Yes App — Agent Development Plan
> Version 2.0 — Final

---

## Decisions Log
> All architectural choices are recorded here so the agent never has to infer intent.

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Users | Single user MVP, multi-user ready | All entities carry `user_id` from day one. Expansion requires no schema changes. |
| Analytics scope | Pre-calculated metrics only | Weekly volume snapshots + exercise progress entries. No raw event logs. |
| Analytics communication | HTTP fire-and-forget (training → analytics) | Simplest pattern that keeps services decoupled. Swappable for a message broker later with no domain changes. |
| Frontend | Angular PWA (installable, no offline) | Works in Android browser and installable to home screen. No service worker caching. |
| Frontend rendering | Responsive web only | No native app. No Native Apps. |
| Auth strategy | JWT (access + refresh). HttpOnly cookie for refresh token | Secure by default. Multi-user expansion requires zero auth rework. |
| Password storage | BCrypt cost 12 | Industry standard. |
| Admin user | Seeded from env vars on startup | No hardcoded credentials in source. |
| ORM | Spring Data JPA + Hibernate | Standard. Flyway manages migrations. Entities never exposed directly from controllers. |
| Database | PostgreSQL 16 | One instance for MVP; each service gets its own schema. |
| Build | Maven multi-module | Shared dependency versions in parent POM. All versions pinned. No floating versions. |
| Charts | ng2-charts | Minimal, functional. |
| Styling | Tailwind CSS utility classes, lightweight UI libraries allowed | Lightweight animations/transitions allowed if they don't impact computational cost. |
| PWA | vite-plugin-pwa + manifest.json | Enables Android installation. No offline caching. |
| Language | English everywhere | Variable names, functions, comments, commits, docs. |

---

## Tech Stack

### Backend
| Component | Library | Version |
|-----------|---------|---------|
| Language | Java | 21 (LTS) |
| Framework | Spring Boot | 3.3.x |
| ORM | Spring Data JPA + Hibernate | (included in Boot) |
| Migrations | Flyway | 10.x |
| Auth | Spring Security + jjwt | jjwt 0.12.x |
| Gateway | Spring Cloud Gateway | 2023.x |
| HTTP client (internal) | Spring WebClient | (included in Boot) |
| API docs | Springdoc OpenAPI | 2.x |
| Database | PostgreSQL | 16 |
| Build | Maven multi-module | 3.9.x |
| Tests | JUnit 5 + Mockito | (included in Boot) |

### Frontend
| Component | Library | Version |
|-----------|---------|---------|
| Framework | Angular + TypeScript | 21.x |
| Build | Angular CLI | 21.x |
| PWA | @angular/pwa | 21.x |
| Router | Angular Router | 21.x |
| Data fetching | RxJS / Angular Signals | 21.x |
| Charts | ng2-charts | 6.x |
| Styling | Tailwind CSS | 3.x |
| HTTP client | Angular HttpClient | 21.x |

### Infrastructure
| Component | Tool |
|-----------|------|
| Containers | Docker + Docker Compose |
| Deployment | Antigravity |
| Orchestration (future) | Kubernetes |
| CI/CD | GitHub Actions |
| Secrets | Environment variables / K8s Secrets |

---

## Services

| Service | Internal Port | Responsibility |
|---------|--------------|----------------|
| `api-gateway` | 8080 | Single entry point, routing, JWT validation, CORS, rate limiting |
| `auth-service` | 8081 | User management, JWT issuance, refresh tokens |
| `training-service` | 8082 | Programs, weeks, days, exercises, workout session logging |
| `analytics-service` | 8083 | Pre-calculated metrics: weekly volume, exercise progress |

### Service Communication

```
Client
  │
  ▼
api-gateway (8080)                  ← JWT validation here. Internal services trust gateway.
  ├── /api/v1/auth/**    ──────────► auth-service (8081)
  ├── /api/v1/training/** ─────────► training-service (8082)
  └── /api/v1/analytics/** ────────► analytics-service (8083)

training-service ──[HTTP POST, fire-and-forget]──► analytics-service
  (triggered when a WorkoutSession is completed)
```

The gateway validates the JWT once. Internal service-to-service calls travel on the
internal Docker/K8s network without re-authentication.

---

## Repository Structure

```
training-app/
├── .github/
│   └── workflows/
│       ├── ci.yml                      # Build + test on every PR
│       └── cd.yml                      # Deploy to Antigravity on merge to main
│
├── services/
│   ├── api-gateway/
│   │   ├── src/main/
│   │   │   ├── java/com/trainingapp/gateway/
│   │   │   │   ├── config/             # Routes, filters, rate limiting
│   │   │   │   └── filter/             # JWT validation filter, security headers
│   │   │   └── resources/
│   │   │       └── application.yml
│   │   ├── Dockerfile
│   │   └── pom.xml
│   │
│   ├── auth-service/
│   │   ├── src/main/
│   │   │   ├── java/com/trainingapp/auth/
│   │   │   │   ├── controller/
│   │   │   │   ├── service/
│   │   │   │   ├── repository/
│   │   │   │   ├── domain/             # User entity
│   │   │   │   ├── dto/                # Request/Response records
│   │   │   │   ├── config/             # Security config, JWT config
│   │   │   │   └── init/               # DataInitializer (admin seed)
│   │   │   └── resources/
│   │   │       ├── application.yml
│   │   │       └── db/migration/       # Flyway: V1__create_users.sql, etc.
│   │   ├── src/test/
│   │   ├── Dockerfile
│   │   └── pom.xml
│   │
│   ├── training-service/
│   │   ├── src/main/
│   │   │   ├── java/com/trainingapp/training/
│   │   │   │   ├── controller/
│   │   │   │   ├── service/
│   │   │   │   ├── repository/
│   │   │   │   ├── domain/             # All JPA entities
│   │   │   │   ├── dto/
│   │   │   │   ├── client/             # WebClient to analytics-service
│   │   │   │   └── config/
│   │   │   └── resources/
│   │   │       ├── application.yml
│   │   │       └── db/migration/
│   │   ├── src/test/
│   │   ├── Dockerfile
│   │   └── pom.xml
│   │
│   └── analytics-service/
│       ├── src/main/
│       │   ├── java/com/trainingapp/analytics/
│       │   │   ├── controller/
│       │   │   ├── service/
│       │   │   ├── repository/
│       │   │   ├── domain/             # Metric entities
│       │   │   ├── dto/
│       │   │   └── config/
│       │   └── resources/
│       │       ├── application.yml
│       │       └── db/migration/
│       ├── src/test/
│       ├── Dockerfile
│       └── pom.xml
│
├── frontend/
│   ├── src/
│   │   ├── api/                        # Typed Axios instances per service
│   │   ├── components/                 # Reusable UI: Button, Input, Table, Chart
│   │   ├── pages/
│   │   │   ├── auth/                   # Login page
│   │   │   ├── programs/               # Program builder
│   │   │   ├── exercises/              # Exercise catalog
│   │   │   ├── workout/                # Active workout logging
│   │   │   └── analytics/             # Volume + progress charts
│   │   ├── hooks/                      # useAuth, useWorkout, useAnalytics
│   │   ├── context/                    # AuthContext
│   │   ├── types/                      # TypeScript interfaces mirroring API DTOs
│   │   └── utils/
│   ├── public/
│   │   └── icons/                      # PWA icons (192px, 512px)
│   ├── Dockerfile
│   ├── angular.json                    # Angular CLI configuration
│   ├── tailwind.config.ts
│   └── package.json
│
├── k8s/
│   ├── base/
│   │   ├── api-gateway/                # Deployment, Service, ConfigMap
│   │   ├── auth-service/
│   │   ├── training-service/
│   │   ├── analytics-service/
│   │   ├── frontend/
│   │   └── postgres/
│   └── overlays/
│       ├── development/
│       └── production/
│
├── pom.xml                             # Parent POM: all dependency versions here
├── docker-compose.yml                  # Full stack: all services + PostgreSQL
├── docker-compose.dev.yml              # Dev mode with volume mounts
├── .env.example                        # Every required env var documented
├── .gitignore
└── README.md
```

---

## Domain Model

### Hardcoded Body Parts

These are fixed values defined as a Java enum. No table. No CRUD.

```java
CHEST, BACK, SHOULDERS, BICEPS, TRICEPS,
QUADS, HAMSTRINGS, GLUTES, CALVES, CORE, FOREARMS, TRAPS
```

### training-service Entities

```
User                                    -- Kept here for FK reference; owned by auth-service
  id              UUID  PK
  created_at      TIMESTAMP

Exercise
  id              UUID  PK
  user_id         UUID  NOT NULL        -- Multi-user ready from day one
  name            VARCHAR NOT NULL
  created_at      TIMESTAMP

ExerciseBodyPartTarget
  id              UUID  PK
  exercise_id     UUID  FK → Exercise
  body_part       ENUM(BodyPart) NOT NULL
  target_value    DECIMAL NOT NULL      -- How much this exercise "hits" this body part
                                        -- e.g. bench press: CHEST=1.0, TRICEPS=0.5

TrainingProgram
  id              UUID  PK
  user_id         UUID  NOT NULL
  name            VARCHAR NOT NULL
  duration_weeks  INT NOT NULL
  start_date      DATE
  created_at      TIMESTAMP

WeekTemplate                            -- The repeating week blueprint
  id              UUID  PK
  program_id      UUID  FK → TrainingProgram
  name            VARCHAR NOT NULL

DayTemplate                             -- A training day within the week (no fixed weekday)
  id              UUID  PK
  week_template_id UUID FK → WeekTemplate
  name            VARCHAR NOT NULL      -- e.g. "Push", "Pull", "Legs A"

DayExercise                             -- Exercise assigned to a DayTemplate
  id              UUID  PK
  day_template_id UUID  FK → DayTemplate
  exercise_id     UUID  FK → Exercise
  sets            INT NOT NULL
  reps            INT NOT NULL
  sort_order      INT NOT NULL          -- User-defined order within the day

WorkoutSession                          -- An actual training day performed by the user
  id              UUID  PK
  user_id         UUID  NOT NULL
  day_template_id UUID  FK → DayTemplate
  performed_on    DATE NOT NULL
  week_number     INT NOT NULL          -- Which repetition of the week (1, 2, 3...)
  completed_at    TIMESTAMP             -- Null while in progress; set on completion

WorkoutSet                              -- One logged set within a session
  id              UUID  PK
  session_id      UUID  FK → WorkoutSession
  day_exercise_id UUID  FK → DayExercise
  set_number      INT NOT NULL
  reps_completed  INT NOT NULL
  weight_kg       DECIMAL NOT NULL
  logged_at       TIMESTAMP
```

### analytics-service Entities

These are derived, pre-calculated. They are written to by analytics-service when
training-service notifies it of a completed session. Never modified by the user directly.

```
WeeklyVolumeSnapshot
  id              UUID  PK
  user_id         UUID  NOT NULL
  program_id      UUID  NOT NULL
  week_number     INT NOT NULL
  body_part       ENUM(BodyPart) NOT NULL
  total_sets      DECIMAL NOT NULL      -- SUM(day_exercise.sets × target_value)
                                        -- across all sessions in this week
  calculated_at   TIMESTAMP

ExerciseProgressEntry
  id              UUID  PK
  user_id         UUID  NOT NULL
  exercise_id     UUID  NOT NULL
  session_date    DATE NOT NULL
  max_weight_kg   DECIMAL NOT NULL      -- Heaviest set logged that session
  total_volume_kg DECIMAL NOT NULL      -- SUM(weight_kg × reps_completed)
  total_sets      INT NOT NULL
  recorded_at     TIMESTAMP
```

---

## Analytics Event Flow

When a `WorkoutSession` is marked as completed in training-service:

1. `WorkoutSessionService` calls `AnalyticsNotificationClient` (WebClient, non-blocking).
2. `AnalyticsNotificationClient` sends `POST /internal/events/session-completed` with
   the full session payload (sets, weights, day template, week number).
3. analytics-service receives the event, calculates metrics, and upserts into its tables.
4. If analytics-service is down, the call fails silently. Session data is always
   in training-service and metrics can be recalculated on demand. No data is lost.

This endpoint is on an internal port only — not exposed through the gateway.

---

## API Design

All routes go through the gateway. JWT required everywhere except `/auth/login`
and `/auth/register`.

### auth-service
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login               → returns access token; sets HttpOnly refresh cookie
POST   /api/v1/auth/refresh             → reads HttpOnly cookie, returns new access token
POST   /api/v1/auth/logout              → clears HttpOnly cookie
GET    /api/v1/auth/me
```

### training-service — Programs
```
GET    /api/v1/training/programs
POST   /api/v1/training/programs
GET    /api/v1/training/programs/{id}
PUT    /api/v1/training/programs/{id}
DELETE /api/v1/training/programs/{id}
```

### training-service — Week Templates
```
GET    /api/v1/training/programs/{programId}/weeks
POST   /api/v1/training/programs/{programId}/weeks
PUT    /api/v1/training/weeks/{id}
DELETE /api/v1/training/weeks/{id}
```

### training-service — Day Templates
```
GET    /api/v1/training/weeks/{weekId}/days
POST   /api/v1/training/weeks/{weekId}/days
PUT    /api/v1/training/days/{id}
DELETE /api/v1/training/days/{id}
```

### training-service — Exercise Catalog
```
GET    /api/v1/training/exercises
POST   /api/v1/training/exercises
PUT    /api/v1/training/exercises/{id}
DELETE /api/v1/training/exercises/{id}

GET    /api/v1/training/exercises/{id}/targets
POST   /api/v1/training/exercises/{id}/targets
PUT    /api/v1/training/exercise-targets/{id}
DELETE /api/v1/training/exercise-targets/{id}
```

### training-service — Day Exercises
```
GET    /api/v1/training/days/{dayId}/exercises
POST   /api/v1/training/days/{dayId}/exercises
PUT    /api/v1/training/day-exercises/{id}
DELETE /api/v1/training/day-exercises/{id}
PATCH  /api/v1/training/days/{dayId}/exercises/reorder    body: [{ id, sortOrder }]
```

### training-service — Workout Sessions
```
GET    /api/v1/training/sessions?programId={id}&weekNumber={n}
POST   /api/v1/training/sessions                           → starts a session
GET    /api/v1/training/sessions/{id}
DELETE /api/v1/training/sessions/{id}
POST   /api/v1/training/sessions/{id}/complete             → marks done, triggers analytics

POST   /api/v1/training/sessions/{id}/sets
PUT    /api/v1/training/workout-sets/{id}
DELETE /api/v1/training/workout-sets/{id}
```

### analytics-service — Metrics (read-only from client perspective)
```
GET    /api/v1/analytics/volume?programId={id}&weekNumber={n}
       Response: [{ bodyPart: string, totalSets: number }]

GET    /api/v1/analytics/progress/{exerciseId}
       Response: [{ sessionDate: date, maxWeightKg: number, totalVolumeKg: number, totalSets: number }]
```

### analytics-service — Internal (not exposed through gateway)
```
POST   /internal/events/session-completed                  → called by training-service only
```

---

## PWA Configuration

Add to Angular via `@angular/pwa`:

```json
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['icons/*.png'],
```json
{
  "name": "Training App",
  "short_name": "Training",
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "display": "standalone",
  "start_url": "/",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## Security Requirements

Must be fully implemented before internet deployment. No exceptions.

1. JWT access token: 15-minute expiry. Refresh token: 7-day expiry in HttpOnly,
   Secure, SameSite=Strict cookie. Never in localStorage.
2. BCrypt cost factor 12 for all passwords.
3. Every query in training-service and analytics-service filters by `userId`
   extracted from the JWT. A user can never request another user's data regardless
   of what IDs are in the request body or path.
4. CORS at gateway: whitelist only `ALLOWED_ORIGIN` env var value.
5. Rate limiting at gateway: 20 requests/minute per IP on `/api/v1/auth/**`.
6. `@Valid` on every controller method that accepts a request body.
7. Global `@ControllerAdvice` maps all exceptions to RFC 7807 problem detail responses.
   Stack traces, SQL errors, and field names are never exposed to the client.
8. Security headers on all responses: `Strict-Transport-Security`, `X-Frame-Options: DENY`,
   `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`.
9. The internal analytics endpoint (`/internal/**`) must be accessible only from within
   the Docker/K8s internal network. Block it at the gateway level with a path filter.
10. All secrets come from environment variables. Zero hardcoded credentials.
11. Dependency versions pinned in `pom.xml` and `package.json`. Dependabot enabled.

---

## Code Standards

- **English only**: variables, functions, classes, comments, commits, docs.
- **Expressive names**: no abbreviations except `id`, `dto`, `url`, `http`.
- **Javadoc**: every `public` class and `public` method. Explains purpose, not code.
- **DTOs as Java records**: Request and Response objects are separate from JPA entities.
- **No magic numbers**: constants go in a `Constants` class or enum.
- **Commit format**: conventional commits — `feat:`, `fix:`, `chore:`, `docs:`, `test:`.
- **Error handling**: one `@ControllerAdvice` per service. No `try/catch` swallowed silently.
- **Java 21 features**: use records for DTOs, `switch` expressions, text blocks for
  multi-line SQL in tests. Virtual threads enabled via `spring.threads.virtual.enabled=true`.

---

## Testing Standards

- **Mandatory Testing**: Every single change, new feature, or fix must be fully testable and include corresponding tests.
- **Backend Unit Tests**: Use JUnit 5 and Mockito for all services, controllers, and utility classes.
- **Backend Integration Tests**: Use Testcontainers and `@SpringBootTest` for critical workflows (like database interactions and API endpoints).
- **Frontend Tests**: Use Jasmine/Karma (or Angular's default test runner) for all Angular components, guards, interceptors, and services.
- **Test-Driven / Test-After**: Both are acceptable, but code must not be merged or considered complete without passing tests covering the changes.

---

## Development Sessions

Each session ends with all code committed, all tests passing, and the full stack
running cleanly via `docker-compose up`.

---

### Session 1 — Repository & Infrastructure Foundation ✅
- [x] Initialize Git repo
- [x] `.gitignore`: Java, Node, IntelliJ/VS Code, `.env`, `target/`, `node_modules/`
- [x] Parent `pom.xml` with all four service modules and dependency management section
      (pins all library versions in one place)
- [x] Skeleton Spring Boot projects for all four services (can start/stop, expose `/actuator/health`)
- [x] `docker-compose.yml`: PostgreSQL + all four services + frontend (nginx placeholder)
- [x] `docker-compose.dev.yml`: overrides for hot reload (volume mounts)
- [x] `.env.example` with every variable documented and described
- [x] `README.md` skeleton with all section headers + git workflow documented
- [x] `.github/workflows/ci.yml`: backend + conditional frontend jobs

**Deliverable**: `mvn verify` → BUILD SUCCESS [5/5 modules, 4 tests, 0 failures].
`docker-compose up` ready (requires `.env` file). Branch: `feat/session-1-infra-foundation` → merged to `develop`.

---

### Session 2 — Auth Service ✅
- [x] `User` entity + `UserRepository`
- [x] Flyway: `V1__create_users_table.sql`
- [x] `AuthController`: `/register`, `/login`, `/refresh`, `/logout`, `/me`
- [x] JWT generation (access token) + refresh token (HttpOnly cookie)
- [x] Spring Security config: permit auth endpoints, require JWT everywhere else
- [x] `DataInitializer`: seeds admin user from `ADMIN_USERNAME`, `ADMIN_PASSWORD`,
      `ADMIN_EMAIL` env vars. Idempotent.
- [x] `GlobalExceptionHandler` with RFC 7807 problem detail responses
- [x] Unit tests for `AuthService` and `JwtService`

**Deliverable**: Register, login, get access token, use refresh token. Admin created
on first start. Branch: `feat/session-2-auth-service` ready for PR.

---

### Session 3 — Training Service: Domain Entities & Program Structure ✅
- [x] All JPA entities with Flyway migrations
- [x] `ExerciseService`: CRUD + body part target management. `userId` filter on all reads.
- [x] `ProgramService`: CRUD. `userId` filter.
- [x] `WeekTemplateService`: CRUD. Validates program belongs to requesting user.
- [x] `DayTemplateService`: CRUD. Validates week belongs to requesting user.
- [x] `DayExerciseService`: CRUD + reorder endpoint.
- [x] All controllers with `@Valid` + `GlobalExceptionHandler`
- [x] JWT extraction utility: reads `userId` from SecurityContext, available to all services
- [x] Unit tests for all services

**Deliverable**: Full program structure (program → weeks → days → exercises) can be
created and queried via REST. Branch: `feat/session-3-training-domain` ready for PR.

---

### Session 4 — Training Service: Workout Logging ✅
- [x] `WorkoutSessionService`: create session (choose day template + week number),
      complete session (sets `completed_at`, fires analytics notification)
- [x] `WorkoutSetService`: log a set, update a set, delete a set
- [x] `AnalyticsNotificationClient` (WebClient): sends session payload to analytics-service
      on session completion. Fire-and-forget. Errors are logged, never propagated.
- [x] Unit tests. Integration test verifying the notification client is called on completion.

**Deliverable**: User can log a full workout session. Completion fires an (ignorable-if-down)
notification to analytics-service. Branch: `feat/session-4-workout-logging` ready for PR.

---

### Session 5 — Analytics Service ✅
- [x] `WeeklyVolumeSnapshot` + `ExerciseProgressEntry` entities + Flyway migrations
- [x] `SessionCompletedEventHandler`: receives POST from training-service, calculates
      and upserts both metric types
- [x] `AnalyticsController`:
  - `GET /api/v1/analytics/volume?programId=&weekNumber=`
  - `GET /api/v1/analytics/progress/{exerciseId}`
- [x] Internal endpoint `POST /internal/events/session-completed` (not gateway-exposed)
- [x] Unit tests for metric calculation logic
- [x] Manual recalculation endpoint (admin only): rebuilds snapshots from a re-sent payload

**Deliverable**: After completing a session, volume and progress metrics are available
from analytics-service. Branch: `feat/session-5-analytics-service` ready for PR.

---

### Session 6 — API Gateway ✅
- [x] Routes to all three backend services with path rewriting
- [x] `JwtValidationFilter`: validates token, rejects with 401 if invalid.
      Passes `X-User-Id` header to downstream services.
- [x] `SecurityHeadersFilter`: adds HSTS, X-Frame-Options, X-Content-Type-Options,
      Referrer-Policy to every response
- [x] `InternalPathFilter`: blocks any request to `/internal/**` from external clients
- [x] CORS global filter using `ALLOWED_ORIGIN` env var
- [x] Rate limiter on `/api/v1/auth/**`: 20 req/min per IP (Redis-backed)
- [x] `GET /api/v1/health`: aggregates health from all downstream services

**Deliverable**: All API calls go through port 8080 only. Direct service ports
unreachable from outside Docker network. Branch: `feat/session-6-api-gateway` ready for PR.

---

### Session 7 — Frontend: Foundation + Auth
- [ ] Angular CLI + Angular 21 + TypeScript + Tailwind + @angular/pwa project
- [ ] Angular Router: define all routes, auth guard wrapper
- [ ] `AuthService`: stores access token in memory (not localStorage),
      handles login/logout/refresh
- [ ] HttpInterceptor: base URL from environment, JWT interceptor,
      auto-refresh on 401
- [ ] RxJS / Signals for data state
- [ ] Login page (username + password form, no register UI needed — admin only)
- [ ] Base layout: sidebar on desktop, bottom navigation bar on mobile
- [ ] PWA manifest + icons configured and tested (Android "Add to Home Screen" works)

**Deliverable**: Login works. Protected routes redirect. App installable on Android.

---

### Session 8 — Frontend: Program & Exercise Management ✅
- [x] Exercise catalog page: list all exercises, add/edit/delete
- [x] Body part target editor: within exercise form, list each body part with a
      decimal input for target value. Add/remove targets.
- [x] Program list page: create, list, delete programs
- [x] Week template builder: add named days to a week
- [x] Day exercise editor: add exercises to a day, set sets/reps, reorder with
      up/down controls (no drag-and-drop)

**Deliverable**: User can configure a complete training program from the UI. Branch: `feat/session-8-frontend-programs` ready for PR.

---

### Session 9 — Frontend: Workout Logging ✅
- [x] Session list page: shows sessions by week number for the active program
- [x] Start session view: pick which day template to log today
- [x] Active workout view:
  - Lists exercises in sort order
  - For each exercise: a row per set with reps and weight inputs
  - Mobile-optimized: large inputs, tap-friendly controls
  - "Complete Workout" button marks session done
- [x] Completed session summary: shows what was logged

**Deliverable**: User can log a full workout from phone or desktop browser. Branch: `feat/session-9-frontend-workout` merged to main.

---

### Session 10 — Frontend: Analytics ✅
- [x] Volume dashboard:
  - Week selector (navigate between weeks)
  - Horizontal bar chart (ng2-charts BarChart) showing total sets × target per body part
  - No colors beyond a single neutral tone
- [x] Progress view per exercise:
  - Exercise selector dropdown
  - Line chart (ng2-charts LineChart) showing max weight over time
  - Secondary line for total volume (optional toggle)
- [x] Both views share one page with a tab/toggle switcher

**Deliverable**: User can see weekly volume per body part and weight progression per exercise. Branch: `feat/session-10-frontend-analytics` ready for PR.

---

### Session 11 — Dockerfiles, CI/CD & Deployment ✅
- [x] Multi-stage `Dockerfile` per Spring Boot service:
  `maven:3.9-eclipse-temurin-21` builder → `eclipse-temurin:21-jre-alpine` runtime
- [x] Multi-stage `Dockerfile` for frontend:
  `node:20-alpine` builder → `nginx:alpine` runtime. Nginx config serves SPA correctly
  (all routes return `index.html`).
- [x] `.github/workflows/ci.yml`:
  - Triggers: `push` and `pull_request` to `main`
  - Steps: checkout → Java 21 setup → `mvn verify` → Node 20 setup → `npm ci` →
    `npm run build` → `npm run lint`
  - PRs cannot be merged if CI fails
- [x] `.github/workflows/cd.yml`:
  - Trigger: merge to `main`
  - Steps: build all Docker images → push to container registry → deploy to EC2 via SSH
- [x] Final `README.md` — all sections complete

**Deliverable**: Push to main → CI passes → app deployed to EC2 automatically.

---

## Environment Variables Reference

```dotenv
# Database
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=trainingapp
POSTGRES_USER=trainingapp_user
POSTGRES_PASSWORD=changeme_use_strong_value_in_prod

# Auth Service
JWT_SECRET=replace-with-256-bit-random-hex-string
JWT_ACCESS_EXPIRY_MINUTES=15
JWT_REFRESH_EXPIRY_DAYS=7

# Admin seed (auth-service)
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@trainingapp.local
ADMIN_PASSWORD=changeme_use_strong_value_in_prod

# Gateway
ALLOWED_ORIGIN=http://localhost:5173

# Internal service URLs (used by gateway and training-service)
AUTH_SERVICE_URL=http://auth-service:8081
TRAINING_SERVICE_URL=http://training-service:8082
ANALYTICS_SERVICE_URL=http://analytics-service:8083

# Frontend
API_BASE_URL=http://localhost:8080
```

---

## README Sections (required before Session 11 ends)

1. **Architecture Overview** — text diagram of services and communication
2. **Decisions Log** — copy from this document, kept up to date
3. **Domain Model** — entity relationship summary
4. **Body Parts Reference** — the fixed enum values
5. **Local Development Setup** — step-by-step from `git clone` to running app
6. **Environment Variables** — full reference table with descriptions
7. **API Reference** — link to Swagger UI at `http://localhost:8080/swagger-ui.html`
8. **Analytics Event Flow** — how training-service notifies analytics-service
9. **Deployment Guide** — Antigravity steps + Kubernetes instructions
10. **CI/CD Pipeline** — what triggers what, how to monitor
11. **Security Notes** — what is protected and how
12. **Adding a New Service** — guide for future expansion (multi-user, new features)

---

## Hard Constraints for Agent

These override any "best practice" judgment the agent might apply.

- No placeholder data, sample exercises, or default programs. The user populates everything.
- No images in the application. No `<img>` tags except PWA icons.
- No emojis. No decorative icons. Light, non-flashy animations and CSS transitions are allowed.
- Lightweight UI component libraries and visual enhancements (animations, transitions) are allowed to improve UX, but must preserve app performance and low computational cost.
- The analytics internal endpoint (`/internal/**`) must never be routable through the gateway.
- All `userId` values come from the JWT. Never from request body or query params.
- Every database migration is additive. No `DROP` statements in any migration file.
- Every PR must pass CI. No force pushes to `main`.
- Maven: no `LATEST`, no version ranges. All versions in parent `pom.xml` only.
- npm: no `^` or `~` version prefixes in `package.json`. Exact versions only.
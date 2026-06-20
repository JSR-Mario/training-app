---
trigger: always_on
---

# Training App — Agent Rules
> Persistent ruleset. The full architecture, domain model, API list, repo tree and
> session-by-session plan live in `PROJECT_PLAN.md` — read it at the start of each
> session and whenever a decision below isn't enough detail.

## Decisions Log
| Decision | Choice |
|----------|--------|
| Users | Single-user MVP, multi-user ready (every entity carries `user_id` from day one) |
| Analytics scope | Pre-calculated metrics only (weekly volume + exercise progress). No raw event logs |
| Analytics comms | HTTP fire-and-forget, training-service → analytics-service |
| Frontend | Angular PWA, installable, **no offline caching**, no Native Apps |
| Auth | JWT access+refresh. Refresh token in HttpOnly cookie |
| Passwords | BCrypt cost 12 |
| Admin user | Seeded from env vars on startup, idempotent. No hardcoded credentials |
| ORM | Spring Data JPA + Hibernate. Flyway migrations. Entities never exposed by controllers |
| Database | PostgreSQL 16, one instance, one schema per service |
| Build | Maven multi-module, all versions pinned in parent POM, no floating versions |
| Charts | ng2-charts (Chart.js) only, no animations |
| Styling | Tailwind utility classes only, no component libraries, no decorative icons |
| Language | English everywhere: code, comments, commits, docs |

## Tech Stack (pinned versions — never upgrade without explicit instruction)
**Backend:** Java 21 · Spring Boot 3.3.x · Flyway 10.x · Spring Security + jjwt 0.12.x ·
Spring Cloud Gateway 2023.x · Spring WebClient · Springdoc OpenAPI 2.x · PostgreSQL 16 ·
Maven 3.9.x · JUnit 5 + Mockito.
**Frontend:** Angular 18 + TypeScript · @angular/cli 18.x · @angular/pwa 18.x · @angular/router 18.x ·
RxJS / HttpClient · ng2-charts 6.x · Tailwind 3.x.
**Infra:** Docker + Docker Compose · Antigravity deploy · Kubernetes (future) ·
GitHub Actions CI/CD · secrets via env vars / K8s Secrets.

## Services
| Service | Port | Responsibility |
|---------|------|-----------------|
| api-gateway | 8080 | Single entry point. JWT validation. CORS. Rate limiting |
| auth-service | 8081 | Users, JWT issuance, refresh tokens |
| training-service | 8082 | Programs, weeks, days, exercises, workout logging |
| analytics-service | 8083 | Pre-calculated metrics: weekly volume, exercise progress |

Gateway validates JWT once and forwards `X-User-Id` downstream; internal services
trust the gateway and never re-authenticate. `training-service` notifies
`analytics-service` via fire-and-forget POST when a session completes; failures are
logged, never propagated — session data is never lost, metrics can be recalculated.

## Hard Constraints (override any "best practice" judgment)
- No placeholder data, sample exercises, or default programs. The user populates everything.
- No images anywhere except PWA icons. No `<img>` tags otherwise.
- No emojis, no decorative icons, no animations, no CSS transitions.
- ng2-charts is the only allowed visual enhancement.
- No component libraries (no Angular Material, PrimeNG). Tailwind utility classes only.
- `/internal/**` (analytics internal endpoint) must never be routable through the gateway.
- All `userId` values come from the JWT. Never from request body or query params.
- Every DB migration is additive. No `DROP` statements in any migration file.
- Every PR must pass CI. No force pushes to `main`.
- Maven: no `LATEST`, no version ranges — pin everything in parent `pom.xml`.
- npm: no `^`/`~` prefixes in `package.json` — exact versions only.

## Security Requirements (mandatory before any internet deployment)
1. JWT access token 15 min expiry; refresh token 7 days in HttpOnly+Secure+SameSite=Strict
   cookie. Never in localStorage.
2. BCrypt cost 12 for all passwords.
3. Every query in training/analytics services filters by `userId` from the JWT — a user
   can never reach another user's data regardless of IDs in the request.
4. CORS at gateway: whitelist only `ALLOWED_ORIGIN` env var.
5. Rate limit `/api/v1/auth/**`: 20 req/min per IP.
6. `@Valid` on every controller method accepting a request body.
7. Global `@ControllerAdvice` → RFC 7807 problem details. Never leak stack traces, SQL
   errors, or field names to the client.
8. Security headers on all responses: HSTS, `X-Frame-Options: DENY`,
   `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`.
9. `/internal/**` reachable only from the internal Docker/K8s network; block at gateway.
10. All secrets from env vars. Zero hardcoded credentials. Dependabot enabled.

## Code Standards
- English only: variables, functions, classes, comments, commits, docs.
- Expressive names; only abbreviate `id`, `dto`, `url`, `http`.
- Javadoc on every public class/method, explaining purpose, not restating code.
- DTOs are Java records, always separate from JPA entities.
- No magic numbers — use a `Constants` class or enum.
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`.
- One `@ControllerAdvice` per service. Never swallow exceptions silently.
- Use Java 21 features: records, `switch` expressions, text blocks for SQL in tests.
  Enable `spring.threads.virtual.enabled=true`.
- **Testing (Mandatory)**: Every single change must be fully testable. Follow industry standards: Unit tests (JUnit 5 + Mockito) for all services and controllers. Integration tests (Testcontainers/Spring Boot Test) for critical flows. Frontend testing (Jasmine/Karma) for Angular components and services. No session is complete without passing tests covering the new functionality.

## Domain Essentials
Fixed `BodyPart` enum (Java enum, no table, no CRUD):
`CHEST, BACK, SHOULDERS, BICEPS, TRICEPS, QUADS, HAMSTRINGS, GLUTES, CALVES, CORE, FOREARMS, TRAPS`

Core entities (full fields in `PROJECT_PLAN.md`): `Exercise`, `ExerciseBodyPartTarget`,
`TrainingProgram`, `WeekTemplate`, `DayTemplate`, `DayExercise`, `WorkoutSession`,
`WorkoutSet` (training-service) and `WeeklyVolumeSnapshot`, `ExerciseProgressEntry`
(analytics-service, derived/read-only, written only via the internal event handler).

## API Design (all routes via gateway; JWT required except /auth/login, /auth/register)
```
auth-service:
POST /api/v1/auth/register | login | refresh | logout      GET /api/v1/auth/me

training-service:
GET/POST   /api/v1/training/programs            GET/PUT/DELETE .../programs/{id}
GET/POST   /api/v1/training/programs/{id}/weeks GET/PUT/DELETE .../weeks/{id}
GET/POST   /api/v1/training/weeks/{id}/days      GET/PUT/DELETE .../days/{id}
GET/POST   /api/v1/training/exercises            PUT/DELETE .../exercises/{id}
GET/POST   /api/v1/training/exercises/{id}/targets  PUT/DELETE .../exercise-targets/{id}
GET/POST   /api/v1/training/days/{id}/exercises  PUT/DELETE .../day-exercises/{id}
PATCH      /api/v1/training/days/{id}/exercises/reorder   body: [{id, sortOrder}]
GET/POST   /api/v1/training/sessions?programId=&weekNumber=
GET/DELETE /api/v1/training/sessions/{id}
POST       /api/v1/training/sessions/{id}/complete   → triggers analytics
POST       /api/v1/training/sessions/{id}/sets   PUT/DELETE .../workout-sets/{id}

analytics-service (read-only from client):
GET /api/v1/analytics/volume?programId=&weekNumber=   → [{bodyPart, totalSets}]
GET /api/v1/analytics/progress/{exerciseId}            → [{sessionDate, maxWeightKg, totalVolumeKg, totalSets}]

internal (never through gateway):
POST /internal/events/session-completed   → called by training-service only
```

## Environment Variables (always read from env, never hardcode)
```
POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
JWT_SECRET, JWT_ACCESS_EXPIRY_MINUTES, JWT_REFRESH_EXPIRY_DAYS
ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD
ALLOWED_ORIGIN
AUTH_SERVICE_URL, TRAINING_SERVICE_URL, ANALYTICS_SERVICE_URL
VITE_API_BASE_URL
```

## Working Agreement
Each development session ends with all code committed, all tests passing, and the
full stack running via `docker-compose up`. Before starting a session, open
`PROJECT_PLAN.md` and follow its session checklist, repo structure, exact API routes
and PWA config — this rules file is the constraint layer, not the task list.

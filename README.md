# Yes App - Personal Training Platform

I built Yes App to track my own workouts, manage fitness programs, and analyze long-term progress without relying on third-party subscriptions. It is a personal project architected as a set of backend microservices with an Angular PWA on top, designed from the ground up to be scalable, secure, and easy to iterate on locally.

## Tech Stack

**Backend**
- **Java 21 & Spring Boot 3.3:** Core microservices framework taking advantage of modern Java features.
- **Spring Cloud Gateway:** Centralized entry point, rate limiting, and stateless JWT validation.
- **Spring Security & Hibernate / JPA:** Robust authentication and ORM.

**Frontend**
- **Angular 21:** Standalone components and modern Angular features.
- **TypeScript & RxJS:** Reactive programming for state and data streams.
- **PWA (Progressive Web App):** Installable, native-like user experience.

**Database, Cache & Observability**
- **PostgreSQL 16:** Relational data storage with per-service isolated schemas.
- **Redis 7:** Rate limiting and L2 query caching.
- **Flyway:** Automated, version-controlled database migrations.
- **Prometheus, Grafana, Loki & Promtail:** Centralized observability, log aggregation, and metrics.

**Infrastructure & DevOps**
- **Docker & Docker Compose:** Containerized environments for consistent development and production.
- **GitHub Actions (CI/CD):** Automated testing and multi-stage container builds.
- **AWS Lightsail & Cloudflare Tunnels:** Secure deployment without exposed public ports.

## Key Technical Highlights

- The application is split into independently scalable microservices (Authentication, Training, Analytics) rather than a monolith.
- All external traffic flows through a single Spring Cloud API Gateway, which handles JWT validation statelessly and enforces IP-based rate limiting via Redis.
- Cross-service communication relies on asynchronous fire-and-forget events; for instance, the training service notifies the analytics engine of a completed workout without blocking the user's flow.
- Security is strictly enforced via short-lived access tokens (15m), HttpOnly refresh cookies (7d), and BCrypt password hashing, utilizing environment variables to avoid any hardcoded credentials.
- Automated GitHub Actions pipelines ensure every pull request passes unit tests before building and deploying multi-stage, optimized Docker containers.
- To keep infrastructure costs low, system monitoring collects logs and critical metrics (like p95 response times) efficiently within a strict memory footprint using Prometheus and Loki.
- Custom bash scripts orchestrate a hybrid local development environment, blending Dockerized databases with native JVM/Node execution to enable fast iteration and rapid hot-reloads.

## Local Development Setup

To provide the best developer experience, we use a **Hybrid Approach** for local development. Running 12+ containers locally consumes significant resources and slows down iteration. Instead, we run Postgres and Redis in Docker, while the microservices and Angular frontend run natively for immediate feedback.

**Prerequisites:** Docker, NodeJS 24+, Java 21+, Maven

1. **Clone the repository:**
   ```bash
   git clone https://github.com/JSR-Mario/training-app.git
   cd training-app
   ```

2. **Configure Environment:**
   Copy `.env.example` to `.env.local` and populate the required development credentials. Ensure `JWT_SECRET` is a valid 64-character hexadecimal string.

3. **Start the Environment:**
   ```bash
   ./scripts/start-local.sh
   ```
   *This launches Postgres/Redis via Docker, waits for initialization, and boots all 4 Spring Boot services and the Angular frontend simultaneously with color-coded logs.*
   *Note: For testing data, create your own test account locally or use the built-in admin seed.*

4. **Access the App:**
   - **Frontend (Hot-Reload):** `http://localhost:4200`
   - **API Gateway (Swagger UI):** `http://localhost:8080/swagger-ui.html`

5. **Stop the Environment:**
   Press `Ctrl+C` in the terminal to gracefully shut down the JVM/Node processes and automatically stop the Docker containers. If processes become orphaned, run `./scripts/stop-local.sh` to forcefully clean up the ports.

## Production Replica (Full Docker)

To test the exact infrastructure that runs on the production server (including Prometheus, Grafana, and internal routing), use the full compose file. Ensure you have a populated `.env` file in the root.

```bash
docker compose up -d
```
- **Frontend (Production Bundle):** Accessible via your configured `DOMAIN_NAME` (routed through Cloudflare Tunnel).
- **Grafana Monitoring:** `http://localhost:3000` (accessible locally or via SSH Tunnel if deployed remotely).

## Environment Variables

The application relies strictly on environment variables for all secrets and configurations. Key parameters include:

- `POSTGRES_*` / `REDIS_*`: Database and cache connection details.
- `JWT_SECRET`: 256-bit hexadecimal string for token signing.
- `ADMIN_*`: Credentials to idempotently seed the initial admin user.
- `ALLOWED_ORIGIN`: Strict CORS origin enforcement at the Gateway.
- `CLOUDFLARE_TUNNEL_TOKEN`: Secure ingress token for production deployment.

## Deployment & Infrastructure

The production environment is hosted on an AWS Lightsail instance, secured entirely behind Cloudflare Tunnels (Zero Trust Access). No application ports are exposed to the public internet.

**Automated Backups:**
Host-level cron scripts (`scripts/backup-s3.sh`) push daily Postgres database snapshots to an encrypted AWS S3 bucket. A companion script (`scripts/restore-from-s3.sh`) is provided for disaster recovery and seamless migration across instances.

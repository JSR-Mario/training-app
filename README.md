# Yes App — Cloud-Native Personal Training Platform

Yes App is a comprehensive, microservices-based platform designed for tracking workout sessions, managing exercise programs, and analyzing fitness progress. Built with a modern cloud-native approach, it focuses on scalability, security, and developer experience.

## 🚀 Tech Stack

**Backend**
- **Java 21 & Spring Boot 3.3:** Core microservices framework utilizing Virtual Threads.
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
- **AWS Lightsail/EC2 & Cloudflare Tunnels:** Secure deployment without exposed public ports.

## ✨ Key Technical Highlights

- **Microservices Architecture:** Independently scalable domains (Authentication, Training, Analytics).
- **API Gateway Pattern:** A single ingress point that intercepts traffic to validate JWTs, enforce CORS, and apply IP-based rate limiting via Redis.
- **Event-Driven Analytics:** Asynchronous cross-service communication (fire-and-forget) to track volume and progress without blocking main business flows.
- **Security First:** Short-lived access tokens (15m), HttpOnly refresh cookies (7d), BCrypt password hashing (cost 12), and zero hardcoded credentials.
- **Automated CI/CD:** Continuous Integration pipelines ensure every pull request passes unit tests and builds multi-stage, optimized Docker containers.
- **Centralized Observability:** Proactive system monitoring collecting logs and metrics (500 errors, p95 response times, CPU/RAM usage) within a strict memory budget.
- **Optimized Developer Experience:** Custom bash scripts orchestrate a hybrid local environment that blends Docker for databases with native JVM/Node execution for sub-2-second hot-reloads.

## 💻 Local Development Setup

To provide the best developer experience, we use a **Hybrid Approach** for local development. Running 12+ containers locally consumes significant resources and slows down iteration. Instead, we run Postgres and Redis in Docker, while the microservices and Angular frontend run natively with instant hot-reload.

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
   *This script launches Docker containers for the database/cache, waits for initialization, and uses `concurrently` to boot all 4 Spring Boot services and the Angular frontend in a single terminal with color-coded logs.*

4. **Access the App:**
   - **Frontend (Hot-Reload):** `http://localhost:4200`
   - **API Gateway (Swagger UI):** `http://localhost:8080/swagger-ui.html`

5. **Stop the Environment:**
   Press `Ctrl+C` in the terminal to gracefully shut down the JVM/Node processes and automatically stop the Docker containers. You can also run `./scripts/stop-local.sh` to forcefully clean up orphaned processes and ports.

6. **Sync Production Data (Optional):**
   If you want to test with real data instead of an empty database, run `./scripts/sync-prod-db.sh`. This script will automatically find the latest AWS S3 database backup, download it, wipe your local Postgres volume, and restore the production data.

## 🐳 Production Replica (Full Docker)

To test the exact infrastructure that runs on the production server (including Prometheus, Grafana, and internal routing), use the full compose file. Ensure you have a populated `.env` file in the root.

```bash
docker compose up -d
```
- **Frontend (Production Bundle):** `http://localhost:3000` (or your configured domain)
- **Grafana Monitoring:** `http://localhost:3000` via SSH Tunnel if deployed remotely.

## ⚙️ Environment Variables

The application relies strictly on environment variables for all secrets and configurations. Key parameters include:

- `POSTGRES_*` / `REDIS_*`: Database and cache connection details.
- `JWT_SECRET`: 256-bit hexadecimal string for token signing.
- `ADMIN_*`: Credentials to idempotently seed the initial admin user.
- `ALLOWED_ORIGIN`: Strict CORS origin enforcement at the Gateway.
- `CLOUDFLARE_TUNNEL_TOKEN`: Secure ingress token for production deployment.

## ☁️ Deployment & Infrastructure

The production environment is designed to be hosted on an AWS Linux instance, secured entirely behind Cloudflare Tunnels (Zero Trust Access). No application ports are exposed to the public internet.

**Automated Backups:**
Host-level cron scripts (`scripts/backup-s3.sh`) push daily Postgres database snapshots to an encrypted AWS S3 bucket. A companion script (`scripts/restore-from-s3.sh`) is provided for disaster recovery and seamless migration across instances.

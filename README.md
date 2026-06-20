# Training App

A microservices-based personal training tracker. Built to be a cloud-native, scalable platform for tracking workout sessions, managing exercise programs, and analyzing volume and progress.

---

## Architecture Overview

The system is composed of an API Gateway, three domain-specific microservices, and a frontend PWA. The backend services are backed by a single PostgreSQL instance (with isolated schemas) and Redis for rate limiting.

The frontend is an Angular 18 Progressive Web App that communicates exclusively with the Spring Cloud API Gateway. The Gateway handles JWT validation, CORS, and Rate Limiting. Once authenticated, the Gateway routes requests to the appropriate microservice (Auth, Training, or Analytics). When a user completes a workout, the Training service asynchronously notifies the Analytics service to pre-calculate progress and volume metrics.

### Containerization & Deployment
- **Docker & Docker Compose**: The entire stack runs seamlessly in Docker. `docker-compose.yml` serves as the core orchestrator for local deployments.
- **Multi-Stage Builds**: Every service uses optimized multi-stage Dockerfiles. The frontend compiles via Node.js and serves statically via Nginx, while Java services build via Maven and run on lightweight JRE containers.
- **CI/CD Pipeline**: GitHub Actions workflows run on every PR to validate tests and compile modules. Upon merge to `main`, the CD pipeline builds and pushes the Docker images to a Container Registry.

---

## Local Development Setup

**Prerequisites:** Docker, Docker Compose

**Quick start:**

```bash
git clone https://github.com/JSR-Mario/training-app.git
cd training-app
# Ensure you have a populated .env file in the root
docker-compose up -d
```
The application will be available at `http://localhost:3000` (Frontend) and `http://localhost:8080` (API Gateway).

**Dev mode** (exposes internal ports for direct DB/Redis access):

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

---

## Environment Variables

All secrets and variables are managed via the `.env` file. See `.env.example` for the template.
Ensure `JWT_SECRET`, `POSTGRES_PASSWORD`, and `REDIS_PASSWORD` are set to strong, secure values in production.

---

## API Reference

All external requests must go through the API Gateway at port `8080`.
Swagger UI is available at: `http://localhost:8080/swagger-ui.html`

- **Auth Service**: `/api/v1/auth/**` (Register, Login, Refresh, Me)
- **Training Service**: `/api/v1/training/**` (Programs, Weeks, Days, Exercises, Sessions)
- **Analytics Service**: `/api/v1/analytics/**` (Volume, Progress)

---

## Security Notes

1. **Tokens**: JWT access token has a 15-minute expiry. Refresh token is a 7-day HttpOnly, Secure, SameSite=Strict cookie. Never stored in localStorage.
2. **Passwords**: BCrypt cost factor 12 for all passwords.
3. **Data Isolation**: Every query filters by `userId` extracted from the JWT.
4. **Rate Limiting**: Gateway limits `/api/v1/auth/**` to 20 requests/minute per IP via Redis.
5. **Headers**: Security headers added via Gateway (`Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`).
6. **Internal Traffic**: The analytics internal endpoint (`/internal/**`) is strictly blocked at the gateway level.

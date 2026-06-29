# Training App

A microservices-based personal training tracker. Built to be a cloud-native, scalable platform for tracking workout sessions, managing exercise programs, and analyzing volume and progress.

---

## Architecture Overview

![Architecture Diagram](docs/architecture.drawio.png)

The system is composed of an API Gateway, three domain-specific microservices, and a frontend PWA. The backend services are backed by a single PostgreSQL instance (with isolated schemas) and Redis for rate limiting.

The frontend is an Angular 21 Progressive Web App that communicates exclusively with the Spring Cloud API Gateway. The Gateway handles JWT validation, CORS, and Rate Limiting. Once authenticated, the Gateway routes requests to the appropriate microservice (Auth, Training, or Analytics). When a user completes a workout, the Training service asynchronously notifies the Analytics service to pre-calculate progress and volume metrics.

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
6. **Internal Traffic**: The analytics internal endpoint (`/internal/**`) is strictly blocked at the gateway level.

---

## Deployment Guide (EC2 + DuckDNS)

This application is designed to be deployed using Docker Compose on any standard Linux VM. It includes a **Caddy** web server that automatically provisions free HTTPS certificates using Let's Encrypt, and routes traffic so that both the Frontend and the Backend share the exact same domain.

**Steps to deploy to a new EC2 instance:**
1. Provision an EC2 instance (e.g., Ubuntu 22.04 LTS).
2. Open ports `22` (SSH), `80` (HTTP), and `443` (HTTPS) in your AWS Security Group. Ensure ports `8080`, `3000`, `5432` and `6379` remain **closed** to the public.
3. Register a free domain on [DuckDNS](https://www.duckdns.org) (e.g., `my-app.duckdns.org`) and point it to your EC2 Public IP.
4. SSH into your instance and install Docker, Docker Compose, and Git.
5. Clone this repository: `git clone https://github.com/JSR-Mario/training-app.git`
6. Copy `.env.example` to `.env` and configure:
   - Secure passwords and a random 256-bit hex JWT secret.
   - `DOMAIN_NAME` to your DuckDNS domain.
   - `ALLOWED_ORIGIN` to `https://${DOMAIN_NAME}`.
   - `COOKIE_SECURE=true`.
7. Run `docker compose up -d --build`. The multi-stage Dockerfiles will handle compiling the Java backends and the Angular frontend directly on the server, and Caddy will automatically secure your site with HTTPS!

---

## CI/CD Pipeline

The project uses GitHub Actions for continuous integration and continuous deployment:

- **CI (`ci.yml`)**: Runs automatically on pull requests and pushes to `main`. It checks out the code, sets up Java and Node, runs Maven verify (tests + build), and runs `npm lint` + `npm run build` for the frontend. PRs cannot be merged if these checks fail.
- **CD (`cd.yml`)**: Runs automatically when code is merged into `main`. It connects to the configured EC2 instance via SSH and automatically pulls the latest code and rebuilds the containers (`docker compose up -d --build`). This requires `EC2_HOST`, `EC2_USERNAME`, and `EC2_SSH_KEY` to be configured in GitHub repository secrets.

---

## Database Backups & Restore

Automated, cost-effective daily database backups to AWS S3 are configured via host-level Cron scripts.

**Setup Requirements:**
1. Create an AWS S3 Bucket (e.g., `s3://your-db-backups`).
2. Add the bucket URI to your server's `.env` file: `S3_BUCKET="s3://your-db-backups"`.
3. Configure `aws-cli` on the EC2 instance with an IAM user that has `s3:PutObject` and `s3:GetObject` permissions.
4. Add the following line to `crontab -e` to run daily at 3:00 AM:
   `0 3 * * * cd /home/ubuntu/training-app && ./scripts/backup-s3.sh >> /home/ubuntu/db-backup.log 2>&1`

**Restoring from S3:**
To restore a backup, simply pass the target date (YYYY-MM-DD) or the full S3 URI to the restore script:
```bash
./scripts/restore-from-s3.sh 2026-06-25
```
This will automatically find the correct file, download it, decompress it, and restore it into the local PostgreSQL container.

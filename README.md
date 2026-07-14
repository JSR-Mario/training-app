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
- **Training Service**: `/api/v1/training/**` (Programs, Weeks, Days, Exercises, Sessions, Dashboard, Body Weight, Cardio Logs)
- **Analytics Service**: `/api/v1/analytics/**` (Volume, Progress)

---

## Security Notes

1. **Tokens**: JWT access token has a 15-minute expiry. Refresh token is a 7-day HttpOnly, Secure, SameSite=Strict cookie. Never stored in localStorage.
2. **Passwords**: BCrypt cost factor 12 for all passwords.
3. **Data Isolation**: Every query filters by `userId` extracted from the JWT.
4. **Rate Limiting**: Gateway limits `/api/v1/auth/**` to 20 requests/minute per IP via Redis.
6. **Internal Traffic**: The analytics internal endpoint (`/internal/**`) is strictly blocked at the gateway level.

---

## Versioning

The project follows [Semantic Versioning (SemVer)](https://semver.org/).
- Pre-release versions (during active initial development) are kept below `1.0.0` (e.g., `v0.1.0`, `v0.9.0`).
- The frontend application explicitly displays this version in the UI.

---

## Deployment Guide (EC2 + Cloudflare Tunnel)

This application is designed to be deployed using Docker Compose on any standard Linux VM. It uses **Cloudflare Tunnels** to provide secure, encrypted HTTPS access without exposing *any* public ports on your server. **Caddy** acts as an internal reverse proxy to route traffic between the frontend and the backend over a shared local Docker network.

**Steps to deploy to a new EC2 instance:**
1. Provision an EC2 instance (e.g., Ubuntu 22.04 LTS).
2. Open **only** port `22` (SSH) in your AWS Security Group. All other ports (`80`, `443`, `8080`, `3000`, `5432`, `6379`) must remain **closed** to the public. Cloudflare will handle ingress securely via outbound tunnel connections.
3. In your Cloudflare Dashboard (Zero Trust), create a new Tunnel and configure a Public Hostname to point to `http://caddy:80`. Copy your Tunnel Token.
4. SSH into your instance and install Docker, Docker Compose, and Git.
5. Clone this repository: `git clone https://github.com/JSR-Mario/training-app.git`
6. Copy `.env.example` to `.env` and configure:
   - Secure passwords and a random 256-bit hex JWT secret.
   - `DOMAIN_NAME` and `ALLOWED_ORIGIN` to your Cloudflare Public Hostname (e.g., `app.yourdomain.com`).
   - `CLOUDFLARE_TUNNEL_TOKEN` with the token generated in step 3.
   - `COOKIE_SECURE=true`.
7. Run `docker compose up -d --build`. The multi-stage Dockerfiles will handle compiling the Java backends and the Angular frontend directly on the server, and Cloudflare will automatically secure your site with HTTPS!

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

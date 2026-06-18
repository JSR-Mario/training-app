# =============================================================
# api-gateway — Multi-stage Dockerfile
# Build context must be the project root (see docker-compose.yml).
# =============================================================

# ---- Stage 1: Build ----
FROM maven:3.9.6-eclipse-temurin-21 AS builder
WORKDIR /build

# Copy parent POM and all module POMs first so dependency resolution
# is cached independently of source code changes.
COPY pom.xml ./
COPY services/api-gateway/pom.xml     services/api-gateway/
COPY services/auth-service/pom.xml    services/auth-service/
COPY services/training-service/pom.xml services/training-service/
COPY services/analytics-service/pom.xml services/analytics-service/

# Download all dependencies for this module and its parents (cached layer).
RUN mvn dependency:go-offline -pl services/api-gateway -am -B --no-transfer-progress

# Copy source and build the executable JAR.
COPY services/api-gateway/src services/api-gateway/src
RUN mvn -pl services/api-gateway -am package -DskipTests -B --no-transfer-progress

# ---- Stage 2: Runtime ----
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Run as a non-root user for security.
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

COPY --from=builder /build/services/api-gateway/target/*.jar app.jar

USER appuser
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]

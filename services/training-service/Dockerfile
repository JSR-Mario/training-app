# =============================================================
# training-service — Multi-stage Dockerfile
# Build context must be the project root (see docker-compose.yml).
# =============================================================

# ---- Stage 1: Build ----
FROM maven:3.9.6-eclipse-temurin-21 AS builder
WORKDIR /build

COPY pom.xml ./
COPY services/api-gateway/pom.xml     services/api-gateway/
COPY services/auth-service/pom.xml    services/auth-service/
COPY services/training-service/pom.xml services/training-service/
COPY services/analytics-service/pom.xml services/analytics-service/

RUN mvn dependency:go-offline -pl services/training-service -am -B --no-transfer-progress

COPY services/training-service/src services/training-service/src
RUN mvn -pl services/training-service -am package -DskipTests -B --no-transfer-progress

# ---- Stage 2: Runtime ----
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

COPY --from=builder /build/services/training-service/target/*.jar app.jar

USER appuser
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "app.jar"]

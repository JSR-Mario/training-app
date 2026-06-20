# Build stage
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
# Copy the whole backend project (frontend and others ignored via .dockerignore)
COPY . .
RUN mvn clean package -pl services/api-gateway -am -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring
WORKDIR /app
COPY --from=build /app/services/api-gateway/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]

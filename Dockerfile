# CareLink single image: the front-end build output is packaged into the backend jar,
# so one container runs the whole application. This matches the monolithic backend the
# proposal describes, and keeps a staging deployment down to a single service.

# ---------- 1. Build the front end ----------
FROM node:22-alpine AS frontend
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------- 2. Build the backend ----------
FROM eclipse-temurin:25-jdk AS backend
WORKDIR /src
# Copy only the pom and wrapper first so the dependency layer stays cacheable
COPY backend/.mvn/ .mvn/
COPY backend/mvnw backend/pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -ntp dependency:go-offline
COPY backend/src ./src
# Put the front-end output in static so Spring serves it directly
COPY --from=frontend /app/dist ./src/main/resources/static
RUN ./mvnw -B -ntp clean package -DskipTests

# ---------- 3. Runtime ----------
FROM eclipse-temurin:25-jre
# curl is needed for the container health check; the base image does not ship it, and
# without it the compose healthcheck can never pass. Also create a non-root user to run
# the application, as a minimum container-security measure.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --system --uid 1001 --create-home carelink
WORKDIR /app
COPY --from=backend /src/target/*.jar app.jar
RUN chown carelink:carelink /app/app.jar
USER carelink
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

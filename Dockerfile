# CareLink 单体镜像：前端构建产物打进后端 jar，一个容器跑整个应用。
# 与提案「monolithic backend」的定位一致，也让 staging 部署只需要起一个服务。

# ---------- 1. 构建前端 ----------
FROM node:22-alpine AS frontend
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------- 2. 构建后端 ----------
FROM eclipse-temurin:25-jdk AS backend
WORKDIR /src
# 先只拷 pom 与 wrapper，让依赖层能被 Docker 缓存住
COPY backend/.mvn/ .mvn/
COPY backend/mvnw backend/pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -ntp dependency:go-offline
COPY backend/src ./src
# 前端产物放进 static，由 Spring 直接提供
COPY --from=frontend /app/dist ./src/main/resources/static
RUN ./mvnw -B -ntp clean package -DskipTests

# ---------- 3. 运行 ----------
FROM eclipse-temurin:25-jre
# curl 用于容器健康检查：基础镜像不带，不装的话 compose 的 healthcheck 永远失败。
# 同时建一个非 root 用户跑应用——最低限度的容器安全。
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

FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline -B -q

COPY src ./src
RUN mvn package -DskipTests -B -q

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN apk add --no-cache su-exec \
    && adduser -D -u 1000 -s /bin/sh appuser
COPY --from=build /app/target/*.jar app.jar
COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["/entrypoint.sh"]

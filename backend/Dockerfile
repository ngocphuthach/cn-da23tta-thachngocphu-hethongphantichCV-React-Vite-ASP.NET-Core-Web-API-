FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY CvAdvisor.Api.csproj ./
RUN dotnet restore CvAdvisor.Api.csproj

COPY . ./
RUN dotnet publish CvAdvisor.Api.csproj -c Release -o /out --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

# curl is installed solely for the container healthcheck.
USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /app/storage \
    && chown -R $APP_UID:$APP_UID /app/storage

COPY --from=build --chown=$APP_UID:$APP_UID /out/ ./
USER $APP_UID
RUN test -w /app/storage

ENTRYPOINT ["dotnet", "CvAdvisor.Api.dll"]

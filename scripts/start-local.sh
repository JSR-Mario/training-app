#!/bin/bash

# Salir inmediatamente si ocurre un error
set -e

echo "🚀 Iniciando Entorno de Desarrollo Local Híbrido..."

# 1. Cargar variables de entorno automáticamente
if [ -f ".env.local" ]; then
    echo "📦 Cargando .env.local..."
    set -a
    source .env.local
    set +a
else
    echo "⚠️  No se encontró .env.local. Los servicios podrían fallar si faltan credenciales."
fi

# Activar perfil de desarrollo de Spring Boot
export SPRING_PROFILES_ACTIVE=dev

# Función para apagar Docker automáticamente al detener el script
cleanup() {
    echo ""
    echo "🛑 Deteniendo infraestructura Docker (Postgres y Redis)..."
    docker compose -f docker-compose.local-infra.yml stop
    echo "👋 Entorno local detenido por completo."
}
trap cleanup EXIT

# 2. Levantar Infraestructura Docker (Postgres y Redis)
echo "🐳 Levantando Postgres y Redis (Docker)..."
docker compose -f docker-compose.local-infra.yml up -d

# 3. Usar 'concurrently' para correr los 5 procesos y agrupar los logs con colores
echo "🔥 Arrancando microservicios y frontend..."
echo "💡 (Presiona Ctrl+C en cualquier momento para detener todos los servicios a la vez)"
echo ""

npx concurrently \
    -n "auth,training,analy,gateway,frontend" \
    -c "red,green,yellow,blue,magenta" \
    "cd services/auth-service && mvn spring-boot:run -Dspring-boot.run.jvmArguments='-Xmx512m'" \
    "cd services/training-service && mvn spring-boot:run -Dspring-boot.run.jvmArguments='-Xmx512m'" \
    "cd services/analytics-service && mvn spring-boot:run -Dspring-boot.run.jvmArguments='-Xmx512m'" \
    "cd services/api-gateway && mvn spring-boot:run -Dspring-boot.run.jvmArguments='-Xmx512m'" \
    "cd frontend && npm start"

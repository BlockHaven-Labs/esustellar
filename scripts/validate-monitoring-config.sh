#!/usr/bin/env bash
set -e

echo "=================================================="
echo "🔍 Validating Centralised Logging Configuration"
echo "=================================================="

# Check presence of required files
FILES=(
  "monitoring/loki-config.yaml"
  "monitoring/promtail-config.yaml"
  "infra/monitoring/loki/loki-config.yaml"
  "infra/monitoring/promtail/promtail-config.yaml"
  "infra/monitoring/grafana/datasources/datasources.yaml"
  "k8s/monitoring/loki.yaml"
  "k8s/monitoring/promtail.yaml"
  "docker-compose.yml"
)

ERRORS=0

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ Found: $file"
  else
    echo "❌ Missing: $file"
    ERRORS=$((ERRORS + 1))
  fi
done

# Validate docker-compose syntax if docker compose or docker-compose is installed
if command -v docker >/dev/null 2>&1 && docker compose config >/dev/null 2>&1; then
  echo "✅ Docker compose syntax check passed."
elif command -v docker-compose >/dev/null 2>&1 && docker-compose config >/dev/null 2>&1; then
  echo "✅ Docker-compose syntax check passed."
fi

# Check Loki datasource configuration
if grep -q "type: loki" infra/monitoring/grafana/datasources/datasources.yaml; then
  echo "✅ Loki datasource verified in Grafana configuration."
else
  echo "❌ Loki datasource missing from Grafana configuration!"
  ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -eq 0 ]; then
  echo "🎉 All log aggregation configuration checks PASSED!"
  exit 0
else
  echo "❌ Log aggregation configuration checks FAILED with $ERRORS errors."
  exit 1
fi

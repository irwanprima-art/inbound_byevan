#!/bin/sh
set -e

echo "==> Queue worker: waiting for database and migrations..."

# Wait for PostgreSQL
while ! nc -z postgres 5432; do
  echo "    PostgreSQL not ready, retrying in 2s..."
  sleep 2
done

# Wait for migrations (check if a known table exists)
echo "==> Waiting for migrations to complete..."
MAX_RETRIES=30
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
  if php artisan migrate:status 2>/dev/null | grep -q "Ran"; then
    echo "==> Migrations are done!"
    break
  fi
  echo "    Migrations not ready yet, retrying in 3s... ($RETRY/$MAX_RETRIES)"
  RETRY=$((RETRY + 1))
  sleep 3
done

echo "==> Starting queue worker..."
exec php artisan queue:work --sleep=3 --tries=3 --timeout=90

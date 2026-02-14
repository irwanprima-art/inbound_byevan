#!/bin/sh
set -e

echo "==> Waiting for MySQL to be ready..."
while ! nc -z mysql 3306; do
  echo "    MySQL not ready, retrying in 2s..."
  sleep 2
done
echo "==> MySQL is ready!"

# Clear stale caches
echo "==> Clearing stale caches..."
php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true

# Run database migrations
echo "==> Running database migrations..."
php artisan migrate --force

# Production optimizations
echo "==> Caching configuration for production..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "==> Application ready! Starting PHP-FPM..."
exec php-fpm

#!/usr/bin/env bash
#
# BookWise API container entrypoint.
# Prepares the runtime environment, then execs the container command
# (supervisord for the web service, artisan workers for the worker service).
set -e

cd /var/www/html

PORT="${PORT:-8080}"

# 1. Render the nginx config with the runtime port.
if [ -f /etc/nginx/nginx.conf.template ]; then
    sed "s/__PORT__/${PORT}/g" /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
fi

# 2. Make sure Laravel's writable directories exist and are owned correctly.
mkdir -p storage/framework/cache/data storage/framework/sessions \
         storage/framework/views storage/framework/testing \
         storage/logs storage/app/public bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
chmod -R ug+rwx storage bootstrap/cache

# 3. Laravel expects an .env file to exist; on Render all values come from
#    real environment variables, so an empty .env is enough.
if [ ! -f .env ]; then
    touch .env
fi

if [ -z "${APP_KEY}" ]; then
    echo "[entrypoint] WARNING: APP_KEY is not set — set it in your host environment." >&2
fi

# 4. Public storage symlink (public/storage is gitignored).
php artisan storage:link --force >/dev/null 2>&1 || true

# 5. Cache config with the *runtime* environment (safe to repeat on boot).
php artisan package:discover --ansi >/dev/null 2>&1 || true
php artisan config:cache >/dev/null

# NOTE: route:cache is intentionally skipped — routes/api.php registers a
# Closure route which cannot be serialized into the route cache.

exec "$@"

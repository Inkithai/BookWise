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

# 6. Apply pending migrations when asked (web service only).
#    Render's preDeployCommand is a paid-plan feature, so on the free plan the
#    web container migrates itself before it starts serving. Gated on an env
#    var so the worker and one-off containers never run migrations in parallel
#    with the web service.
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    echo "[entrypoint] Applying database migrations..."
    attempt=1
    until php artisan migrate --force --no-interaction; do
        if [ "$attempt" -ge 5 ]; then
            echo "[entrypoint] Migrations failed after ${attempt} attempts — aborting boot." >&2
            exit 1
        fi
        echo "[entrypoint] Migration attempt ${attempt} failed; retrying in 5s..." >&2
        attempt=$((attempt + 1))
        sleep 5
    done
    echo "[entrypoint] Migrations up to date."
fi

# 7. Optionally wait for the schema before starting long-lived processes.
#    The worker service sets WAIT_FOR_SCHEMA=true: the web container performs
#    the migrations, and the worker must not crash-loop against a database
#    that is still being built on the first deploy.
if [ "${WAIT_FOR_SCHEMA:-false}" = "true" ]; then
    echo "[entrypoint] Waiting for the database schema..."
    until php artisan migrate:status >/dev/null 2>&1; do
        echo "[entrypoint] Schema not ready yet; retrying in 5s..." >&2
        sleep 5
    done
    echo "[entrypoint] Database schema is present."
fi

exec "$@"

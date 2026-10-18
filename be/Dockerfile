# syntax=docker/dockerfile:1
#
# BookWise API — production image for Render (or any Docker host).
# nginx + php-fpm + supervisor in a single container. The same image runs the
# queue worker + scheduler via dockerCommand (supervisord-worker.conf) — see
# render.yaml. Database migrations are applied by docker/entrypoint.sh when
# RUN_MIGRATIONS=true (the free Render plan has no pre-deploy step).

FROM composer:2 AS composerbin

FROM php:8.3-fpm-alpine

# ── Runtime libraries + PHP extensions ────────────────────────────────────
RUN apk add --no-cache \
        bash \
        nginx \
        supervisor \
        libpq \
        icu-libs \
        libzip \
        libpng \
        freetype \
        libjpeg-turbo \
    && apk add --no-cache --virtual .build-deps \
        $PHPIZE_DEPS \
        postgresql-dev \
        icu-dev \
        libzip-dev \
        libpng-dev \
        freetype-dev \
        libjpeg-turbo-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_pgsql \
        pdo_mysql \
        bcmath \
        intl \
        gd \
        zip \
        opcache \
        pcntl \
    && apk del .build-deps

COPY --from=composerbin /usr/bin/composer /usr/bin/composer

# ── PHP / php-fpm configuration ───────────────────────────────────────────
COPY docker/php-app.ini /usr/local/etc/php/conf.d/zz-bookwise.ini
# Let php-fpm workers inherit the container environment (Render injects all
# app config as env vars; Laravel's env() must see them).
RUN { \
        echo 'clear_env = no'; \
        echo 'pm = ondemand'; \
        echo 'pm.max_children = 10'; \
        echo 'pm.process_idle_timeout = 10s'; \
    } >> /usr/local/etc/php-fpm.d/www.conf

# ── Application code + composer dependencies ──────────────────────────────
WORKDIR /var/www/html

ENV COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_NO_INTERACTION=1

# Install vendors first (better layer caching), without running scripts yet.
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --prefer-dist --optimize-autoloader

COPY . .

# Regenerate the optimized autoloader (classmap) against the real source tree.
# NOTE: `dump-autoload` spells the flag `--optimize` (`-o`); the long form
# `--optimize-autoloader` is only valid for `composer install`/`update` and
# made the image build fail with "The --optimize-autoloader option does not
# exist".
RUN composer dump-autoload --optimize --no-dev --no-scripts \
    && mkdir -p storage/framework/cache/data storage/framework/sessions \
              storage/framework/views storage/framework/testing \
              storage/logs storage/app/public bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rwx storage bootstrap/cache

# ── nginx + supervisor + entrypoint ───────────────────────────────────────
COPY docker/nginx.conf.template /etc/nginx/nginx.conf.template
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/supervisord-worker.conf /etc/supervisord-worker.conf
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Render injects $PORT at runtime; 8080 is the local default.
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
CMD ["supervisord", "-n", "-c", "/etc/supervisord.conf"]

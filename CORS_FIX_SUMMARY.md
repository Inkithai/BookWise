# CORS Fix Summary

## Problem
The frontend at `https://bookwise-theta-six.vercel.app` was getting a CORS error when trying to access the backend API at `https://bookwise-api.onrender.com/api/v1/admin/auth/validate-registration`:

```
Access to XMLHttpRequest at 'https://bookwise-api.onrender.com/api/v1/admin/auth/validate-registration' 
from origin 'https://bookwise-theta-six.vercel.app' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Root Cause
The Laravel backend was not properly configured with CORS middleware, preventing cross-origin requests from the Vercel frontend.

## Solution

### 1. CORS package — use the framework's built-in middleware (fixed)
Laravel 12 ships `Illuminate\Http\Middleware\HandleCors` backed by `fruitcake/php-cors`,
which is already a `laravel/framework` dependency in `composer.lock`. The standalone
`fruitcake/laravel-cors` package must **not** be added to `composer.json`: it was added
there without updating `composer.lock`, which made the Docker build fail at
`composer install` ("Required package fruitcake/laravel-cors is not present in the lock
file"), and v3 does not support Laravel 12 anyway.

### 2. Registered CORS Middleware
Updated `be/bootstrap/app.php` to register the CORS middleware in the global middleware stack:
```php
$middleware->prepend(\Illuminate\Http\Middleware\HandleCors::class);
```

Also updated `be/app/Http/Kernel.php` to include the CORS middleware in the global middleware stack:
```php
\Illuminate\Http\Middleware\HandleCors::class,
```

### 3. Updated CORS Configuration
Updated `be/config/cors.php` to:
- Set default allowed origins to include the Vercel frontend URL
- Updated the configuration comments to reflect the actual production URLs

### 4. Updated Environment Configuration
Updated `be/.env.example` to include the Vercel frontend URL in the CORS allowed origins:
```
CORS_ALLOWED_ORIGINS=https://bookwise-theta-six.vercel.app,http://localhost:3000
```

## Deployment Steps

1. **Install dependencies (no extra CORS package needed):**
   ```bash
   cd /home/user/BookWise/be
   composer install
   ```

2. **Update the .env file on Render:**
   Add or update the following line in your Render environment variables:
   ```
   CORS_ALLOWED_ORIGINS=https://bookwise-theta-six.vercel.app,https://bookwise.vercel.app,http://localhost:3000
   ```

3. **Clear configuration cache (if needed):**
   ```bash
   php artisan config:clear
   ```

4. **Redeploy the backend API on Render**

## Files Modified

1. `be/composer.json` - No CORS package added (framework built-in is used; keeps composer.lock in sync)
2. `be/bootstrap/app.php` - Registered CORS middleware
3. `be/app/Http/Kernel.php` - Added CORS middleware to global stack
4. `be/config/cors.php` - Updated default allowed origins
5. `be/.env.example` - Updated CORS configuration example

## Testing

After deployment, test the CORS headers by making a request from the frontend or using curl:

```bash
curl -I -X OPTIONS https://bookwise-api.onrender.com/api/v1/admin/auth/validate-registration \
  -H "Origin: https://bookwise-theta-six.vercel.app" \
  -H "Access-Control-Request-Method: POST"
```

You should see the `Access-Control-Allow-Origin` header in the response.

## Notes

- The CORS middleware must be registered in the **global** middleware stack (not just the API group) to ensure it runs on all requests, including OPTIONS preflight requests.
- The `config/cors.php` file has a default fallback that allows `https://bookwise-theta-six.vercel.app` even if the environment variable is not set.
- For production security, it's recommended to explicitly set the `CORS_ALLOWED_ORIGINS` environment variable rather than relying on the wildcard or default values.

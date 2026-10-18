# CORS Fix - Deployment Checklist

## ✅ Changes Made to Repository

The following files have been modified to fix the CORS issue:

1. **`be/composer.json`** - Added `fruitcake/laravel-cors: ^3.0` package
2. **`be/bootstrap/app.php`** - Registered CORS middleware in Laravel 12 middleware configuration
3. **`be/app/Http/Kernel.php`** - Added CORS middleware to global middleware stack
4. **`be/config/cors.php`** - Updated default allowed origins to include production frontend URLs
5. **`be/.env.example`** - Updated CORS configuration example

## 🚀 Deployment Steps

### Step 1: Install Dependencies

On your local machine or CI/CD pipeline:

```bash
cd /home/user/BookWise/be
composer install
```

This will install the `fruitcake/laravel-cors` package.

### Step 2: Update Render Environment Variables

Go to your Render dashboard for the `bookwise-api` service and:

1. Navigate to **Environment** tab
2. Add or update the following environment variable:
   
   **Key:** `CORS_ALLOWED_ORIGINS`
   **Value:** `https://bookwise-theta-six.vercel.app,https://bookwise.vercel.app,http://localhost:3000`

   > **Note:** Include all frontend URLs that need to access your API. You can add more by separating them with commas.

### Step 3: Redeploy Backend API

Trigger a redeployment of your backend API on Render:

1. Go to your Render dashboard
2. Navigate to the `bookwise-api` service
3. Click **Manual Deploy** → **Deploy Latest Commit**
4. Wait for the deployment to complete

### Step 4: Verify CORS Headers

After deployment, verify that CORS headers are working:

#### Option A: Using curl
```bash
curl -I -X OPTIONS https://bookwise-api.onrender.com/api/v1/admin/auth/validate-registration \
  -H "Origin: https://bookwise-theta-six.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

Look for these headers in the response:
- `Access-Control-Allow-Origin: https://bookwise-theta-six.vercel.app`
- `Access-Control-Allow-Methods: *`
- `Access-Control-Allow-Headers: *`

#### Option B: Using browser DevTools
1. Open your frontend at `https://bookwise-theta-six.vercel.app`
2. Open Developer Tools (F12)
3. Go to the Network tab
4. Perform the action that triggers the API call to `/api/v1/admin/auth/validate-registration`
5. Click on the request and check the Response Headers
6. Verify you see `Access-Control-Allow-Origin: https://bookwise-theta-six.vercel.app`

#### Option C: Using Postman or similar tool
Send a POST request to `https://bookwise-api.onrender.com/api/v1/admin/auth/validate-registration` with the header:
- `Origin: https://bookwise-theta-six.vercel.app`

Check that the response includes the CORS headers.

## 📝 Additional Configuration (Optional)

### For Multiple Frontend Environments

If you have multiple frontend environments (staging, production, etc.), update the `CORS_ALLOWED_ORIGINS` environment variable to include all of them:

```
CORS_ALLOWED_ORIGINS=https://bookwise-theta-six.vercel.app,https://bookwise.vercel.app,https://staging.bookwise.app,http://localhost:3000
```

### For Credentialed Requests

If your frontend needs to send cookies or authentication headers, you may need to enable CORS credentials support:

Add to your Render environment:
```
CORS_SUPPORTS_CREDENTIALS=true
```

And update `be/config/cors.php`:
```php
'supports_credentials' => env('CORS_SUPPORTS_CREDENTIALS', true),
```

## ⚠️ Troubleshooting

### If CORS errors persist after deployment:

1. **Check Render logs:**
   - Go to Render dashboard → bookwise-api service → Logs
   - Look for any errors during startup

2. **Verify middleware is loaded:**
   - The CORS middleware should appear in the list when the app boots

3. **Clear configuration cache:**
   - Add a build command in Render to clear config cache:
   ```bash
   php artisan config:clear
   ```

4. **Check for typos:**
   - Ensure the environment variable name is exactly `CORS_ALLOWED_ORIGINS` (case-sensitive)

5. **Test with wildcard temporarily:**
   - Set `CORS_ALLOWED_ORIGINS=*` temporarily to verify if the middleware is working
   - If this works, then the issue is with your origin configuration

### Common Issues:

- **Missing vendor directory:** If dependencies weren't installed before deployment, the CORS middleware class won't exist. Ensure `composer install` runs during deployment.

- **Cache issues:** Laravel may have cached the old configuration. Clear cache with `php artisan config:clear`.

- **Middleware order:** CORS middleware should be registered early in the global middleware stack (which we've done with `prepend`).

## 📞 Support

If you continue to experience issues after following these steps, please provide:
1. The exact error message from the browser console
2. The response headers from the API (from DevTools or curl)
3. Your current Render environment variables (with sensitive values redacted)

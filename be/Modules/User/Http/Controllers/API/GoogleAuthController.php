<?php

namespace Modules\User\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Host;
use App\Models\HostUser;
use App\Models\HostUserDetail;
use App\Models\Team;
use App\Models\UserSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Modules\Invoice\Models\InvoiceCompany;
use Modules\User\Http\Resources\UserResource;
use Modules\User\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Throwable;

class GoogleAuthController extends Controller
{
    /**
     * Redirect URI that was registered in Google Cloud Console.
     * Reads GOOGLE_REDIRECT_URI from .env — NOT GOOGLE_REDIRECT_URL.
     */
    private function redirectUri(): string
    {
        $uri = env('GOOGLE_REDIRECT_URI');

        if ($uri) {
            return $uri;
        }

        // Fallback: build from FRONTEND_URL
        $frontendUrl = rtrim(env('FRONTEND_URL', 'http://localhost:3000'), '/');
        return $frontendUrl . '/auth/google/callback';
    }

    /**
     * GET /api/v1/admin/auth/google/redirect
     * Builds the Google OAuth consent URL and returns it as JSON.
     * Does NOT use Socialite at all — avoids redirect_uri override issues.
     */
    public function redirect(): JsonResponse
    {
        try {
            $clientId    = env('GOOGLE_CLIENT_ID');
            $redirectUri = $this->redirectUri();

            Log::info('[Google] redirect() called', [
                'client_id'    => $clientId ? substr($clientId, 0, 8) . '...' : 'MISSING',
                'redirect_uri' => $redirectUri,
            ]);

            if (!$clientId) {
                return response()->json([
                    'success' => false,
                    'message' => 'GOOGLE_CLIENT_ID is not configured in .env',
                ], 500);
            }

            $params = http_build_query([
                'client_id'     => $clientId,
                'redirect_uri'  => $redirectUri,
                'response_type' => 'code',
                'scope'         => 'openid email profile',
                'access_type'   => 'online',
                'prompt'        => 'select_account',
            ]);

            $url = 'https://accounts.google.com/o/oauth2/v2/auth?' . $params;

            return response()->json(['url' => $url]);

        } catch (Throwable $e) {
            Log::error('[Google] redirect() exception: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to generate Google login URL.'], 500);
        }
    }

    /**
     * GET /api/v1/admin/auth/google/callback?code=...
     * Exchanges the code for tokens using a direct HTTP call to Google.
     * Does NOT use Socialite — avoids all redirect_uri mismatch issues.
     */
    public function callback(Request $request): JsonResponse
    {
        try {
            $code = $request->query('code');

            Log::info('[Google] callback() called', [
                'has_code'     => !empty($code),
                'redirect_uri' => $this->redirectUri(),
                'client_id'    => env('GOOGLE_CLIENT_ID') ? 'set' : 'MISSING',
                'client_secret'=> env('GOOGLE_CLIENT_SECRET') ? 'set' : 'MISSING',
            ]);

            if (!$code) {
                return response()->json([
                    'success' => false,
                    'message' => 'No authorisation code provided.',
                ], 422);
            }

            // ── Step 1: Exchange code for access token ───────────────────
            $tokenPayload = [
                'code'          => $code,
                'client_id'     => env('GOOGLE_CLIENT_ID'),
                'client_secret' => env('GOOGLE_CLIENT_SECRET'),
                'redirect_uri'  => $this->redirectUri(),
                'grant_type'    => 'authorization_code',
            ];

            Log::info('[Google] Sending token exchange request', [
                'redirect_uri' => $tokenPayload['redirect_uri'],
                'has_code'     => !empty($tokenPayload['code']),
            ]);

            $tokenResponse = Http::asForm()
                ->post('https://oauth2.googleapis.com/token', $tokenPayload);

            Log::info('[Google] Token exchange response', [
                'status' => $tokenResponse->status(),
                'body'   => $tokenResponse->json(),
            ]);

            if ($tokenResponse->failed()) {
                $errorDesc = $tokenResponse->json('error_description')
                    ?? $tokenResponse->json('error')
                    ?? 'Unknown token exchange error';

                Log::error('[Google] Token exchange FAILED', [
                    'status'       => $tokenResponse->status(),
                    'error'        => $errorDesc,
                    'full_body'    => $tokenResponse->body(),
                    'redirect_uri' => $this->redirectUri(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Google sign-in failed: ' . $errorDesc,
                    'debug'   => config('app.debug') ? [
                        'redirect_uri_used' => $this->redirectUri(),
                        'google_error'      => $errorDesc,
                    ] : null,
                ], 500);
            }

            $accessToken = $tokenResponse->json('access_token');

            if (!$accessToken) {
                Log::error('[Google] No access_token in response', [
                    'body' => $tokenResponse->json(),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Google returned no access token.',
                ], 500);
            }

            // ── Step 2: Fetch user profile ───────────────────────────────
            $profileResponse = Http::withToken($accessToken)
                ->get('https://www.googleapis.com/oauth2/v3/userinfo');

            Log::info('[Google] Profile fetch response', [
                'status' => $profileResponse->status(),
                'email'  => $profileResponse->json('email') ?? 'unknown',
            ]);

            if ($profileResponse->failed()) {
                Log::error('[Google] Profile fetch FAILED', [
                    'status' => $profileResponse->status(),
                    'body'   => $profileResponse->body(),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch Google user profile.',
                ], 500);
            }

            $profile   = $profileResponse->json();
            $googleId  = $profile['sub']          ?? null;
            $email     = $profile['email']         ?? null;
            $firstName = $profile['given_name']    ?? (explode(' ', $profile['name'] ?? 'User')[0]);
            $lastName  = $profile['family_name']   ?? (explode(' ', $profile['name'] ?? '')[1] ?? '');
            $avatar    = $profile['picture']       ?? null;

            if (!$googleId || !$email) {
                Log::error('[Google] Profile missing required fields', ['profile' => $profile]);
                return response()->json([
                    'success' => false,
                    'message' => 'Google profile is missing email or ID.',
                ], 500);
            }

            // ── Step 3: Find or create user ──────────────────────────────
            return DB::transaction(function () use ($googleId, $email, $firstName, $lastName, $avatar) {

                $user      = User::where('google_id', $googleId)
                                 ->orWhere('email', $email)
                                 ->first();
                $isNewUser = false;

                if (!$user) {
                    Log::info('[Google] Creating new user', ['email' => $email]);
                    $user      = $this->createUser($googleId, $email, $firstName, $lastName, $avatar);
                    $isNewUser = true;
                } else {
                    Log::info('[Google] Existing user found', ['id' => $user->id, 'email' => $user->email]);
                    
                    // Security check: If user registered via email/password but hasn't verified OTP,
                    // we should NOT allow Google login to bypass OTP verification
                    if (!$user->google_id && $user->is_otp_verified == 0) {
                        Log::warning('[Google] Attempted bypass of OTP verification', [
                            'user_id' => $user->id,
                            'email' => $user->email,
                        ]);
                        
                        return response()->json([
                            'success' => false,
                            'auth_status' => 'otp_required',
                            'message' => 'Please verify your email with OTP first. Check your inbox.',
                            'data' => ['email' => $user->email],
                        ], 200);
                    }
                    
                    if (!$user->google_id) {
                        $user->update([
                            'google_id'       => $googleId,
                            'is_otp_verified' => 1, // Safe to verify since Google validates email
                            'is_active'       => 1,
                            'avatar'          => $avatar,
                        ]);
                    }
                }

                if ((int) $user->is_active === 0) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Your account has been deactivated. Please contact support.',
                    ], 403);
                }

                $user->roles = $user->roles?->pluck('name') ?? collect();
                $token       = $user->createToken('Google Token')->accessToken;

                Log::info('[Google] Auth successful', [
                    'user_id'    => $user->id,
                    'is_new'     => $isNewUser,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => $isNewUser ? 'Registration successful.' : 'Login successful.',
                    'data'    => [
                        'token'       => $token,
                        'token_type'  => 'bearer',
                        'expires_in'  => 2592000,
                        'is_new_user' => $isNewUser,
                        'user'        => new UserResource($user),
                    ],
                ]);
            });

        } catch (Throwable $e) {
            Log::error('[Google] callback() exception', [
                'message' => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
                'trace'   => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Google authentication failed. Please try again.',
                'debug'   => config('app.debug') ? [
                    'error' => $e->getMessage(),
                    'file'  => $e->getFile(),
                    'line'  => $e->getLine(),
                ] : null,
            ], 500);
        }
    }

    /**
     * Create a new user with host + team + roles from Google profile data.
     */
    private function createUser(
        string  $googleId,
        string  $email,
        string  $firstName,
        string  $lastName,
        ?string $avatar
    ): User {
        $hostName = trim($firstName . ' ' . $lastName);
        $host     = Host::create(['name' => $hostName]);
        $team     = Team::create(['name' => 'Team ' . $hostName, 'host_id' => $host->id]);

        $user = User::create([
            'first_name'      => $firstName,
            'last_name'       => $lastName,
            'name'            => $firstName . ' ' . $lastName,  
            'user_name'       => $firstName . ' ' . $lastName,
            'email'           => $email,
            'password'        => Str::random(24),  // unusable random password
            'google_id'       => $googleId,
            'avatar'          => $avatar,
            'host_id'         => $host->id,
            'is_active'       => 1,
            'is_otp_verified' => 1,
            'account_type'    => 'personal',
        ]);

        HostUser::create(['host_id' => $host->id, 'user_id' => $user->id]);

        HostUserDetail::create([
            'host_id' => $host->id,
            'user_id' => $user->id,
        ]);

        $adminRole = Role::firstOrCreate([
            'name'       => 'admin',
            'guard_name' => 'api',
            'host_id'    => $host->id,
            'team_id'    => $team->id,
        ]);

        Role::firstOrCreate([
            'name'       => 'team-member',
            'guard_name' => 'api',
            'host_id'    => $host->id,
            'team_id'    => $team->id,
        ]);

        $excludedIds = Permission::where('name', 'like', 'system.%')->pluck('id');
        $adminRole->syncPermissions(Permission::whereNotIn('id', $excludedIds)->get());

        $user->roles()->attach($adminRole->id, [
            'model_type' => User::class,
            'team_id'    => $team->id,
        ]);

        return $user;
    }
}
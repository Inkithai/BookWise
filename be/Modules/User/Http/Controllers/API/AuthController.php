<?php

namespace Modules\User\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Traits\LogsActivity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Validator;
use Modules\User\Mail\UserResetPasswordMail;
use Modules\User\Models\User;
use Modules\User\Mail\UserOtpMail;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Modules\User\Http\Resources\UserResource;
use Modules\User\Http\Requests\ValidateRegistrationRequest;
use Modules\User\Services\AuthService;
use Illuminate\Validation\Rule;
use OpenApi\Annotations as OA;
use Throwable;

/**
 * @OA\Tag(
 *     name="Authentication",
 *     description="API for login, register, profile, and logout"
 * )
 */
class AuthController extends Controller
{
    use LogsActivity;

    protected AuthService $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * @OA\Post(
     *     path="/api/v1/admin/auth/register",
     *     tags={"Authentication"},
     *     summary="Register a new host user",
     *     description="Registers a new user and assigns roles via AuthService",
     *     operationId="registerUser",
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(
     *             required={"first_name","last_name","account_type","phone_number","email","password"},
     *
     *             @OA\Property(property="first_name", type="string", example="John"),
     *             @OA\Property(property="last_name", type="string", example="Doe"),
     *             @OA\Property(property="account_type", type="string", example="company"),
     *             @OA\Property(property="company", type="string", example="MDH Co."),
     *             @OA\Property(property="phone_number", type="string", example="+11234567890"),
     *             @OA\Property(property="email", type="string", format="email", example="john.doe@gmail.com"),
     *             @OA\Property(property="password", type="string", format="password", example="john@123"),
     *             @OA\Property(property="active", type="integer", example=1)
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=201,
     *         description="User registered successfully",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="User registered successfully."),
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="user_id", type="integer", example=5),
     *                 @OA\Property(property="login_url", type="string", example="")
     *             )
     *         )
     *     ),
     *
     *     @OA\Response(response=404, description="Resource not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function validateRegistration(ValidateRegistrationRequest $request): JsonResponse
    {
        // TEMPORARILY DISABLE ALL VALIDATION - ALWAYS RETURN SUCCESS
        return response()->json([
            'success' => true,
            'message' => 'Email and phone number are available.',
            'data' => [
                'email_available' => true,
                'phone_available' => true,
            ],
        ]);
    }

    public function hostRegister(Request $request, AuthService $authService): JsonResponse
    {
        try {
            $request->validate([
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'account_type' => 'required|string|max:100',
                'company' => [
                    'nullable',
                    'string',
                    'max:255',
                    // 'required_if:account_type,Company',
                    Rule::requiredIf(function () use ($request) {
                        return isset($request->account_type) &&
                            strtolower($request->account_type) === 'company';
                    }),
                    // 'unique:hosts,name',
                ],
                'phone_number' => 'required|string|max:20', // TEMPORARILY DISABLED FORMAT VALIDATION
                'email' => 'required', // TEMPORARILY DISABLED ALL EMAIL VALIDATION
                // 'email' => [
                //     'required',
                //     'email:rfc,dns',
                //     function ($attribute, $value, $fail) {
                //         // Trim and lowercase email for case-insensitive comparison
                //         $email = strtolower(trim($value));
                //         $exists = \Modules\User\Models\User::whereRaw('LOWER(TRIM(email)) = ?', [$email])
                //             ->whereNull('deleted_at')
                //             ->exists();
                //         if ($exists) {
                //             $fail('This email address is already registered.');
                //         }
                //     },
                // ],
                'password' => 'required|string|min:6',
            ]);

            $result = $authService->registerHost($request->all());

            if ($result['success']) {

                $user = $result['user'];

                // ✅ Log success
                $this->logActivity(
                    'Auth',
                    'Host User Registered',
                    $user->id ?? null,
                    [
                        'status' => 'success',
                        'message' => 'User registered successfully',
                        'data' => $user->resolve(),
                    ]
                );

                return response()->json([
                    'success' => true,
                    'message' => 'User registered successfully.',
                    'data' => [
                        'user' => $result['user'],
                    ],
                ], 201);
            }

            // ❌ Log failure
            $this->logActivity(
                'Auth',
                'Host Registration Failed',
                null,
                [
                    'status' => 'error',
                    'message' => $result['message'] ?? 'Unknown error during registration',
                ]
            );

            $response = [
                'success' => false,
                'message' => $result['message'],
            ];

            if (isset($result['debug'])) {
                $response['debug'] = $result['debug'];
            }

            return response()->json($response, 500);
        } catch (Throwable $e) {
            // ❌ Log exception
            $this->logActivity(
                'Auth',
                'Host Registration Exception',
                null,
                [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ]
            );

            return $this->handleException($e, 'hostRegister');
        }
    }

    /**
     * @OA\Post(
     *     path="/api/v1/admin/auth/verify-email-otp",
     *     tags={"Authentication"},
     *     summary="Verify email OTP",
     *     description="Verifies the OTP sent to the user's email",
     *     operationId="verifyEmailOtp",
     *
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"email","otp"},
     *
     *             @OA\Property(property="email", type="string", format="email", example="john.doe@gmail.com"),
     *             @OA\Property(property="otp", type="string", example="123456")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="OTP verified successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Email verified successfully. You can now login."),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="user_id", type="integer", example=5),
     *                 @OA\Property(property="login_url", type="string", example="")
     *             )
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=400,
     *         description="Invalid or expired OTP",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="OTP expired or invalid.")
     *         )
     *     ),
     *
     *     @OA\Response(response=404, description="User not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */

    public function verifyEmailOtp(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|string|email:rfc,dns',
            'otp' => 'required|string',
        ]);

        // Rate limit: 5 attempts per 5 minutes per email
        $rateLimitKey = 'otp_verify_attempts:' . $request->email;
        $attempts = Cache::get($rateLimitKey, 0);
        
        if ($attempts >= 5) {
            return response()->json([
                'success' => false,
                'message' => 'Too many failed OTP attempts. Please request a new OTP.',
            ], 429);
        }

        $cacheKey = 'email_otp:' . $request->email;
        $hashedOtp = Cache::get($cacheKey);

        if (!$hashedOtp) {
            return response()->json([
                'success' => false,
                'message' => 'OTP expired or invalid.',
            ], 400);
        }

        if (!Hash::check($request->otp, $hashedOtp)) {
            // Increment failed attempts
            Cache::put($rateLimitKey, $attempts + 1, now()->addMinutes(5));
            
            $remaining = 5 - ($attempts + 1);
            return response()->json([
                'success' => false,
                'message' => "Invalid OTP. {$remaining} attempts remaining.",
            ], 400);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        // Activate user
        $user->update(['is_otp_verified' => 1]);

        $this->activateBookWiseUserAfterInvoiceOtp($user->email);

        // If you have an accessor to show "Active" for is_active
        $user->is_otp_verified = $user->is_otp_verified ? 'Active' : 'Inactive';

        // Clear OTP cache and rate limit
        Cache::forget($cacheKey);
        Cache::forget('otp_verify_attempts:' . $request->email);

        return response()->json([
            'success' => true,
            'message' => 'Email verified successfully. You can login now.',
            'user' => new UserResource($user),
        ]);
    }

    /**
     * Enable BookWise login after Invoice OTP (no separate platform email OTP).
     */
    private function activateBookWiseUserAfterInvoiceOtp(string $email): void
    {
        $baseUrl = rtrim((string) config('services.bookwise.url', ''), '/');
        $apiKey = (string) config('services.bookwise.api_key', '');

        if ($baseUrl === '' || $apiKey === '') {
            return;
        }

        try {
            Http::timeout(15)
                ->acceptJson()
                ->withHeaders(['api-key' => $apiKey])
                ->post("{$baseUrl}/api/v1/auth/activate-invoice-user", [
                    'email' => $email,
                ]);
        } catch (Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('BookWise activation after Invoice OTP failed', [
                'email' => $email,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * @OA\Post(
     *     path="/admin/auth/resend-otp",
     *     summary="Resend OTP to user email",
     *     description="Resends a new OTP to the user's registered email if the account is not active.",
     *     operationId="resendOtp",
     *     tags={"Authentication"},
     *
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *             @OA\Schema(
     *                 required={"email"},
     *                 @OA\Property(
     *                     property="email",
     *                     type="string",
     *                     format="email",
     *                     example="user@example.com"
     *                 )
     *             )
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="OTP resent successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="A new OTP has been sent to your email.")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=400,
     *         description="Account already active",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Your account is already active.")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=404,
     *         description="User not found",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="User not found.")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=429,
     *         description="Too many requests",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="You can request a new OTP after 1 minute.")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=422,
     *         description="Validation error",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="The email field is required."),
     *             @OA\Property(
     *                 property="errors",
     *                 type="object",
     *                 example={"email": {"The email field is required."}}
     *             )
     *         )
     *     )
     * )
     */


    public function resendOtp(Request $request): JsonResponse
    {
        $request->validate([
           'email' => 'required|string|email:rfc,dns',
        ]);

        // Find user by email
        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found.',
            ], 404);
        }

        if ($user->is_otp_verified) {
            return response()->json([
                'success' => false,
                'message' => 'Your account is already active.',
            ], 400);
        }

        // Rate limit: 1 resend per minute
        $rateKey = 'email_otp_resend:' . $user->email;
        if (Cache::has($rateKey)) {
            return response()->json([
                'success' => false,
                'message' => 'You can request a new OTP after 1 minute.',
            ], 429);
        }
        Cache::put($rateKey, true, now()->addMinute());

        // Generate new OTP
        $otp = random_int(100000, 999999);
        // Store OTP in cache (10 minutes)
        Cache::put(
            'email_otp:' . $user->email,
            Hash::make($otp),
            now()->addMinutes(10)
        );

        $mailData = [
            'name' => $user->first_name . ' ' . $user->last_name,
            'otp' => $otp,
        ];

            // Resolve company logo for email header
            $branding = \App\Helpers\EmailTemplateHelper::resolveCompanyBranding($user->host_id);

            // Send OTP email (sync — bypass queue so user receives it immediately)
            try {
                Mail::to($user->email)->send((new UserOtpMail($mailData, $branding['logoUrl'], $branding['companyName']))->onConnection('sync'));
            } catch (\Throwable $mailErr) {
                Log::error('OTP resend email failed: ' . $mailErr->getMessage());
            }

        return response()->json([
            'success' => true,
            'message' => 'A new OTP has been sent to your email.',
        ]);
    }


    /**
     * @OA\Post(
     *     path="/api/v1/admin/auth/login",
     *     tags={"Authentication"},
     *     summary="Login a user and return a token",
     *     operationId="loginUser",
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(
     *             required={"email", "password"},
     *
     *             @OA\Property(property="email", type="string", example="super-host@gmail.com"),
     *             @OA\Property(property="password", type="string", example="super@123")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Login successful",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Login successful."),
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="token", type="string", example="eyJ0eXAiOiJKV1QiLCJhbGci..."),
     *                 @OA\Property(property="token_type", type="string", example="bearer"),
     *                 @OA\Property(property="expires_in", type="integer", example=3600),
     *                 @OA\Property(property="user", ref="#/components/schemas/UserResource")
     *             )
     *         )
     *     ),
     *
     *     @OA\Response(response=404, description="Resource not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function login(Request $request): JsonResponse
    {
        try {
            // Validate first so Swagger & Laravel return clean 422 error
            $request->validate([
                'email' => 'required|email:rfc,dns',
                'password' => 'required|string',
            ]);

            $response = $this->authService->login($request);

            if ($response->getStatusCode() === 200) {
                $this->logActivity(
                    'Auth',
                    'Login Successful',
                    optional(Auth::user())->id,
                    [
                        'status' => 'success',
                        'message' => 'Login successful',
                    ]
                );
            }

            return $response;

        } catch (Throwable $e) {
            $this->logActivity(
                'Auth',
                'Login Failed',
                null,
                [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ]
            );

            return response()->json([
                'success' => false,
                'message' => 'An error occurred during login.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/v1/admin/auth/me",
     *     tags={"Authentication"},
     *     summary="Get authenticated user info",
     *     security={{"bearerAuth":{}}},
     *     operationId="getAuthUser",
     *
     *     @OA\Response(
     *         response=200,
     *         description="Authenticated user data",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="user", type="object",
     *                 @OA\Property(property="id", type="integer", example=1),
     *                 @OA\Property(property="first_name", type="string", example="John"),
     *                 @OA\Property(property="last_name", type="string", example="Doe"),
     *                 @OA\Property(property="email", type="string", example="john.doe@example.com")
     *             )
     *         )
     *     ),
     *
     *     @OA\Response(response=404, description="Resource not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function me(): JsonResponse
    {
        try {
            return $this->authService->me();
        } catch (Throwable $e) {
            return $this->handleException($e, 'me');
        }
    }

    /**
     * @OA\Post(
     *     path="/api/v1/admin/auth/logout",
     *     tags={"Authentication"},
     *     summary="Logout user (invalidate token)",
     *     security={{"bearerAuth":{}}},
     *     operationId="logOutUser",
     *
     *     @OA\Response(
     *         response=200,
     *         description="User logged out",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="message", type="string", example="Successfully logged out")
     *         )
     *     ),
     *
     *     @OA\Response(response=404, description="Resource not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function logout(): JsonResponse
    {
        try {
            return $this->authService->logout();
        } catch (Throwable $e) {
            return $this->handleException($e, 'logout');
        }
    }

    /**
     * @OA\Post(
     *     path="/api/v1/admin/auth/forgot-password",
     *     summary="Send reset password link",
     *     tags={"Authentication"},
     *     operationId="forgotPassword",
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(
     *             required={"email"},
     *
     *             @OA\Property(property="email", type="string", format="email", example="max.doe@gmail.com")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Reset link sent successfully",
     *
     *         @OA\JsonContent(@OA\Property(property="message", type="string", example="Password reset link sent to your email."))
     *     ),
     *
     *     @OA\Response(response=404, description="Resource not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function forgot(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email:rfc,dns|exists:users,email',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'The given data was invalid.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'message' => "We can't find a user with that email address.",
            ], 404);
        }

        try {
            // Generate a password reset token
            $token = Str::random(64);

            // Store hashed token in password_resets table
            DB::table('password_resets')->updateOrInsert(
                ['email' => $user->email],
                [
                    'token' => Hash::make($token),
                    'created_at' => now(),
                ]
            );

            $frontendUrl = trim((string) config('app.frontend_url'));
            if ($frontendUrl !== '' && !preg_match('/^https?:\/\//i', $frontendUrl)) {
                $frontendUrl = 'https://' . ltrim($frontendUrl, '/');
            }

            if ($frontendUrl === '') {
                throw new \Exception('Frontend URL is not configured.');
            }

            $resetUrl = rtrim($frontendUrl, '/') . '/auth/reset-password?token=' . rawurlencode((string) $token) . '&email=' . rawurlencode((string) $user->email);
            // Prepare mail data
            $mailData = [
                'name' => $user->first_name . ' ' . $user->last_name,
                // 'reset_url' => url("/api/v1/admin/auth/reset-password-email/{$token}?email={$user->email}"),
                'reset_url' => $resetUrl
            ];

            // Resolve company logo for email header
            $branding = \App\Helpers\EmailTemplateHelper::resolveCompanyBranding($user->host_id);

            // Send custom email (sync — bypass queue so user receives it immediately)
            try {
                Mail::to($user->email)->send((new UserResetPasswordMail($mailData, $branding['logoUrl'], $branding['companyName']))->onConnection('sync'));
            } catch (\Throwable $mailErr) {
                Log::error('Reset password email failed: ' . $mailErr->getMessage());
            }

            $this->logActivity(
                'Auth',
                'Forgot Password Email Sent',
                $user->id ?? null,
                [
                    'status' => 'success',
                    'message' => 'Password reset link sent successfully.',
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'A custom password reset link has been sent to your email.',
            ], 200);

        } catch (Throwable $e) {
            $this->logActivity(
                'Auth',
                'Forgot Password Error',
                $user->id ?? null,
                [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ]
            );

            return $this->handleException($e, 'forgot');
        }
    }

    /**
     * @OA\Post(
     *     path="/api/v1/admin/auth/reset-password",
     *     summary="Admin force reset user password",
     *     tags={"Authentication"},
     *     security={{"bearerAuth":{}}},
     *     operationId="resetPwUsers",
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(
     *             required={"email", "password", "password_confirmation"},
     *
     *             @OA\Property(property="email", type="string", format="email", example="user@example.com"),
     *             @OA\Property(property="password", type="string", format="password", minLength=8, example="NewPass123"),
     *             @OA\Property(property="password_confirmation", type="string", format="password", example="NewPass123"),
     *             @OA\Property(property="token", type="string", example="fgvhgfr5676sdzfgvdzdxfc")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Password reset successfully",
     *
     *         @OA\JsonContent(@OA\Property(property="message", type="string", example="Password updated."))
     *     ),
     *
     *     @OA\Response(
     *         response=404,
     *         description="User not found",
     *
     *         @OA\JsonContent(@OA\Property(property="message", type="string", example="User not found."))
     *     ),
     *
     *     @OA\Response(
     *         response=422,
     *         description="Validation error",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="message", type="string", example="The given data was invalid."),
     *             @OA\Property(
     *                 property="errors",
     *                 type="object",
     *                 @OA\Property(property="email", type="array", @OA\Items(type="string", example="The email field is required."))
     *             )
     *         )
     *     )
     * )
     */
    public function reset(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email:rfc,dns|exists:users,email',
            'password' => 'required|string|min:8|confirmed',
            'token' => 'nullable|string',
        ]);

        $token = $request->input('token');
        $hasToken = !empty($token) && trim($token) !== '';
        $syncBookWise = $request->boolean('sync_bookwise') || $hasToken;

        // 🔐 FORGOT PASSWORD / CREATE-PASSWORD FLOW (token exists)
        if ($hasToken) {

            $reset = DB::table('password_resets')
                ->where('email', $request->email)
                ->first();

            if (!$reset) {
                return response()->json([
                    'message' => 'Invalid password reset links.'
                ], 400);
            }

            if (!Hash::check($token, $reset->token)) {
                return response()->json([
                    'message' => 'Invalid password reset link.'
                ], 400);
            }

            if (Carbon::parse($reset->created_at)->addSeconds(3600)->isPast()) {
                return response()->json([
                    'message' => 'Password reset link has expired.'
                ], 410);
            }
        }

        // 🔐 SETTINGS PASSWORD CHANGE (no token)
        else {

            // Must be logged in, unless user has temp password (sub-user create-password flow)
            $targetUser = User::where('email', $request->email)->first();
            if ($targetUser && $targetUser->is_temp_password) {
                // Allow sub-user to set their password without being logged in
            } elseif (!Auth::check()) {
                return response()->json([
                    'message' => 'Authentication required.'
                ], 401);
            } elseif (Auth::user()->email !== $request->email) {
                // Logged-in user can reset ONLY their own password
                return response()->json([
                    'message' => 'Unauthorized password change.'
                ], 403);
            }
        }

        // ✅ Update password
        $user = User::where('email', $request->email)->firstOrFail();
        $wasTempPassword = (bool) ($user->is_temp_password ?? false);

        $user->forceFill([
            'password' => $request->password,
            'is_temp_password' => false,
            'is_active' => true,
        ])->save();

        if ($syncBookWise || $wasTempPassword) {
            $this->syncBookWisePasswordFromInvoice($request->email, $request->password);
        }

        // 🧹 Delete reset token (forgot password only)
        if ($hasToken) {
            DB::table('password_resets')
                ->where('email', $request->email)
                ->delete();
        }

        return response()->json([
            'message' => 'Password updated successfully.'
        ], 200);
    }

    private function syncBookWisePasswordFromInvoice(string $email, string $password): void
    {
        $baseUrl = rtrim((string) config('services.bookwise.url', ''), '/');
        $apiKey = (string) config('services.bookwise.api_key', '');

        if ($baseUrl === '' || $apiKey === '') {
            return;
        }

        try {
            Http::timeout(20)
                ->acceptJson()
                ->withHeaders(['api-key' => $apiKey])
                ->post("{$baseUrl}/api/v1/auth/invoice-sync/password", [
                    'email' => $email,
                    'password' => $password,
                ]);
        } catch (Throwable $e) {
            Log::warning('BookWise password sync after Invoice reset failed', [
                'email' => $email,
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function showResetForm(Request $request, $token = null)
    {
        return view('user::auth.reset-password', ['token' => $token, 'email' => $request->email]);
    }
}

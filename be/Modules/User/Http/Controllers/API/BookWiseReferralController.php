<?php

namespace Modules\User\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Proxies referral share-settings to BookWise (api-key + user email).
 * Invoice frontend calls these routes directly (same as profile_img uploads).
 */
class BookWiseReferralController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function getShareSettings(Request $request): JsonResponse
    {
        return $this->forwardJson($request, 'GET', 'admin/referrals/share-settings');
    }

    public function updateShareSettings(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user?->email) {
            return response()->json([
                'success' => false,
                'message' => 'Authenticated user email is required.',
            ], 401);
        }

        $baseUrl = rtrim((string) config('services.bookwise.url', ''), '/');
        $apiKey = (string) config('services.bookwise.api_key', '');

        if ($baseUrl === '' || $apiKey === '') {
            return response()->json([
                'success' => false,
                'message' => 'BookWise API is not configured on the Invoice API server. '
                    . 'Set BOOKWISE_API_URL and BOOKWISE_APP_API_KEY in invoicingapi .env, then run php artisan config:clear.',
            ], 500);
        }

        $headers = $this->syncHeaders($request, $user->email, $apiKey);
        $url = "{$baseUrl}/api/v1/admin/referrals/share-settings";

        try {
            $pending = Http::timeout(120)->acceptJson()->withHeaders($headers);
            $fields = [];

            if ($request->has('share_title')) {
                $fields['share_title'] = (string) $request->input('share_title');
            }
            if ($request->has('share_body')) {
                $fields['share_body'] = (string) $request->input('share_body');
            }
            if ($request->boolean('remove_images') || $request->input('remove_images') === '1') {
                $fields['remove_images'] = '1';
            }

            $removeUrls = $request->input('remove_image_urls', []);
            if (! is_array($removeUrls)) {
                $removeUrls = [$removeUrls];
            }
            $removeUrls = array_values(array_filter($removeUrls, fn ($u) => $u !== null && $u !== ''));
            if ($removeUrls !== []) {
                $fields['remove_image_urls'] = $removeUrls;
            }

            $files = $this->collectUploadedImages($request);
            foreach ($files as $file) {
                $pending = $pending->attach(
                    'images[]',
                    fopen($file->getRealPath(), 'r'),
                    $file->getClientOriginalName()
                );
            }

            $upstream = $pending->post($url, $fields);
        } catch (Throwable $e) {
            Log::warning('BookWise referral share-settings upload failed', [
                'email' => $user->email,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Could not update referral share settings. Please try again.',
            ], 502);
        }

        return response()->json(
            $upstream->json() ?? ['success' => false, 'message' => 'Invalid response from BookWise.'],
            $upstream->status()
        );
    }

    private function forwardJson(Request $request, string $method, string $syncPath): JsonResponse
    {
        $user = $request->user();
        if (! $user?->email) {
            return response()->json([
                'success' => false,
                'message' => 'Authenticated user email is required.',
            ], 401);
        }

        $baseUrl = rtrim((string) config('services.bookwise.url', ''), '/');
        $apiKey = (string) config('services.bookwise.api_key', '');

        if ($baseUrl === '' || $apiKey === '') {
            return response()->json([
                'success' => false,
                'message' => 'BookWise API is not configured on the Invoice API server. '
                    . 'Set BOOKWISE_API_URL and BOOKWISE_APP_API_KEY in invoicingapi .env, then run php artisan config:clear.',
            ], 500);
        }

        $headers = $this->syncHeaders($request, $user->email, $apiKey);
        $url = "{$baseUrl}/api/v1/{$syncPath}";

        try {
            $upstream = Http::timeout(30)
                ->acceptJson()
                ->withHeaders($headers)
                ->send($method, $url);
        } catch (Throwable $e) {
            Log::warning('BookWise referral share-settings request failed', [
                'email' => $user->email,
                'path' => $syncPath,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Could not load referral share settings.',
            ], 502);
        }

        return response()->json(
            $upstream->json() ?? ['success' => false, 'message' => 'Invalid response from BookWise.'],
            $upstream->status()
        );
    }

    /**
     * @return array<int, \Illuminate\Http\UploadedFile>
     */
    private function collectUploadedImages(Request $request): array
    {
        $uploaded = $request->file('images');
        if (is_array($uploaded)) {
            return array_values(array_filter($uploaded));
        }
        if ($uploaded) {
            return [$uploaded];
        }

        return [];
    }

    /**
     * @return array<string, string>
     */
    private function syncHeaders(Request $request, string $email, string $apiKey): array
    {
        $headers = [
            'api-key' => $apiKey,
            'email' => strtolower(trim($email)),
            'Accept' => 'application/json',
        ];

        $scope = strtolower(trim((string) $request->header('x-referral-scope', '')));
        if ($scope === 'own' || $scope === 'team') {
            $headers['x-referral-scope'] = $scope;
        }

        return $headers;
    }
}

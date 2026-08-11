<?php

namespace App\Services\Subscription;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class BookWisePlanAdminClient
{
    public function isConfigured(): bool
    {
        return $this->baseUrl() !== '' && $this->apiKey() !== '';
    }

    public function configurationError(): ?string
    {
        if ($this->isConfigured()) {
            return null;
        }

        $missing = [];
        if ($this->baseUrl() === '') {
            $missing[] = 'BOOKWISE_API_URL';
        }
        if ($this->apiKey() === '') {
            $missing[] = 'BOOKWISE_APP_API_KEY';
        }

        $vars = implode(' and ', $missing);

        return "BookWise API is not configured on Invoice API (missing {$vars}). "
            . 'Set them in invoicingdevapi .env, then run: php artisan config:clear';
    }

    /**
     * @return array{success: bool, message?: string, data?: array<int, array<string, mixed>>}
     */
    public function listPlans(bool $includeHidden = true, ?string $actorEmail = null): array
    {
        if ($configError = $this->configurationError()) {
            return [
                'success' => false,
                'message' => $configError,
                'data' => [],
            ];
        }

        $url = $this->baseUrl() . '/api/v1/plans';

        try {
            $headers = [
                'api-key' => $this->apiKey(),
                'Accept' => 'application/json',
            ];
            $email = strtolower(trim((string) $actorEmail));
            if ($email !== '') {
                // Same header auth as subscription sync (HeaderAuthMiddleware on platform).
                $headers['email'] = $email;
            }

            $response = Http::timeout(30)
                ->acceptJson()
                ->withHeaders($headers)
                ->get($url, ['public_only' => $includeHidden ? 0 : 1]);

            $body = $response->json();

            if (! $response->successful()) {
                return [
                    'success' => false,
                    'message' => $this->formatUpstreamError($response->status(), $body),
                    'data' => [],
                ];
            }

            return [
                'success' => (bool) ($body['success'] ?? true),
                'data' => is_array($body['data'] ?? null) ? $body['data'] : [],
            ];
        } catch (Throwable $e) {
            Log::warning('BookWise plan list failed', [
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => $e->getMessage(),
                'data' => [],
            ];
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function updatePlanVisibility(int $syncPlanId, bool $isActive, ?string $actorEmail = null): array
    {
        if ($configError = $this->configurationError()) {
            return [
                'success' => false,
                'message' => $configError,
            ];
        }

        $url = $this->baseUrl() . '/api/v1/plans/' . $syncPlanId . '/visibility';

        try {
            $headers = ['api-key' => $this->apiKey(), 'Accept' => 'application/json'];
            $email = strtolower(trim((string) $actorEmail));
            if ($email !== '') {
                $headers['email'] = $email;
            }

            $response = Http::timeout(30)
                ->acceptJson()
                ->withHeaders($headers)
                ->patch($url, ['is_active' => $isActive]);

            return $response->json() ?? [
                'success' => false,
                'message' => 'Invalid BookWise response.',
            ];
        } catch (Throwable $e) {
            Log::warning('BookWise plan visibility update failed', [
                'plan_id' => $syncPlanId,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    private function baseUrl(): string
    {
        return rtrim((string) config('services.bookwise.url', ''), '/');
    }

    private function apiKey(): string
    {
        return (string) config('services.bookwise.api_key', '');
    }

    /**
     * @param  array<string, mixed>|null  $body
     */
    private function formatUpstreamError(int $status, ?array $body): string
    {
        $message = (string) ($body['message'] ?? 'Could not load BookWise plans.');

        if ($status === 401 || strcasecmp($message, 'Unauthenticated.') === 0) {
            return 'BookWise rejected the plans request (Unauthenticated). '
                . 'Check BOOKWISE_APP_API_KEY matches APP_API_KEY on api.bookwise.io, '
                . 'deploy Platform GET /api/v1/plans under api-key auth, and ensure the super-admin email exists on BookWise.';
        }

        if ($status === 403) {
            return 'BookWise rejected the API key (403). '
                . 'BOOKWISE_APP_API_KEY on invoicingdevapi must match APP_API_KEY on api.bookwise.io.';
        }

        return $message;
    }
}

<?php

namespace App\Services\Subscription;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Modules\User\Models\User;
use Throwable;

class BookWiseSubscriptionClient
{
    public function isConfigured(): bool
    {
        return $this->baseUrl() !== '' && $this->apiKey() !== '';
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getTeamFeatures(string $email): array
    {
        $response = $this->request('GET', 'team-features', $email);

        if (! ($response['success'] ?? false)) {
            return [];
        }

        $data = $response['data'] ?? [];

        return is_array($data) ? $data : [];
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getInvoiceFeatureSubscription(string $email): ?array
    {
        $response = $this->request('GET', 'subscription/invoice-feature', $email);
        if (($response['success'] ?? false) && array_key_exists('data', $response)) {
            $row = $response['data'];
            if (is_array($row) && ! empty($row)) {
                return $row;
            }

            return null;
        }

        // Fallback: legacy team-features list (requires bearer or header auth user with team_id)
        $featureSlug = (string) config('subscription.invoice_feature_slug', 'invoice');

        foreach ($this->getTeamFeatures($email) as $row) {
            $feature = $row['feature'] ?? [];
            $name = strtolower((string) ($feature['name'] ?? ''));
            $display = strtolower((string) ($feature['display_name'] ?? ''));

            if ($name === $featureSlug || str_contains($name, $featureSlug) || str_contains($display, 'invoice')) {
                return $row;
            }
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    private function request(string $method, string $path, string $email, array $body = []): array
    {
        if (! $this->isConfigured()) {
            return ['success' => false, 'message' => 'BookWise API is not configured.'];
        }

        $url = $this->baseUrl() . '/api/v1/' . ltrim($path, '/');

        try {
            $pending = Http::timeout(30)
                ->acceptJson()
                ->withHeaders([
                    'api-key' => $this->apiKey(),
                    'email' => strtolower(trim($email)),
                    'Accept' => 'application/json',
                ]);

            $upstream = match (strtoupper($method)) {
                'POST' => $pending->post($url, $body),
                'PATCH' => $pending->patch($url, $body),
                'DELETE' => $pending->delete($url, $body),
                default => $pending->get($url),
            };

            return $upstream->json() ?? ['success' => false, 'message' => 'Invalid BookWise response.'];
        } catch (Throwable $e) {
            Log::warning('BookWise subscription API request failed', [
                'path' => $path,
                'email' => $email,
                'error' => $e->getMessage(),
            ]);

            return ['success' => false, 'message' => $e->getMessage()];
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
}

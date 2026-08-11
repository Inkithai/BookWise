<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\ClaritySnapshot;

class FetchClarityDataCommand extends Command
{
    protected $signature = 'clarity:fetch-data 
                            {--date= : Specific date to fetch (Y-m-d format)}
                            {--force : Force overwrite existing snapshot}';
    protected $description = 'Fetch Clarity analytics data and store it in the database';

    public function handle()
    {
        try {
            $apiUrl = env('GOOGLE_ANALYTICS_URL');
            $apiToken = env('GOOGLE_ANALYTICS_ID');

            if (!empty($apiUrl) && !str_starts_with($apiUrl, 'http')) {
                $apiUrl = 'https://' . $apiUrl;
            }

            if (empty($apiUrl) || empty($apiToken)) {
                $this->error('API credentials not configured');
                Log::error('Clarity fetch failed: Missing credentials');
                return Command::FAILURE;
            }

            $dateOption = $this->option('date');
            if ($dateOption) {
                try {
                    $snapshotDate = \Carbon\Carbon::parse($dateOption, 'Europe/London')->format('Y-m-d');
                } catch (\Exception $e) {
                    $this->error('Invalid date format. Use Y-m-d (e.g., 2026-02-17)');
                    return Command::FAILURE;
                }
            } else {
                // Default to yesterday's date since analytics data is typically available for the previous day
                $snapshotDate = now('Europe/London')->subDay()->format('Y-m-d');
            }
            
            $force = $this->option('force');

            $response = null;
            $lastError = null;
            $maxRetries = 3;
            
            $this->info('Fetching Clarity data for ' . $snapshotDate . '...');
            
            for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
                try {
                    if ($attempt > 1) {
                        $this->warn("Retry attempt {$attempt}/{$maxRetries}...");
                    }
                    
                    $response = Http::timeout(30)
                        ->retry(2, 100)
                        ->withHeaders([
                            'Authorization' => 'Bearer ' . $apiToken,
                            'Content-Type' => 'application/json',
                        ])->get($apiUrl);
                    
                    if ($response->successful()) {
                        break;
                    }
                    
                    $lastError = 'HTTP ' . $response->status();
                    if ($attempt < $maxRetries) {
                        sleep($attempt * 2);
                    }
                } catch (\Exception $e) {
                    $lastError = $e->getMessage();
                    if ($attempt < $maxRetries) {
                        sleep($attempt * 2);
                    }
                }
            }

            if (!$response || !$response->successful()) {
                $this->error('API request failed after ' . $maxRetries . ' retries: ' . $lastError);
                Log::error('Clarity API error after retries', ['error' => $lastError, 'date' => $snapshotDate]);
                return Command::FAILURE;
            }

            $data = $response->json();
            
            if (!is_array($data) || empty($data)) {
                $this->error('API returned invalid or empty data');
                Log::error('Clarity API returned invalid data', ['data' => $data, 'date' => $snapshotDate]);
                return Command::FAILURE;
            }

            $hasValidMetric = false;
            foreach ($data as $item) {
                if (isset($item['metricName']) && isset($item['information'])) {
                    $hasValidMetric = true;
                    break;
                }
            }
            
            if (!$hasValidMetric) {
                $this->error('API response missing required structure');
                Log::error('Clarity API response missing required fields', ['date' => $snapshotDate]);
                return Command::FAILURE;
            }

            $existingSnapshot = ClaritySnapshot::where('snapshot_date', $snapshotDate)->first();
            if ($existingSnapshot && !$force) {
                $this->info('Snapshot already exists for ' . $snapshotDate . ' (use --force to overwrite)');
                return Command::SUCCESS;
            }
            
            if ($existingSnapshot && $force) {
                $this->warn('Deleting existing snapshot for ' . $snapshotDate);
                $existingSnapshot->delete();
                Log::info('Deleted existing snapshot for force refresh', ['date' => $snapshotDate]);
            }

            DB::transaction(function () use ($data, $snapshotDate) {
                $timestamp = now('Europe/London');
                
                $snapshot = ClaritySnapshot::create([
                    'payload' => $data,
                    'last_fetched_at' => $timestamp,
                    'snapshot_date' => $snapshotDate,
                ]);

                $find = function(string $metricName) use ($data) {
                    foreach ($data as $item) {
                        if (($item['metricName'] ?? null) === $metricName) {
                            return $item['information'] ?? [];
                        }
                    }
                    return [];
                };

                // Traffic
                $traffic = $find('Traffic');
                if (!empty($traffic)) {
                    $t = $traffic[0];
                    DB::table('clarity_traffic')->insert([
                        'snapshot_id' => $snapshot->id,
                        'total_session_count' => (int) ($t['totalSessionCount'] ?? 0),
                        'total_bot_session_count' => (int) ($t['totalBotSessionCount'] ?? 0),
                        'distinct_user_count' => (int) ($t['distinctUserCount'] ?? 0),
                        'pages_per_session_percentage' => (float) ($t['pagesPerSessionPercentage'] ?? 0),
                        'created_at' => $timestamp,
                        'updated_at' => $timestamp,
                    ]);
                }

                // Engagement Time
                $eng = $find('EngagementTime');
                if (!empty($eng)) {
                    $e = $eng[0];
                    DB::table('clarity_engagement_time')->insert([
                        'snapshot_id' => $snapshot->id,
                        'total_time' => (int) ($e['totalTime'] ?? 0),
                        'active_time' => (int) ($e['activeTime'] ?? 0),
                        'created_at' => $timestamp,
                        'updated_at' => $timestamp,
                    ]);
                }

                // Scroll Depth
                $scroll = $find('ScrollDepth');
                if (!empty($scroll)) {
                    $s = $scroll[0];
                    DB::table('clarity_scroll_depth')->insert([
                        'snapshot_id' => $snapshot->id,
                        'average_scroll_depth' => (float) ($s['averageScrollDepth'] ?? 0),
                        'created_at' => $timestamp,
                        'updated_at' => $timestamp,
                    ]);
                }

                // Browser/Device/OS/Country arrays
                foreach ([
                    'Browser' => 'clarity_browsers',
                    'Device' => 'clarity_devices',
                    'OS' => 'clarity_oses',
                    'Country' => 'clarity_countries',
                ] as $metric => $table) {
                    $rows = $find($metric);
                    $batch = [];
                    foreach ($rows as $row) {
                        $batch[] = [
                            'snapshot_id' => $snapshot->id,
                            'name' => $row['name'] ?? null,
                            'sessions_count' => (int) ($row['sessionsCount'] ?? 0),
                            'created_at' => $timestamp,
                            'updated_at' => $timestamp,
                        ];
                    }
                    if (!empty($batch)) {
                        DB::table($table)->insert($batch);
                    }
                }

                // Referrers
                $referrers = $find('ReferrerUrl');
                if (!empty($referrers)) {
                    $batch = [];
                    foreach ($referrers as $r) {
                        $batch[] = [
                            'snapshot_id' => $snapshot->id,
                            'name' => $r['name'] ?? null,
                            'sessions_count' => (int) ($r['sessionsCount'] ?? 0),
                            'created_at' => $timestamp,
                            'updated_at' => $timestamp,
                        ];
                    }
                    DB::table('clarity_referrers')->insert($batch);
                }

                // Popular Pages
                $pages = $find('PopularPages');
                if (!empty($pages)) {
                    $batch = [];
                    foreach ($pages as $p) {
                        $batch[] = [
                            'snapshot_id' => $snapshot->id,
                            'url' => $p['url'] ?? '',
                            'visits_count' => (int) ($p['visitsCount'] ?? 0),
                            'created_at' => $timestamp,
                            'updated_at' => $timestamp,
                        ];
                    }
                    DB::table('clarity_popular_pages')->insert($batch);
                }

                // Engagement events
                foreach (['DeadClickCount','RageClickCount','QuickbackClick','ScriptErrorCount','ExcessiveScroll','ErrorClickCount'] as $metric) {
                    $rows = $find($metric);
                    if (!empty($rows)) {
                        $r = $rows[0];
                        DB::table('clarity_engagement_events')->insert([
                            'snapshot_id' => $snapshot->id,
                            'metric_name' => $metric,
                            'sessions_count' => (int) ($r['sessionsCount'] ?? 0),
                            'sessions_with_metric_percentage' => isset($r['sessionsWithMetricPercentage']) ? (float) $r['sessionsWithMetricPercentage'] : null,
                            'sessions_without_metric_percentage' => isset($r['sessionsWithoutMetricPercentage']) ? (float) $r['sessionsWithoutMetricPercentage'] : null,
                            'pages_views' => isset($r['pagesViews']) ? (int) $r['pagesViews'] : null,
                            'sub_total' => isset($r['subTotal']) ? (int) $r['subTotal'] : null,
                            'created_at' => $timestamp,
                            'updated_at' => $timestamp,
                        ]);
                    }
                }
            });

            $this->info('Analytics data saved for ' . $snapshotDate);
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Error: ' . $e->getMessage());
            Log::error('Clarity fetch exception', ['error' => $e->getMessage()]);
            return Command::FAILURE;
        }
    }
}

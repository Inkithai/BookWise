<?php

namespace Modules\GoogleAnalytics\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\ClaritySnapshot;

/**
 * @OA\Tag(
 *     name="Google Analytics",
 *     description="Microsoft Clarity Analytics API"
 * )
 */
class GoogleAnalyticsController extends Controller
{
    protected $authUser;

    public function __construct()
    {
        $this->middleware('auth:api');
        $this->middleware(function ($request, $next) {
            $this->authUser = Auth::guard('api')->user();
            return $next($request);
        });
    }

    /**
     * Get invoice analytics data
     * 
     * @OA\Get(
     *     path="/api/v1/admin/google-analytics/invoice",
     *     tags={"Google Analytics"},
     *     summary="Get invoice analytics data",
     *     description="Returns Microsoft Clarity analytics data for the specified date range",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="from_date",
     *         in="query",
     *         description="Start date (Y-m-d format)",
     *         required=false,
     *         @OA\Schema(type="string", format="date")
     *     ),
     *     @OA\Parameter(
     *         name="to_date",
     *         in="query",
     *         description="End date (Y-m-d format)",
     *         required=false,
     *         @OA\Schema(type="string", format="date")
     *     ),
     *     @OA\Parameter(
     *         name="date_range",
     *         in="query",
     *         description="Date range type",
     *         required=false,
     *         @OA\Schema(type="string")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Analytics data retrieved successfully"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden"
     *     )
     * )
     */
    public function invoice(Request $request)
    {
        if (!$this->authUser) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        if (! $this->authUser->hasRole('admin') && ! $this->authUser->hasRole('super-admin')) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');
        $selectedDateRange = $request->input('date_range');
        
        if (!$fromDate || !$toDate) {
            $today = \Carbon\Carbon::today('Europe/London')->format('Y-m-d');
            $fromDate = $today;
            $toDate = $today;
        }
        
        $snapshots = ClaritySnapshot::whereBetween('snapshot_date', [$fromDate, $toDate])
            ->orderBy('snapshot_date', 'asc')
            ->get();
        
        $latest = ClaritySnapshot::whereBetween('snapshot_date', [$fromDate, $toDate])
            ->orderBy('snapshot_date', 'desc')
            ->first();
        
        $availableDates = ClaritySnapshot::select('snapshot_date')
            ->whereNotNull('snapshot_date')
            ->distinct()
            ->orderBy('snapshot_date', 'desc')
            ->get()
            ->map(function($snapshot) {
                return [
                    'value' => $snapshot->snapshot_date,
                    'label' => \Carbon\Carbon::parse($snapshot->snapshot_date)->format('M d, Y')
                ];
            })
            ->toArray();

        $analyticsData = [];
        if ($snapshots->count() > 0) {
            $snapshotIds = $snapshots->pluck('id')->toArray();
            $trafficData = DB::table('clarity_traffic')
                ->whereIn('snapshot_id', $snapshotIds)
                ->selectRaw('
                    SUM(total_session_count) as total_session_count,
                    SUM(total_bot_session_count) as total_bot_session_count,
                    SUM(distinct_user_count) as distinct_user_count,
                    AVG(pages_per_session_percentage) as pages_per_session_percentage
                ')
                ->first();
            
            if ($trafficData && $trafficData->total_session_count > 0) {
                $analyticsData[] = [
                    'metricName' => 'Traffic',
                    'information' => [[
                        'totalSessionCount' => (string) $trafficData->total_session_count,
                        'totalBotSessionCount' => (string) $trafficData->total_bot_session_count,
                        'distinctUserCount' => (string) $trafficData->distinct_user_count,
                        'pagesPerSessionPercentage' => (float) round($trafficData->pages_per_session_percentage, 2),
                    ]],
                ];
            }

            // Aggregate Engagement Time (sum times)
            $engData = DB::table('clarity_engagement_time')
                ->whereIn('snapshot_id', $snapshotIds)
                ->selectRaw('SUM(total_time) as total_time, SUM(active_time) as active_time')
                ->first();
            
            if ($engData && ($engData->total_time > 0 || $engData->active_time > 0)) {
                $analyticsData[] = [
                    'metricName' => 'EngagementTime',
                    'information' => [[
                        'totalTime' => (string) $engData->total_time,
                        'activeTime' => (string) $engData->active_time,
                    ]],
                ];
            }

            // Aggregate Scroll Depth (average)
            $scrollData = DB::table('clarity_scroll_depth')
                ->whereIn('snapshot_id', $snapshotIds)
                ->selectRaw('AVG(average_scroll_depth) as average_scroll_depth')
                ->first();
            
            if ($scrollData && $scrollData->average_scroll_depth !== null) {
                $analyticsData[] = [
                    'metricName' => 'ScrollDepth',
                    'information' => [[
                        'averageScrollDepth' => (float) round($scrollData->average_scroll_depth, 2),
                    ]],
                ];
            }

            // Aggregate Browsers (group by name, sum sessions)
            $browsers = DB::table('clarity_browsers')
                ->whereIn('snapshot_id', $snapshotIds)
                ->selectRaw('name, SUM(sessions_count) as sessions_count')
                ->groupBy('name')
                ->orderByDesc('sessions_count')
                ->get();
            
            if ($browsers->count()) {
                $analyticsData[] = [
                    'metricName' => 'Browser',
                    'information' => $browsers->map(fn($r) => [
                        'name' => $r->name,
                        'sessionsCount' => (string) $r->sessions_count,
                    ])->toArray(),
                ];
            }

            // Aggregate Devices (group by name, sum sessions)
            $devices = DB::table('clarity_devices')
                ->whereIn('snapshot_id', $snapshotIds)
                ->selectRaw('name, SUM(sessions_count) as sessions_count')
                ->groupBy('name')
                ->orderByDesc('sessions_count')
                ->get();
            
            if ($devices->count()) {
                $analyticsData[] = [
                    'metricName' => 'Device',
                    'information' => $devices->map(fn($r) => [
                        'name' => $r->name,
                        'sessionsCount' => (string) $r->sessions_count,
                    ])->toArray(),
                ];
            }

            // Aggregate OS (group by name, sum sessions)
            $oses = DB::table('clarity_oses')
                ->whereIn('snapshot_id', $snapshotIds)
                ->selectRaw('name, SUM(sessions_count) as sessions_count')
                ->groupBy('name')
                ->orderByDesc('sessions_count')
                ->get();
            
            if ($oses->count()) {
                $analyticsData[] = [
                    'metricName' => 'OS',
                    'information' => $oses->map(fn($r) => [
                        'name' => $r->name,
                        'sessionsCount' => (string) $r->sessions_count,
                    ])->toArray(),
                ];
            }

            // Aggregate Countries (group by name, sum sessions)
            $countries = DB::table('clarity_countries')
                ->whereIn('snapshot_id', $snapshotIds)
                ->selectRaw('name, SUM(sessions_count) as sessions_count')
                ->groupBy('name')
                ->orderByDesc('sessions_count')
                ->get();
            
            if ($countries->count()) {
                $analyticsData[] = [
                    'metricName' => 'Country',
                    'information' => $countries->map(fn($r) => [
                        'name' => $r->name,
                        'sessionsCount' => (string) $r->sessions_count,
                    ])->toArray(),
                ];
            }

            // Aggregate Referrers (group by name, sum sessions)
            $referrers = DB::table('clarity_referrers')
                ->whereIn('snapshot_id', $snapshotIds)
                ->selectRaw('name, SUM(sessions_count) as sessions_count')
                ->groupBy('name')
                ->orderByDesc('sessions_count')
                ->get();
            
            if ($referrers->count()) {
                $analyticsData[] = [
                    'metricName' => 'ReferrerUrl',
                    'information' => $referrers->map(fn($r) => [
                        'name' => $r->name,
                        'sessionsCount' => (string) $r->sessions_count,
                    ])->toArray(),
                ];
            }

            // Aggregate Popular Pages (group by url, sum visits)
            $pages = DB::table('clarity_popular_pages')
                ->whereIn('snapshot_id', $snapshotIds)
                ->selectRaw('url, SUM(visits_count) as visits_count')
                ->groupBy('url')
                ->orderByDesc('visits_count')
                ->get();
            
            if ($pages->count()) {
                $analyticsData[] = [
                    'metricName' => 'PopularPages',
                    'information' => $pages->map(fn($r) => [
                        'url' => $r->url,
                        'visitsCount' => (string) $r->visits_count,
                    ])->toArray(),
                ];
            }

            // Aggregate Engagement Events (group by metric_name, sum counts)
            $events = DB::table('clarity_engagement_events')
                ->whereIn('snapshot_id', $snapshotIds)
                ->selectRaw('
                    metric_name,
                    SUM(sessions_count) as sessions_count,
                    AVG(sessions_with_metric_percentage) as sessions_with_metric_percentage,
                    AVG(sessions_without_metric_percentage) as sessions_without_metric_percentage,
                    SUM(pages_views) as pages_views,
                    SUM(sub_total) as sub_total
                ')
                ->groupBy('metric_name')
                ->get();
            
            foreach ($events as $event) {
                $analyticsData[] = [
                    'metricName' => $event->metric_name,
                    'information' => [[
                        'sessionsCount' => (string) ($event->sessions_count ?? 0),
                        'sessionsWithMetricPercentage' => $event->sessions_with_metric_percentage !== null ? (float) round($event->sessions_with_metric_percentage, 2) : 0,
                        'sessionsWithoutMetricPercentage' => $event->sessions_without_metric_percentage !== null ? (float) round($event->sessions_without_metric_percentage, 2) : 0,
                        'pagesViews' => (string) ($event->pages_views ?? 0),
                        'subTotal' => (string) ($event->sub_total ?? 0),
                    ]],
                ];
            }
        }

        return response()->json([
            'analyticsData' => $analyticsData,
            'error' => null,
            'lastFetchedAt' => $latest?->last_fetched_at,
            'selectedDateRange' => $selectedDateRange,
            'fromDate' => $fromDate,
            'toDate' => $toDate,
            'availableDates' => $availableDates,
        ]);
    }

    /**
     * Fetch and store clarity analytics data
     * 
     * @OA\Post(
     *     path="/api/v1/admin/google-analytics/fetch-clarity",
     *     tags={"Google Analytics"},
     *     summary="Fetch and store clarity analytics data",
     *     description="Fetches data from Microsoft Clarity API and stores it",
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         @OA\JsonContent(
     *             @OA\Property(property="date", type="string", format="date", description="Date to fetch data for"),
     *             @OA\Property(property="force", type="boolean", description="Force refresh existing data")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Analytics data saved successfully"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden"
     *     ),
     *     @OA\Response(
     *         response=409,
     *         description="Snapshot already exists"
     *     )
     * )
     */
    public function fetchAndStore(Request $request)
    {
        if (! $this->authUser->hasRole('admin') && ! $this->authUser->hasRole('super-admin')) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $request->validate([
            'date' => 'nullable|date_format:Y-m-d|before_or_equal:today',
            'force' => 'nullable|boolean',
        ]);

        try {
            $apiUrl = env('GOOGLE_ANALYTICS_URL');
            $apiToken = env('GOOGLE_ANALYTICS_ID');

            if (!empty($apiUrl) && !str_starts_with($apiUrl, 'http')) {
                $apiUrl = 'https://' . $apiUrl;
            }

            if (empty($apiUrl) || empty($apiToken)) {
                return response()->json(['success' => false, 'message' => 'API credentials not configured'], 422);
            }

            $snapshotDate = $request->input('date') 
                ? \Carbon\Carbon::parse($request->input('date'), 'Europe/London')->format('Y-m-d')
                : now('Europe/London')->format('Y-m-d');
            
            // Default force=true because this endpoint is explicitly a "fetch fresh data" action.
            // If a snapshot already exists it should be overwritten unless the caller explicitly passes force=false.
            $force = $request->boolean('force', true);

            $response = null;
            $lastError = null;
            $maxRetries = 3;
            
            for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
                try {
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
                Log::error('Clarity API error after retries', ['error' => $lastError]);
                return response()->json([
                    'success' => false,
                    'message' => 'API request failed after retries'
                ], 502);
            }

            $data = $response->json();
            
            if (!is_array($data) || empty($data)) {
                Log::error('Clarity API returned invalid data', ['data' => $data]);
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid API response'
                ], 502);
            }

            $hasValidMetric = false;
            foreach ($data as $item) {
                if (isset($item['metricName']) && isset($item['information'])) {
                    $hasValidMetric = true;
                    break;
                }
            }
            
            if (!$hasValidMetric) {
                Log::error('Clarity API response missing required fields', ['data' => $data]);
                return response()->json([
                    'success' => false,
                    'message' => 'API response missing required structure'
                ], 502);
            }
            
            $existingSnapshot = ClaritySnapshot::where('snapshot_date', $snapshotDate)->first();
            if ($existingSnapshot && !$force) {
                return response()->json(['success' => false, 'message' => 'Snapshot already exists for ' . $snapshotDate], 409);
            }
            
            if ($existingSnapshot && $force) {
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

            return response()->json(['success' => true, 'message' => 'Analytics data saved']);
        } catch (\Exception $e) {
            Log::error('Clarity fetch exception', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Error occurred'], 500);
        }
    }
}

<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Fetch Clarity analytics data daily at 11:00 PM London time
// Defaults to yesterday's date (since analytics data is available for previous day)
Schedule::command('clarity:fetch-data')
    ->dailyAt('23:00')
    ->timezone('Europe/London')
    ->appendOutputTo(storage_path('logs/clarity-fetch.log'))
    ->emailOutputOnFailure('dilani@globaltechdevelop.com');

Schedule::command('subscriptions:process-trials')
    ->dailyAt('08:00')
    ->withoutOverlapping()
    ->appendOutputTo(storage_path('logs/subscription-trials.log'));

Schedule::command('check-trails')
    ->dailyAt('23:00')
    ->timezone('Europe/London')
    ->appendOutputTo(storage_path('logs/subscriptions.log'));


Schedule::command('charge-subscriptions')
    ->dailyAt('23:00')
    ->timezone('Europe/London')
    ->appendOutputTo(storage_path('logs/subscriptions.log'));

Schedule::command('recurring-statements:process')
    ->hourly()
    ->timezone('Europe/London')
    ->appendOutputTo(storage_path('logs/recurring-statements.log'))
    ->withoutOverlapping(30);

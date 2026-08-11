<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\EmailTestController;

// Email Template Preview (For Approval)
Route::get('/email-preview', function () {
    return view('emails.preview.master-preview');
});

// Email Testing Routes
Route::prefix('email-test')->group(function () {
    Route::get('/', [EmailTestController::class, 'index'])->name('email.test');
    Route::post('/send', [EmailTestController::class, 'sendTest'])->name('email.test.send');
    Route::get('/preview/{template}', [EmailTestController::class, 'previewHtml'])->name('email.test.preview');
    Route::get('/download/{template}', [EmailTestController::class, 'downloadHtml'])->name('email.test.download');
});


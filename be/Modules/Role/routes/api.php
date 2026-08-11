<?php

use Illuminate\Support\Facades\Route;
use Modules\Role\Http\Controllers\API\PermissionController;
use Modules\Role\Http\Controllers\API\RoleController;

Route::prefix('v1/admin')->group(function () {
    Route::middleware('auth.verified')->prefix('roles')->name('admin.roles.')->group(function () {

        Route::get('/', [RoleController::class, 'index'])
            // ->middleware('can:viewAny,' . Role::class)
            ->name('index');

        Route::post('/', [RoleController::class, 'store'])
            // ->middleware('can:create,' . Role::class)
            ->name('store');

        Route::get('{id}', [RoleController::class, 'show'])
            // ->middleware('can:view,role')
            ->name('show');

        Route::put('{id}', [RoleController::class, 'update'])
            // ->middleware('can:update,role')
            ->name('update');

        Route::delete('{id}', [RoleController::class, 'destroy'])
            // ->middleware('can:delete,role')
            ->name('destroy');

        Route::post('{id}/permissions', [PermissionController::class, 'assignPermissions'])
            // ->middleware('can:create,' . Role::class)
            ->name('assignPermissions');
    });
});

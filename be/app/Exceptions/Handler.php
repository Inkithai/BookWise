<?php

namespace App\Exceptions;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * A list of exception types that are not reported.
     *
     * @var array
     */
    protected $dontReport = [];

    /**
     * A list of inputs that are never flashed for validation exceptions.
     *
     * @var array
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register any exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            // Add custom reporting here if needed
        });
    }

    /**
     * Render an exception into an HTTP response.
     */
    public function render($request, Throwable $e)
    {
        if ($request->expectsJson() || $request->is('api/*')) {
            return $this->handleApiException($request, $e);
        }

        return parent::render($request, $e);
    }

    /**
     * Customize response for API exceptions.
     */
    protected function handleApiException($request, Throwable $e)
    {
        $status = 500;
        $message = 'Something went wrong. Please try again later.';
        $errors = [];

        switch (true) {
            case $e instanceof ValidationException:
                $status = 422;
                $message = 'Validation failed';
                $errors = $e->errors();
                break;

            case $e instanceof ModelNotFoundException:
            case $e instanceof NotFoundHttpException:
                $status = 404;
                $message = 'Resource not found';
                break;

            case $e instanceof AuthenticationException:
                $status = 401;
                $message = 'Unauthenticated.';
                break;

            case $e instanceof AuthorizationException:
                $status = 403;
                $message = 'You do not have permission to perform this action.';
                break;

            case $e instanceof MethodNotAllowedHttpException:
                $status = 405;
                $message = 'Method not allowed';
                break;

            case $e instanceof HttpException:
                $status = $e->getStatusCode();
                $message = $e->getMessage() ?: 'HTTP error';
                break;

            case $e instanceof HttpResponseException:
                return $e->getResponse();
        }

        return response()->json([
            'error' => true,
            'message' => $message,
            'code' => $status,
            'errors' => $errors,
            'timestamp' => now()->toIso8601String(),
        ], $status);
    }

    /**
     * Customize the response for unauthenticated users.
     */
    protected function unauthenticated($request, AuthenticationException $exception)
    {
        Log::warning('Unauthenticated API request', [
            'guards' => $exception->guards(),
            'url' => $request->fullUrl(),
        ]);

        return response()->json([
            'error' => true,
            'message' => 'Unauthenticated.',
            'code' => 401,
            'errors' => [],
            'timestamp' => now()->toIso8601String(),
        ], 401);
    }
}

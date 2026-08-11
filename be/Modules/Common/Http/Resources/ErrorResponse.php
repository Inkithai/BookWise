<?php

namespace Modules\Common\Http\Resources;

/**
 * @OA\Schema(
 *     schema="ErrorResponse",
 *     type="object",
 *     description="Standard error response",
 *     @OA\Property(property="error", type="boolean", example=true, description="Indicates if error occurred"),
 *     @OA\Property(property="message", type="string", example="Resource not found", description="Error message"),
 *     @OA\Property(property="code", type="integer", example=404, description="HTTP status code"),
 *     @OA\Property(
 *         property="errors",
 *         type="object",
 *         nullable=true,
 *         description="Additional error details (validation errors, etc.)",
 *         example={"email": {"The email field is required."}}
 *     ),
 *     @OA\Property(property="timestamp", type="string", format="date-time", example="2025-05-30T12:34:56Z", description="Timestamp of the error response")
 * )
 */
class ErrorResponse
{
    // This class is only for Swagger documentation and does not require implementation.
}

<?php

namespace App\Swagger;


/**
 * @OA\SecurityScheme(
 *     type="http",
 *     description="Enter JWT Bearer token",
 *     name="Authorization",
 *     in="header",
 *     scheme="bearer",
 *     bearerFormat="JWT",
 *     securityScheme="bearerAuth",
 * )
 */

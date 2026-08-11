<?php

namespace App\Traits;

use Illuminate\Support\Facades\Http;

trait ApiTrait
{
    public function get(array $headers, string $url, array $param = [])
    {
        return Http::withHeaders($headers)->get($url, $param);
    }
    public function post(array $headers, string $url, array $param = [])
    {
        return Http::withHeaders($headers)->post($url, $param);
    }
}

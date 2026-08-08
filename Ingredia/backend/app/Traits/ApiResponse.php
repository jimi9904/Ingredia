<?php

namespace App\Traits;

use Illuminate\Http\JsonResponse;
use Illuminate\Pagination\LengthAwarePaginator;

trait ApiResponse
{
    /**
     * Return a successful JSON response.
     */
    protected function success($data = null, string $message = '', int $code = 200): JsonResponse
    {
        $response = ['success' => true];

        if ($message) {
            $response['message'] = $message;
        }

        if ($data !== null) {
            $response['data'] = $data;
        }

        return response()->json($response, $code);
    }

    /**
     * Return a paginated JSON response.
     */
    protected function paginated(LengthAwarePaginator $paginator, string $message = ''): JsonResponse
    {
        $response = [
            'success' => true,
            'data'    => $paginator->items(),
            'meta'    => [
                'total'        => $paginator->total(),
                'page'         => $paginator->currentPage(),
                'per_page'     => $paginator->perPage(),
                'last_page'    => $paginator->lastPage(),
                'has_more'     => $paginator->hasMorePages(),
            ],
        ];

        if ($message) {
            $response['message'] = $message;
        }

        return response()->json($response);
    }

    /**
     * Return an error JSON response.
     */
    protected function error(string $message, int $code = 400, array $errors = []): JsonResponse
    {
        $response = [
            'success' => false,
            'message' => $message,
        ];

        if (!empty($errors)) {
            $response['errors'] = $errors;
        }

        return response()->json($response, $code);
    }
}

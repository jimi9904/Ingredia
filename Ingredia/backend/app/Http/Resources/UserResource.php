<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => (string) $this->_id,
            'name'        => $this->name,
            'email'       => $this->email,
            'role'        => $this->role,
            'preferences' => $this->preferences ?? ['dietary' => [], 'allergies' => [], 'cuisine_preference' => []],
            'verified'    => !is_null($this->email_verified_at),
            'created_at'  => $this->created_at,
        ];
    }
}

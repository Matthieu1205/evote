<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string,mixed>
     */
    public function rules(): array
    {
        return [
            'firstName' => ['sometimes', 'nullable', 'string'],
            'lastName' => ['sometimes', 'nullable', 'string'],
            'phone' => ['sometimes', 'nullable', 'string'],
            'section' => ['sometimes', 'nullable', 'string'],
            'region' => ['sometimes', 'nullable', 'string'],
            'photoUrl' => ['sometimes', 'nullable', 'string'],
        ];
    }
}

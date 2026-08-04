<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
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
            'organizationSlug' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'otp' => ['nullable', 'string'],
        ];
    }
}

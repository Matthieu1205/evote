<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateOrgAdminRequest extends FormRequest
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
            'ordreNumber' => ['required', 'string'],
            'email' => ['required', 'email'],
            'firstName' => ['required', 'string'],
            'lastName' => ['required', 'string'],
        ];
    }
}

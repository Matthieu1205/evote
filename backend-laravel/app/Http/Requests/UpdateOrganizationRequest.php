<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateOrganizationRequest extends FormRequest
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
            'name' => ['sometimes', 'string'],
            'memberLabel' => ['sometimes', 'string'],
            'logoUrl' => ['sometimes', 'nullable', 'string'],
            'primaryColor' => ['sometimes', 'nullable', 'string'],
        ];
    }
}

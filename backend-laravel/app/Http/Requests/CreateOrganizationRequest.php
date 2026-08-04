<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateOrganizationRequest extends FormRequest
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
            'slug' => ['required', 'string', 'regex:/^[a-z0-9-]+$/'],
            'name' => ['required', 'string'],
            'memberLabel' => ['nullable', 'string'],
            'logoUrl' => ['nullable', 'string'],
            'primaryColor' => ['nullable', 'string'],
        ];
    }

    /**
     * @return array<string,string>
     */
    public function messages(): array
    {
        return [
            'slug.regex' => 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets.',
        ];
    }
}

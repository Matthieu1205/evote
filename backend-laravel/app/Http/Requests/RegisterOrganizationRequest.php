<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterOrganizationRequest extends FormRequest
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
            'slug' => ['required', 'string'],
            'name' => ['required', 'string'],
            'memberLabel' => ['nullable', 'string'],
            'primaryColor' => ['nullable', 'string'],
            'logoUrl' => ['nullable', 'string'],
            'adminFirstName' => ['required', 'string'],
            'adminLastName' => ['required', 'string'],
            'adminEmail' => ['required', 'email'],
            'adminPassword' => ['required', 'string', 'min:8'],
        ];
    }

    /**
     * @return array<string,string>
     */
    public function messages(): array
    {
        return [
            'adminPassword.min' => 'Le mot de passe doit contenir au moins 8 caractères.',
        ];
    }
}

<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
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
            'ordreNumber' => ['sometimes', 'string'],
            'email' => ['sometimes', 'email'],
            'firstName' => ['sometimes', 'string'],
            'lastName' => ['sometimes', 'string'],
            'role' => ['sometimes', 'in:ELECTEUR,CANDIDAT,COMMISSION,ADMIN,OBSERVATEUR,SUPER_ADMIN'],
            'status' => ['sometimes', 'in:ACTIF,SUSPENDU,RADIE,RETRAITE'],
            'isEligible' => ['sometimes', 'boolean'],
            'section' => ['sometimes', 'nullable', 'string'],
            'region' => ['sometimes', 'nullable', 'string'],
            'phone' => ['sometimes', 'nullable', 'string'],
            'membershipDate' => ['sometimes', 'nullable', 'date'],
            'duesUpToDate' => ['sometimes', 'boolean'],
            'password' => ['sometimes', 'string', 'min:8'],
        ];
    }
}

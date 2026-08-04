<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateUserRequest extends FormRequest
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
            'ordreNumber' => ['nullable', 'string'],
            'email' => ['required', 'email'],
            'firstName' => ['required', 'string'],
            'lastName' => ['required', 'string'],
            'role' => ['nullable', 'in:ELECTEUR,CANDIDAT,COMMISSION,ADMIN,OBSERVATEUR,SUPER_ADMIN'],
            'status' => ['nullable', 'in:ACTIF,SUSPENDU,RADIE,RETRAITE'],
            'isEligible' => ['nullable', 'boolean'],
            'section' => ['nullable', 'string'],
            'region' => ['nullable', 'string'],
            'phone' => ['nullable', 'string'],
            'membershipDate' => ['nullable', 'date'],
            'duesUpToDate' => ['nullable', 'boolean'],
        ];
    }
}

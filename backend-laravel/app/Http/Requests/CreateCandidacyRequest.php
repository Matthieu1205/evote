<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateCandidacyRequest extends FormRequest
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
            'positionId' => ['required', 'string'],
            'profession' => ['nullable', 'string'],
            'currentRole' => ['nullable', 'string'],
            'employer' => ['nullable', 'string'],
            'yearsExperience' => ['nullable', 'integer', 'min:0'],
            'education' => ['nullable', 'string'],
            'age' => ['nullable', 'integer', 'min:18'],
            'biography' => ['nullable', 'string'],
            'pastRoles' => ['nullable', 'string'],
            'motivation' => ['nullable', 'string'],
            'photoUrl' => ['nullable', 'string'],
            'videoUrl' => ['nullable', 'string'],
            'program' => ['nullable', 'string'],
            'documentUrl' => ['nullable', 'string'],
            'acceptConditions' => ['nullable', 'boolean'],
        ];
    }
}

<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCandidacyRequest extends FormRequest
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
            'profession' => ['sometimes', 'nullable', 'string'],
            'currentRole' => ['sometimes', 'nullable', 'string'],
            'employer' => ['sometimes', 'nullable', 'string'],
            'yearsExperience' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'education' => ['sometimes', 'nullable', 'string'],
            'age' => ['sometimes', 'nullable', 'integer', 'min:18'],
            'biography' => ['sometimes', 'nullable', 'string'],
            'pastRoles' => ['sometimes', 'nullable', 'string'],
            'motivation' => ['sometimes', 'nullable', 'string'],
            'photoUrl' => ['sometimes', 'nullable', 'string'],
            'videoUrl' => ['sometimes', 'nullable', 'string'],
            'program' => ['sometimes', 'nullable', 'string'],
            'documentUrl' => ['sometimes', 'nullable', 'string'],
        ];
    }
}

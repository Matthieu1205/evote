<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateElectionRequest extends FormRequest
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
            'title' => ['sometimes', 'string'],
            'description' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', 'in:BROUILLON,PLANIFIE,OUVERT,CLOS,DEPOUILLE,PUBLIE'],
            'majorityRule' => ['sometimes', 'in:RELATIVE,ABSOLUE'],
            'totalRounds' => ['sometimes', 'integer', 'min:1'],
            'startAt' => ['sometimes', 'date'],
            'endAt' => ['sometimes', 'date'],
            'candidacyStartAt' => ['sometimes', 'nullable', 'date'],
            'candidacyEndAt' => ['sometimes', 'nullable', 'date'],
            'resultsPublishAt' => ['sometimes', 'nullable', 'date'],
            'eligibleSection' => ['sometimes', 'nullable', 'string'],
        ];
    }
}

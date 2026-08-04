<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateElectionRequest extends FormRequest
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
            'title' => ['required', 'string'],
            'description' => ['nullable', 'string'],
            'majorityRule' => ['nullable', 'in:RELATIVE,ABSOLUE'],
            'totalRounds' => ['nullable', 'integer', 'min:1'],
            'startAt' => ['required', 'date'],
            'endAt' => ['required', 'date'],
            'candidacyStartAt' => ['nullable', 'date'],
            'candidacyEndAt' => ['nullable', 'date'],
            'resultsPublishAt' => ['nullable', 'date'],
            'eligibleSection' => ['nullable', 'string'],
            'positions' => ['nullable', 'array'],
            'positions.*.title' => ['required_with:positions', 'string'],
            'positions.*.description' => ['nullable', 'string'],
            'positions.*.seats' => ['nullable', 'integer', 'min:1'],
            'positions.*.order' => ['nullable', 'integer'],
        ];
    }
}

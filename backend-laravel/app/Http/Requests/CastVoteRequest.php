<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CastVoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * choices : { [positionId]: [candidacyId, ...] }
     *
     * @return array<string,mixed>
     */
    public function rules(): array
    {
        return [
            'electionId' => ['required', 'string'],
            'otp' => ['required', 'string'],
            'choices' => ['required', 'array', 'max:50'],
            'choices.*' => ['array', 'max:50'],
            'choices.*.*' => ['string', 'max:100'],
        ];
    }
}

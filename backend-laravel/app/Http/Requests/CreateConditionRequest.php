<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateConditionRequest extends FormRequest
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
            'text' => ['required', 'string', 'min:3'],
            'order' => ['nullable', 'integer', 'min:0'],
        ];
    }
}

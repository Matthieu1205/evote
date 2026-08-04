<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateConditionRequest extends FormRequest
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
            'text' => ['sometimes', 'string', 'min:3'],
            'order' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}

<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ChangeStatusRequest extends FormRequest
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
            'status' => ['required', 'in:BROUILLON,PLANIFIE,OUVERT,CLOS,DEPOUILLE,PUBLIE'],
        ];
    }
}

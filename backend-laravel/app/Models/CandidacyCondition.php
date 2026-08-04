<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CandidacyCondition extends Model
{
    use HasUlids;

    public $timestamps = false;

    protected $fillable = [
        'organization_id', 'text', 'order', 'created_at',
    ];

    protected $casts = [
        'order' => 'integer',
        'created_at' => 'datetime',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}

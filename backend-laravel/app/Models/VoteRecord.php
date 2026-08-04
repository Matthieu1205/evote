<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VoteRecord extends Model
{
    use HasUlids;

    public $timestamps = false;

    protected $fillable = [
        'organization_id', 'election_id', 'user_id', 'round', 'voted_at',
    ];

    protected $casts = [
        'round' => 'integer',
        'voted_at' => 'datetime',
    ];

    public function election(): BelongsTo
    {
        return $this->belongsTo(Election::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

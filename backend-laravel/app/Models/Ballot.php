<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Ballot extends Model
{
    use HasUlids;

    // Seulement created_at (fixé explicitement à la création du bulletin,
    // avec jitter anti-corrélation — voir VoteService).
    public $timestamps = false;

    protected $fillable = [
        'organization_id', 'election_id', 'round',
        'ciphertext', 'iv', 'auth_tag', 'created_at',
    ];

    protected $casts = [
        'round' => 'integer',
        'created_at' => 'datetime',
    ];

    public function election(): BelongsTo
    {
        return $this->belongsTo(Election::class);
    }
}

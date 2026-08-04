<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Election extends Model
{
    use HasUlids;

    protected $fillable = [
        'organization_id', 'title', 'description', 'status', 'majority_rule',
        'total_rounds', 'current_round', 'start_at', 'end_at',
        'candidacy_start_at', 'candidacy_end_at', 'results_publish_at',
        'eligible_section', 'reminder_sent_at',
    ];

    protected $casts = [
        'start_at' => 'datetime',
        'end_at' => 'datetime',
        'candidacy_start_at' => 'datetime',
        'candidacy_end_at' => 'datetime',
        'results_publish_at' => 'datetime',
        'reminder_sent_at' => 'datetime',
        'total_rounds' => 'integer',
        'current_round' => 'integer',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function positions(): HasMany
    {
        return $this->hasMany(Position::class);
    }

    public function ballots(): HasMany
    {
        return $this->hasMany(Ballot::class);
    }

    public function voteRecords(): HasMany
    {
        return $this->hasMany(VoteRecord::class);
    }
}

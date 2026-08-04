<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Position extends Model
{
    use HasUlids;

    // Aucune colonne created_at/updated_at (parité avec le modèle Prisma).
    public $timestamps = false;

    protected $fillable = [
        'organization_id', 'election_id', 'title', 'description', 'seats', 'order',
    ];

    protected $casts = [
        'seats' => 'integer',
        'order' => 'integer',
    ];

    public function election(): BelongsTo
    {
        return $this->belongsTo(Election::class);
    }

    public function candidacies(): HasMany
    {
        return $this->hasMany(Candidacy::class);
    }
}

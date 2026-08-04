<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Candidacy extends Model
{
    use HasUlids;

    protected $table = 'candidacies';

    // Le modèle porte submitted_at / reviewed_at plutôt que created/updated_at.
    public $timestamps = false;

    protected $fillable = [
        'organization_id', 'position_id', 'user_id', 'status', 'last_round',
        'profession', 'current_role', 'employer', 'years_experience', 'education',
        'age', 'biography', 'past_roles', 'motivation', 'photo_url', 'video_url',
        'program', 'document_url', 'review_note', 'conditions_accepted_at',
        'submitted_at', 'reviewed_at',
    ];

    protected $casts = [
        'age' => 'integer',
        'years_experience' => 'integer',
        'last_round' => 'integer',
        'conditions_accepted_at' => 'datetime',
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

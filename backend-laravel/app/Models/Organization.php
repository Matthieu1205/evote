<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Organization extends Model
{
    use HasUlids;

    protected $fillable = [
        'slug', 'name', 'member_label', 'logo_url', 'primary_color', 'is_platform',
    ];

    protected $casts = [
        'is_platform' => 'boolean',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function elections(): HasMany
    {
        return $this->hasMany(Election::class);
    }

    public function candidacyConditions(): HasMany
    {
        return $this->hasMany(CandidacyCondition::class);
    }
}

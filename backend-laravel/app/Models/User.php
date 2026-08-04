<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasUlids, Notifiable;

    protected $fillable = [
        'organization_id', 'ordre_number', 'email', 'first_name', 'last_name',
        'password_hash', 'role', 'status', 'is_eligible', 'section', 'region',
        'phone', 'photo_url', 'membership_date', 'dues_up_to_date',
        'must_change_password',
    ];

    protected $hidden = [
        'password_hash', 'remember_token',
    ];

    protected $casts = [
        'is_eligible' => 'boolean',
        'dues_up_to_date' => 'boolean',
        'must_change_password' => 'boolean',
        'membership_date' => 'date',
    ];

    /**
     * Le mot de passe est stocké dans `password_hash` (compat. schéma NestJS).
     */
    public function getAuthPassword(): string
    {
        return $this->password_hash;
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function candidacies(): HasMany
    {
        return $this->hasMany(Candidacy::class);
    }

    public function voteRecords(): HasMany
    {
        return $this->hasMany(VoteRecord::class);
    }

    public function otps(): HasMany
    {
        return $this->hasMany(Otp::class);
    }
}

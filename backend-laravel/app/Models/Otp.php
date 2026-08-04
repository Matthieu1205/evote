<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Otp extends Model
{
    use HasUlids;

    protected $table = 'otps';

    public $timestamps = false;

    protected $fillable = [
        'user_id', 'code_hash', 'purpose', 'context',
        'expires_at', 'consumed', 'attempts', 'created_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'created_at' => 'datetime',
        'consumed' => 'boolean',
        'attempts' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

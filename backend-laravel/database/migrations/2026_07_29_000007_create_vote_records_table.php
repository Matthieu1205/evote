<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vote_records', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignUlid('election_id')->constrained('elections')->cascadeOnDelete();
            $table->foreignUlid('user_id')->constrained('users')->cascadeOnDelete();
            $table->integer('round')->default(1);
            $table->dateTime('voted_at')->useCurrent();

            // Émargement : garantit l'unicité du vote (anti-double-vote).
            $table->unique(['election_id', 'user_id', 'round']);
            $table->index(['election_id', 'round']);
            $table->index('organization_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vote_records');
    }
};

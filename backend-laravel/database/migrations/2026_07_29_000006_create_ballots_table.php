<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ballots', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignUlid('election_id')->constrained('elections')->cascadeOnDelete();
            $table->integer('round')->default(1);
            // Bulletin chiffré (AES-256-GCM) — aucun lien vers l'électeur.
            $table->text('ciphertext');
            $table->string('iv');
            $table->string('auth_tag');
            $table->dateTime('created_at');

            $table->index(['election_id', 'round']);
            $table->index('organization_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ballots');
    }
};

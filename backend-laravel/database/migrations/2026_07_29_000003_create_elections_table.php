<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('elections', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            // Statuts : BROUILLON, PLANIFIE, OUVERT, CLOS, DEPOUILLE, PUBLIE
            $table->string('status')->default('BROUILLON');
            // Règle de majorité : RELATIVE, ABSOLUE
            $table->string('majority_rule')->default('RELATIVE');
            $table->integer('total_rounds')->default(1);
            $table->integer('current_round')->default(1);
            $table->dateTime('start_at');
            $table->dateTime('end_at');
            $table->dateTime('candidacy_start_at')->nullable();
            $table->dateTime('candidacy_end_at')->nullable();
            $table->dateTime('results_publish_at')->nullable();
            $table->string('eligible_section')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('organization_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('elections');
    }
};

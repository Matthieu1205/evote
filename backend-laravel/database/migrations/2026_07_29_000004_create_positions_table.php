<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('positions', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignUlid('election_id')->constrained('elections')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->integer('seats')->default(1);
            $table->integer('order')->default(0);
            // Pas de timestamps (modèle Position sans createdAt/updatedAt).

            $table->index('election_id');
            $table->index('organization_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('positions');
    }
};

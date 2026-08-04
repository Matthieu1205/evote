<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('candidacy_conditions', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->text('text');
            $table->integer('order')->default(0);
            $table->dateTime('created_at');

            $table->index('organization_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('candidacy_conditions');
    }
};

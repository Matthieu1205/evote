<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('organization_id')->nullable()->constrained('organizations')->nullOnDelete();
            $table->foreignUlid('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action');
            $table->string('entity')->nullable();
            $table->string('entity_id')->nullable();
            $table->json('meta')->nullable();
            $table->string('ip')->nullable();
            $table->dateTime('created_at');

            $table->index('action');
            $table->index('created_at');
            $table->index('organization_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};

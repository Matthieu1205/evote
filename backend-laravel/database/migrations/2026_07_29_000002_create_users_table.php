<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('ordre_number');
            $table->string('email');
            $table->string('first_name');
            $table->string('last_name');
            $table->string('password_hash');
            // Rôles : ELECTEUR, CANDIDAT, COMMISSION, ADMIN, OBSERVATEUR, SUPER_ADMIN
            $table->string('role')->default('ELECTEUR');
            // Statuts : ACTIF, SUSPENDU, RADIE, RETRAITE
            $table->string('status')->default('ACTIF');
            $table->boolean('is_eligible')->default(true);
            $table->string('section')->nullable();
            $table->string('region')->nullable();
            $table->string('phone')->nullable();
            $table->longText('photo_url')->nullable();
            $table->rememberToken();
            $table->timestamps();

            $table->unique(['organization_id', 'ordre_number']);
            $table->unique(['organization_id', 'email']);
            $table->index('role');
            $table->index('status');
            $table->index('organization_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};

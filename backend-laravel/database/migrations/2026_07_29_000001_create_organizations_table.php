<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organizations', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('member_label')->default('Numéro de membre');
            $table->longText('logo_url')->nullable();
            $table->string('primary_color')->nullable();
            $table->boolean('is_platform')->default(false);
            $table->timestamps();

            $table->index('is_platform');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organizations');
    }
};

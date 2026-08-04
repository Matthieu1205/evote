<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('otps', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('code_hash');
            // Buts : LOGIN, VOTE, RESET
            $table->string('purpose');
            $table->string('context')->nullable();
            $table->dateTime('expires_at');
            $table->boolean('consumed')->default(false);
            $table->integer('attempts')->default(0);
            $table->dateTime('created_at');

            $table->index(['user_id', 'purpose']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('otps');
    }
};

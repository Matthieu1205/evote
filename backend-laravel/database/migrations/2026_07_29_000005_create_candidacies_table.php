<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('candidacies', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignUlid('position_id')->constrained('positions')->cascadeOnDelete();
            $table->foreignUlid('user_id')->constrained('users')->cascadeOnDelete();
            // Statuts : SOUMISE, VALIDEE, REJETEE, RETIREE
            $table->string('status')->default('SOUMISE');
            $table->string('profession')->nullable();
            $table->integer('age')->nullable();
            $table->text('biography')->nullable();
            $table->longText('photo_url')->nullable();
            $table->longText('video_url')->nullable();
            $table->text('program')->nullable();
            $table->longText('document_url')->nullable();
            $table->text('review_note')->nullable();
            $table->dateTime('submitted_at')->useCurrent();
            $table->dateTime('reviewed_at')->nullable();

            $table->unique(['position_id', 'user_id']);
            $table->index('status');
            $table->index('organization_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('candidacies');
    }
};

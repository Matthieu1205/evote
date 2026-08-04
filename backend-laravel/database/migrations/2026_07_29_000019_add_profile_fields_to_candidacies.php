<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Champs déclarés par le candidat : parcours professionnel et engagement
 * associatif.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('candidacies', function (Blueprint $table) {
            $table->string('current_role')->nullable()->after('profession');
            $table->string('employer')->nullable()->after('current_role');
            $table->integer('years_experience')->nullable()->after('employer');
            $table->string('education')->nullable()->after('years_experience');
            $table->text('past_roles')->nullable()->after('biography');
            $table->text('motivation')->nullable()->after('past_roles');
        });
    }

    public function down(): void
    {
        Schema::table('candidacies', function (Blueprint $table) {
            $table->dropColumn(['current_role', 'employer', 'years_experience', 'education', 'past_roles', 'motivation']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `last_round` : dernier tour où la candidature figure sur le bulletin.
 * NULL = toujours en lice. Renseigné lors de la création d'un second tour
 * pour écarter les candidats éliminés (et les postes déjà pourvus).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('candidacies', function (Blueprint $table) {
            $table->integer('last_round')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('candidacies', function (Blueprint $table) {
            $table->dropColumn('last_round');
        });
    }
};

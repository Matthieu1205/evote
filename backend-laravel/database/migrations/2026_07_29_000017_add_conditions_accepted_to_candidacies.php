<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Horodatage de l'attestation sur l'honneur : quand le candidat a certifié
 * remplir les conditions de candidature définies par la commission.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('candidacies', function (Blueprint $table) {
            $table->dateTime('conditions_accepted_at')->nullable()->after('review_note');
        });
    }

    public function down(): void
    {
        Schema::table('candidacies', function (Blueprint $table) {
            $table->dropColumn('conditions_accepted_at');
        });
    }
};

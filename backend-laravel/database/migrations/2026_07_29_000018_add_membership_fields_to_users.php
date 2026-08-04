<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Données d'appartenance gérées par l'organisation (repris de la fiche membre
 * lors d'une candidature) : date d'adhésion (→ ancienneté) et statut de
 * cotisation.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->date('membership_date')->nullable()->after('region');
            $table->boolean('dues_up_to_date')->default(false)->after('membership_date');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['membership_date', 'dues_up_to_date']);
        });
    }
};

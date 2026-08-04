<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Horodatage du rappel automatique envoyé avant la clôture, pour éviter
 * d'envoyer plusieurs fois le même rappel.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('elections', function (Blueprint $table) {
            $table->dateTime('reminder_sent_at')->nullable()->after('results_publish_at');
        });
    }

    public function down(): void
    {
        Schema::table('elections', function (Blueprint $table) {
            $table->dropColumn('reminder_sent_at');
        });
    }
};

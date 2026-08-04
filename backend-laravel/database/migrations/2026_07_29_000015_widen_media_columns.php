<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Les logos/photos peuvent être stockés en base64 (data:image/...) — beaucoup
 * plus long que 255 caractères. On élargit ces colonnes en LONGTEXT (parité
 * avec le type `text` illimité de Postgres).
 */
return new class extends Migration
{
    public function up(): void
    {
        // SQLite (tests) : les colonnes TEXT sont déjà illimitées, inutile de
        // les modifier (et ->change() est superflu). MySQL uniquement.
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('organizations', function (Blueprint $table) {
            $table->longText('logo_url')->nullable()->change();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->longText('photo_url')->nullable()->change();
        });

        Schema::table('candidacies', function (Blueprint $table) {
            $table->longText('photo_url')->nullable()->change();
            $table->longText('video_url')->nullable()->change();
            $table->longText('document_url')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->string('logo_url')->nullable()->change();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('photo_url')->nullable()->change();
        });

        Schema::table('candidacies', function (Blueprint $table) {
            $table->string('photo_url')->nullable()->change();
            $table->string('video_url')->nullable()->change();
            $table->string('document_url')->nullable()->change();
        });
    }
};

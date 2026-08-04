<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment('eVote — plateforme de vote électronique.');
})->purpose('Message de démonstration');

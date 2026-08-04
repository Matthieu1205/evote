<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class UploadController extends Controller
{
    /** Types autorisés → extension dérivée du mimetype validé (jamais du nom
     *  de fichier client : évite un XSS stocké via .svg/.html). */
    private const EXT_BY_MIME = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'video/mp4' => 'mp4',
        'video/webm' => 'webm',
        'video/quicktime' => 'mov',
        'application/pdf' => 'pdf',
    ];

    private const MAX_PHOTO = 5 * 1024 * 1024;    // 5 Mo

    private const MAX_DOC = 10 * 1024 * 1024;     // 10 Mo (PDF)

    private const MAX_VIDEO = 80 * 1024 * 1024;   // 80 Mo

    public function store(Request $request): JsonResponse
    {
        $file = $request->file('file');
        abort_if(! $file, 400, 'Aucun fichier reçu.');

        $mime = $file->getMimeType();
        abort_unless(
            isset(self::EXT_BY_MIME[$mime]),
            400,
            'Format non supporté. Utilisez JPG, PNG, WEBP, PDF, MP4 ou WEBM.',
        );

        [$max, $tooBig] = match (true) {
            str_starts_with($mime, 'image/') => [self::MAX_PHOTO, 'Photo trop grande (max 5 Mo).'],
            $mime === 'application/pdf' => [self::MAX_DOC, 'Document trop grand (max 10 Mo).'],
            default => [self::MAX_VIDEO, 'Vidéo trop grande (max 80 Mo).'],
        };
        abort_if($file->getSize() > $max, 400, $tooBig);

        $ext = self::EXT_BY_MIME[$mime];
        $filename = Str::ulid().'.'.$ext;

        // Stockage disque local, servi en statique depuis public/uploads.
        $file->move(public_path('uploads'), $filename);

        $base = rtrim(config('app.url', 'http://localhost:3001'), '/');

        return response()->json(['url' => "{$base}/uploads/{$filename}"]);
    }
}

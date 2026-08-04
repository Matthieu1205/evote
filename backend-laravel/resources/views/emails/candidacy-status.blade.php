<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:40px 0;">
  <div style="max-width:480px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
    <div style="background:#1a3a5c;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">eVote</h1>
    </div>
    <div style="padding:32px;">
      <p>Bonjour <strong>{{ $name }}</strong>,</p>
      <p>Votre candidature au poste de <strong>{{ $positionTitle }}</strong> a été
        {{ $isValid ? 'validée' : 'rejetée' }} par la commission électorale.</p>
      @if(!empty($reviewNote))
      <p><em>Motif : {{ $reviewNote }}</em></p>
      @endif
    </div>
  </div>
</body>
</html>

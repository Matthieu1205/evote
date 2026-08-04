<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:40px 0;">
  <div style="max-width:480px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
    <div style="background:#0d9488;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">eVote — Résultats publiés</h1>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px;">Bonjour <strong>{{ $name }}</strong>,</p>
      <p style="margin:0 0 24px;">Les résultats officiels du scrutin <strong>«&nbsp;{{ $electionTitle }}&nbsp;»</strong> viennent d'être publiés.</p>
      <a href="{{ $resultsUrl }}" style="display:inline-block;background:#0d9488;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;">Consulter les résultats</a>
      <p style="margin:24px 0 0;color:#666;font-size:13px;">Si ce lien ne fonctionne pas, copiez cette URL dans votre navigateur :<br>{{ $resultsUrl }}</p>
    </div>
    <div style="background:#f8f8f8;padding:16px 32px;border-top:1px solid #eee;">
      <p style="margin:0;color:#999;font-size:12px;">Ce message est automatique — merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>

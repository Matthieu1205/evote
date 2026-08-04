<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:40px 0;">
  <div style="max-width:480px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
    <div style="background:#1a3a5c;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">eVote</h1>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px;">Bonjour <strong>{{ $name }}</strong>,</p>
      <p style="margin:0 0 24px;">Voici votre code de {{ $label }} :</p>
      <div style="background:#f0f4ff;border:2px solid #1a3a5c;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px;">
        <span style="font-size:36px;font-weight:bold;letter-spacing:12px;color:#1a3a5c;">{{ $code }}</span>
      </div>
      <p style="margin:0 0 8px;color:#666;font-size:14px;">Ce code est valable <strong>5 minutes</strong> et à usage unique.</p>
      <p style="margin:0;color:#666;font-size:14px;">Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
    </div>
    <div style="background:#f8f8f8;padding:16px 32px;border-top:1px solid #eee;">
      <p style="margin:0;color:#999;font-size:12px;">Ce message est automatique, merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>

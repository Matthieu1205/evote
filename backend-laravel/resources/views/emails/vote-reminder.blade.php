<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:40px 0;">
  <div style="max-width:480px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
    <div style="background:#b45309;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">eVote — Rappel de vote</h1>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px;">Bonjour <strong>{{ $name }}</strong>,</p>
      <p style="margin:0 0 16px;">Vous n'avez pas encore voté pour le scrutin <strong>«&nbsp;{{ $electionTitle }}&nbsp;»</strong>.</p>
      @if(!empty($deadline))
      <p style="margin:0 0 24px;">Le scrutin ferme le <strong>{{ $deadline }}</strong>. Ne manquez pas ce délai !</p>
      @else
      <p style="margin:0 0 24px;">Le scrutin est ouvert : votez dès maintenant.</p>
      @endif
      <a href="{{ $loginUrl }}" style="display:inline-block;background:#b45309;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;">Voter maintenant</a>
      <p style="margin:24px 0 0;color:#666;font-size:13px;">Si ce lien ne fonctionne pas, copiez cette URL dans votre navigateur :<br>{{ $loginUrl }}</p>
    </div>
    <div style="background:#f8f8f8;padding:16px 32px;border-top:1px solid #eee;">
      <p style="margin:0;color:#999;font-size:12px;">Ce message est automatique — merci de ne pas y répondre. Si vous avez déjà voté, ignorez ce rappel.</p>
    </div>
  </div>
</body>
</html>

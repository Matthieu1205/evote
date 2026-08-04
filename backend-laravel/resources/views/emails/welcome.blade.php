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
      <p style="margin:0 0 16px;">Votre compte sur la plateforme de vote électronique a été créé.</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
        <tr>
          <td style="padding:8px 12px;background:#f0f4ff;border:1px solid #dde5f0;font-weight:bold;width:40%;">Numéro de membre</td>
          <td style="padding:8px 12px;border:1px solid #dde5f0;">{{ $ordreNumber }}</td>
        </tr>
        @if(!empty($tempPassword))
        <tr>
          <td style="padding:8px 12px;background:#f0f4ff;border:1px solid #dde5f0;font-weight:bold;">Mot de passe</td>
          <td style="padding:8px 12px;border:1px solid #dde5f0;font-family:monospace;font-size:16px;">{{ $tempPassword }}</td>
        </tr>
        @endif
      </table>
      @if(!empty($tempPassword))
      <p style="margin:0 0 24px;color:#e53e3e;font-size:14px;"><strong>Changez votre mot de passe dès la première connexion.</strong></p>
      @endif
      <a href="{{ $appUrl }}/login" style="display:inline-block;background:#1a3a5c;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Se connecter</a>
    </div>
  </div>
</body>
</html>

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: DejaVu Sans, sans-serif; }
        body { color: #1a202c; font-size: 12px; margin: 0; }
        .header { text-align: center; border-bottom: 3px solid #1a3a5c; padding-bottom: 12px; margin-bottom: 18px; }
        .org { font-size: 15px; font-weight: bold; color: #1a3a5c; }
        .title { font-size: 20px; font-weight: bold; letter-spacing: 1px; margin-top: 8px; }
        .subtitle { color: #4a5568; margin-top: 4px; }
        .meta { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
        .meta td { padding: 5px 8px; border: 1px solid #dde5f0; font-size: 12px; }
        .meta td.k { background: #f0f4ff; font-weight: bold; width: 32%; }
        .section-title { font-size: 14px; font-weight: bold; color: #1a3a5c; border-bottom: 1px solid #cbd5e0; padding-bottom: 4px; margin: 18px 0 8px; }
        table.res { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
        table.res th { background: #1a3a5c; color: #fff; padding: 6px 8px; text-align: left; font-size: 11px; }
        table.res td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
        table.res tr.elected td { background: #eafaf1; font-weight: bold; }
        .badge { font-size: 10px; padding: 1px 6px; border-radius: 8px; }
        .badge-elected { background: #c6f6d5; color: #22633b; }
        .badge-runoff { background: #feebc8; color: #9c4221; }
        .runoff-note { color: #9c4221; font-size: 11px; font-style: italic; margin: 2px 0 14px; }
        .footer { margin-top: 30px; border-top: 1px solid #cbd5e0; padding-top: 10px; color: #4a5568; font-size: 11px; }
        .sign { margin-top: 40px; width: 100%; }
        .sign td { width: 50%; text-align: center; padding-top: 30px; border-top: 1px solid #1a202c; font-size: 11px; }
        .sign-wrap { width: 45%; }
    </style>
</head>
<body>
    @php
        $statusLabels = ['DEPOUILLE' => 'Dépouillé', 'PUBLIE' => 'Publié'];
        $majorityLabels = ['RELATIVE' => 'Majorité relative', 'ABSOLUE' => 'Majorité absolue'];
    @endphp

    <div class="header">
        <div class="org">{{ $election->organization->name }}</div>
        <div class="title">PROCÈS-VERBAL DE SCRUTIN</div>
        <div class="subtitle">{{ $election->title }}</div>
    </div>

    <table class="meta">
        <tr>
            <td class="k">Scrutin</td><td>{{ $election->title }}</td>
        </tr>
        <tr>
            <td class="k">Statut</td>
            <td>{{ $statusLabels[$election->status] ?? $election->status }}</td>
        </tr>
        <tr>
            <td class="k">Mode de scrutin</td>
            <td>{{ $majorityLabels[$election->majority_rule] ?? $election->majority_rule }} — tour {{ $result['round'] }}</td>
        </tr>
        <tr>
            <td class="k">Ouverture</td><td>{{ optional($election->start_at)->format('d/m/Y H:i') }}</td>
        </tr>
        <tr>
            <td class="k">Clôture</td><td>{{ optional($election->end_at)->format('d/m/Y H:i') }}</td>
        </tr>
    </table>

    <div class="section-title">Participation</div>
    <table class="meta">
        <tr>
            <td class="k">Inscrits (éligibles)</td><td>{{ $result['eligibleCount'] }}</td>
        </tr>
        <tr>
            <td class="k">Bulletins exprimés</td><td>{{ $result['ballotsCount'] }}</td>
        </tr>
        <tr>
            <td class="k">Taux de participation</td><td>{{ number_format($result['turnout'], 1, ',', ' ') }} %</td>
        </tr>
    </table>

    <div class="section-title">Résultats par poste</div>

    @foreach ($result['positions'] as $pos)
        <p style="font-weight:bold; margin: 10px 0 4px;">
            {{ $pos['positionTitle'] }}
            <span style="font-weight:normal; color:#718096;">— {{ $pos['seats'] }} siège(s), {{ $pos['totalVotes'] }} suffrage(s) exprimé(s)</span>
        </p>
        <table class="res">
            <thead>
                <tr>
                    <th style="width:8%;">Rang</th>
                    <th>Candidat</th>
                    <th style="width:14%;">Voix</th>
                    <th style="width:14%;">%</th>
                    <th style="width:22%;">Résultat</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($pos['candidates'] as $i => $c)
                    <tr class="{{ $c['elected'] ? 'elected' : '' }}">
                        <td>{{ $i + 1 }}</td>
                        <td>{{ $c['name'] }}</td>
                        <td>{{ $c['votes'] }}</td>
                        <td>{{ number_format($c['percent'], 1, ',', ' ') }} %</td>
                        <td>
                            @if ($c['elected'])
                                <span class="badge badge-elected">ÉLU</span>
                            @elseif ($pos['needsRunoff'])
                                <span class="badge badge-runoff">Second tour</span>
                            @else
                                —
                            @endif
                        </td>
                    </tr>
                @endforeach
                @if (count($pos['candidates']) === 0)
                    <tr><td colspan="5" style="color:#a0aec0; font-style:italic;">Aucune candidature.</td></tr>
                @endif
            </tbody>
        </table>
        @if ($pos['needsRunoff'])
            <p class="runoff-note">Majorité absolue non atteinte — un second tour est requis pour ce poste.</p>
        @endif
    @endforeach

    <table class="sign">
        <tr>
            <td>Le Président de la commission électorale</td>
            <td>Le Secrétaire de séance</td>
        </tr>
    </table>

    <div class="footer">
        Procès-verbal généré le {{ \Illuminate\Support\Carbon::parse($result['computedAt'])->format('d/m/Y à H:i') }}
        par {{ $generatedBy }}.<br>
        Document produit automatiquement par la plateforme eVote — les bulletins sont chiffrés et l'émargement est dissocié du vote.
    </div>
</body>
</html>

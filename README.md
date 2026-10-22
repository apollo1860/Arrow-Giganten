# Arrow-Giganten 🎲🏁

Ein Würfel-Duell auf Papier, als Browserspiel: **Wer kommt zuerst unten an?**

Läuft ohne Installation direkt im Browser (Desktop, iPad, Handy). Es ist reines HTML/CSS/JavaScript.

## Spielregeln

- Spielfeld: 6 × 9 Kreise (optional groß: 8 × 12).
- Jeder Spieler wählt zuerst einen freien Startkreis in der **obersten Reihe**.
- Reihum wird gewürfelt. Die Zahl bestimmt die Richtung des nächsten Schritts:

  | Würfel | 1 | 2 | 3 | 4 | 5 | 6 |
  |---|---|---|---|---|---|---|
  | Richtung | ↓ | ↙ | ↘ | → | ← | Joker (frei wählbar) |

- Jeder Kreis darf nur **einmal** benutzt werden, auch keine Kreise der Gegner.
- Geht der gewürfelte Schritt nicht (Rand oder Kreis belegt), muss man **aussetzen**.
- Wer in keine Richtung mehr ziehen kann, ist **eingesperrt** und scheidet aus.
- Wer zuerst die **unterste Reihe** erreicht, gewinnt. Sind alle eingesperrt, gewinnt, wer am weitesten unten steht.

## Modi

- 2 bis 6 Spieler an einem Gerät (Hot-Seat)
- Jeder Platz kann Mensch oder **Bot** sein, auch Bot gegen Bot zum Zuschauen

Bedienung: Startkreis bzw. Joker-Ziel antippen, mit dem Button, dem Würfel oder der Leertaste würfeln.

## Lokal spielen

`index.html` im Browser öffnen, fertig.

## Über GitHub Pages veröffentlichen

1. Im Repository auf **Settings → Pages** gehen.
2. Unter *Build and deployment* bei **Source** „Deploy from a branch“ wählen.
3. Branch `main` und Ordner `/ (root)` auswählen und speichern.
4. Nach etwa einer Minute ist das Spiel erreichbar unter
   `https://<benutzername>.github.io/arrow-giganten/`.

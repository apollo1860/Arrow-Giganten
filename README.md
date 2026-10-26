# Arrow-Giganten 🎲🏁

Ein Würfel-Duell auf Papier, als Browserspiel: **Wer kommt zuerst unten an?**

Läuft ohne Installation direkt im Browser (Desktop, iPad, Handy). Es ist reines HTML/CSS/JavaScript.

## Spielregeln

- Spielfeld: 6 × 9 Kreise (optional groß: 8 × 12).
- Jeder Spieler wählt zuerst einen Startkreis in der **obersten Reihe**.
- Reihum wird gewürfelt. Die Zahl bestimmt, was passiert:

  | Würfel | 1 | 2 | 3 | 4 | 5 | 6 |
  |---|---|---|---|---|---|---|
  | Aktion | ↓ | ↙ | ↘ | → | ← | 💣 Bombe legen |

- **Bombe:** Bei einer 6 legst du eine Bombe in deiner Farbe auf deinen aktuellen Kreis, statt zu ziehen.
  Tritt ein **anderer** Spieler darauf, explodiert sie: Er fliegt **2 Reihen nach oben** und die Bombe ist weg.
  Auf eigene Bomben zu treten ist harmlos.
- Jeder Kreis darf betreten werden, auch wenn dort schon jemand war oder gerade steht.
- Führt der Wurf über den Spielfeldrand hinaus (oder liegt auf deinem Kreis schon eine Bombe), musst du **aussetzen**.
- Wer zuerst die **unterste Reihe** erreicht, gewinnt.

## Modi

- **Normal** oder **Trinkspiel 🍻**
- 2 bis 6 Spieler an einem Gerät (Hot-Seat)
- Jeder Platz kann Mensch oder **Bot** sein, auch Bot gegen Bot zum Zuschauen

## Trinkspiel 🍻 (ab 18)

Etwa die Hälfte aller Kreise (ohne Start- und Zielreihe) wird zum Aktionsfeld. Wer darauf landet, bekommt eine Karte.

| Feld | Was passiert |
|---|---|
| 🍺 Trinken | Trinken oder Schlucke verteilen, z. B. „Verteile 3 Schlucke“, „Wer vorne liegt, trinkt 2“ |
| 📜 Regel | Eine Regel aus der Liste antippen und aktivieren (z. B. Daumenmeister, Verbotenes Wort) oder eine eigene ausdenken. Bis zu 5 Regeln gelten gleichzeitig, jede kann mit × wieder aufgehoben werden. |
| 🎲 Spielfeld | Greift ins Spiel ein: nochmal würfeln, Bombe legen, Platz tauschen, 1 Reihe vor, „trink oder geh zurück“ |
| 🎉 Gruppe | Aufgaben für alle, z. B. „Prost! Alle trinken 1“, „Alle mit Brille trinken“ |

Vor dem Start wählt man:

- **Nur Vorlagen:** sofort losspielen, Kategorien einzeln an- und abwählbar
- **Eigene Felder:** eigene Einträge (🍺, 🎉 oder 📜) eintippen, die zufällig verteilt werden, optional mit Vorlagen aufgefüllt
- **Intensität:** Mild, Normal oder Hart (bestimmt die Schluckzahlen und schaltet harte Karten wie den Wasserfall frei)

Die Vorlagen stehen in `drinks.js` und lassen sich dort leicht erweitern.

Bedienung: Startkreis antippen, mit dem Button, dem Würfel oder der Leertaste würfeln.

## Lokal spielen

`index.html` im Browser öffnen, fertig.

## Über GitHub Pages veröffentlichen

1. Im Repository auf **Settings → Pages** gehen.
2. Unter *Build and deployment* bei **Source** „Deploy from a branch“ wählen.
3. Branch `main` und Ordner `/ (root)` auswählen und speichern.
4. Nach etwa einer Minute ist das Spiel erreichbar unter
   `https://<benutzername>.github.io/arrow-giganten/`.

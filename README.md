# 📖 Lesecoach – Progressive Web App (PWA)

**Lesecoach** ist eine moderne, progressive Webanwendung zur individuellen Leseförderung, Ausspracheverbesserung und auditiven Unterstützung. Die App lässt sich direkt im Browser nutzen oder als eigenständige App auf **Android** (und iOS/Desktop) installieren.

---

## ✨ Hauptfunktionen

1. **Vorlesemodus (Text-to-Speech / TTS)**:
   - Synchrones Wort-für-Wort- und Satz-Highlighting während des Vorlesens.
   - Wählbare deutsche Stimmen & stufenlose Regelung von Vorlesegeschwindigkeit und Tonhöhe.
   - Durch Klick auf einzelne Wörter können diese gezielt ausgesprochen werden.

2. **Mitsprech- & Lese-Coach (Web Speech Recognition)**:
   - Der Nutzer liest laut vor – die KI-gestützte Spracherkennung analysiert das Gesprochene in Echtzeit.
   - Sofortiges visuelles Feedback:
     - 🟢 **Grün**: Richtig und deutlich gelesen
     - 🟡 **Gelb**: Leicht abweichende Aussprache
     - 🔴 **Rot gestrichelt**: Ausgelassenes Wort
   - Live-Erfassung von Genauigkeit (in %), Lesetempo (WPM) und gelesenen Wörtern.
   - Motivierende Auswertung nach Abschluss der Leseeinheit.

3. **Text-Bibliothek & Eigene Texte**:
   - Vordefinierte Übungstexte nach Schwierigkeitsgraden (Fabeln, Zungenbrecher, Sachwissen, Kindergeschichten, Dialoge).
   - Eigene Texte können jederzeit über den Editor hinzugefügt und lokal gespeichert werden.

4. **Barrierefreiheit & Anpassbarkeit**:
   - Integrierte Schriftart **Lexend** zur Unterstützung bei Legasthenie / Lese-Rechtschreib-Schwäche (LRS).
   - Skalierbare Schriftgröße und Umschaltung zwischen Dark- und Light-Mode.

---

## 📱 Installation auf Android

1. Öffne die Webapp in Google Chrome (oder Samsung Internet / Edge) auf deinem Android-Smartphone.
2. Es erscheint automatisch das Banner **"Lesecoach als App installieren"** – tippe auf **Installieren**.
3. *Alternativ*: Tippe im Chrome-Menü (⋮) auf **"Zum Startbildschirm hinzufügen"** bzw. **"App installieren"**.
4. Die App befindet sich nun auf deinem Startbildschirm und im App Drawer und öffnet sich im echten Vollbildmodus (ohne Browserleiste) – inklusive voller Offline-Fähigkeit!

---

## 🚀 Lokales Starten / Testen

Da es sich um eine moderne ES-Module PWA handelt, kann die App über jeden HTTP-Server gestartet werden:

```bash
# Mit Python (falls vorhanden):
python -m http.server 8080

# Oder mit VS Code / Live Server:
Rechtsklick auf index.html -> "Open with Live Server"

# Oder mit npx http-server / serve:
npx serve .
```

Anschließend im Browser unter `http://localhost:8080` (oder der entsprechenden Port-Adresse) öffnen.

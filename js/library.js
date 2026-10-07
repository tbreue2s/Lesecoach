/**
 * Lesecoach Text-Bibliothek
 * Vordefinierte Übungstexte nach Schwierigkeitsgraden & Kategorien sowie Speicher für eigene Texte.
 */

export const DEFAULT_LIBRARY = [
  {
    id: 'fabel-fuchs-rabe',
    title: 'Der Fuchs und der Rabe',
    category: 'fabeln',
    difficulty: 'Leicht',
    level: 1,
    description: 'Eine klassische Fabel von Äsop über Schmeichelei und Klugheit.',
    text: `Ein Rabe hatte ein schönes Stück Käse gefunden und flog damit auf einen hohen Ast, um es in aller Ruhe zu verzehren.

Da kam ein schlauer Fuchs vorbei. Der köstliche Duft des Käses stieg ihm sofort in die Nase. Er wollte den Käse unbedingt haben.

Der Fuchs trat unter den Baum und rief hinauf: "Guten Tag, wunderschöner Vogel! Wie glänzen deine schwarzen Federn im Sonnenlicht! Wenn deine Stimme so herrlich ist wie dein Gefieder, dann bist du zweifellos der König aller Vögel!"

Der Rabe war von dem großen Lob geschmeichelt. Er wollte zeigen, dass er auch wunderschön singen konnte. Er sperrte den Schnabel weit auf und krächzte laut.

Im selben Moment fiel der Käse hinab. Der Fuchs fing ihn geschickt auf, fraß ihn genüsslich auf und lachte: "Merk dir eines, lieber Rabe: Traue niemals einem Schmeichler!"`
  },
  {
    id: 'zungenbrecher-mix',
    title: 'Die lustigen Zungenbrecher',
    category: 'aussprache',
    difficulty: 'Mittel',
    level: 2,
    description: 'Perfektes Training für eine präzise und deutliche Aussprache.',
    text: `Fischers Fritz fischt frische Fische, frische Fische fischt Fischers Fritz.

Braune Borsten bürsten besser als blaue Borsten bürsten.

Zehn zahme Ziegen zogen zehn Zentner Zucker zum Zürcher Zoo.

Wenn Fliegen hinter Fliegen fliegen, fliegen Fliegen Fliegen nach.

Der Flugplatzspatz nahm auf dem Flugplatz Platz. Auf dem Flugplatz nahm der Flugplatzspatz Platz.`
  },
  {
    id: 'weltraum-entdeckung',
    title: 'Reise zu den Sternen',
    category: 'wissen',
    difficulty: 'Mittel',
    level: 2,
    description: 'Eine spannende kurze Entdeckungsreise durch unser Sonnensystem.',
    text: `Unser Sonnensystem ist ein faszinierender Ort voller Geheimnisse. Im Zentrum steht die Sonne, ein riesiger glühender Gasball, der uns Licht und wohlige Wärme spendet.

Acht Planeten kreisen unermüdlich um die Sonne. Der Merkur ist ihr am nächsten und glühend heiß. Auf dem Mars suchen Forscher nach Spuren von vergangenem Leben und Wasser.

Der mächtige Jupiter ist der größte aller Planeten, während der Saturn für seine majestätischen Ringe aus Eis und Gesteinsbrocken berühmt ist. 

Wenn wir nachts in den klaren Himmel blicken, sehen wir Sterne, die Milliarden von Kilometern entfernt leuchten. Jeder Stern ist eine ferne Sonne mit eigenen möglichen Welten.`
  },
  {
    id: 'kinder-igel-herbst',
    title: 'Igel Piekis Herbstabenteuer',
    category: 'kinder',
    difficulty: 'Leicht',
    level: 1,
    description: 'Eine herzerwärmende Geschichte für Leseanfänger.',
    text: `Es war ein sonniger Herbsttag im Wald. Der kleine Igel Pieki spazierte vergnügt durch das bunte Laub. 

Die Blätter raschelten unter seinen kleinen Pfoten: Raschel, raschel, raschel! 

Pieki suchte nach einem gemütlichen Versteck für den kalten Winter. Unter einer alten Eiche fand er einen großen Haufen aus weichem Moos und goldenen Eichenblättern.

"Hier baue ich mein gemütliches Winterquartier!", freute sich Pieki. Er rollte sich zu einer kleinen Stachelkugel zusammen und schlief friedlich ein.`
  },
  {
    id: 'dialog-baecker',
    title: 'Beim Bäcker um die Ecke',
    category: 'dialoge',
    difficulty: 'Leicht',
    level: 1,
    description: 'Ein lebendiger Alltagsdialog zum Üben von natürlicher Betonung.',
    text: `Bäcker: "Guten Morgen! Was darf es denn heute für dich sein?"

Kunde: "Guten Morgen! Ich hätte gerne drei frische Vollkornbrötchen und ein knuspriges Dinkelbrot."

Bäcker: "Sehr gerne. Soll ich das Brot gleich in Scheiben schneiden?"

Kunde: "Ja, bitte! Und haben Sie noch eins von diesen leckeren Schokocroissants?"

Bäcker: "Da hast du Glück, das ist genau das letzte für heute! Das macht dann zusammen vier Euro und fünfzig Cent."

Kunde: "Hier sind fünf Euro. Der Rest ist für das Sparschwein. Vielen Dank und einen schönen Tag!"`
  }
];

const STORAGE_KEY_CUSTOM = 'lesecoach_custom_library';
const STORAGE_KEY_STATS = 'lesecoach_stats';

export class LibraryManager {
  constructor() {
    this.customTexts = this.loadCustomTexts();
  }

  loadCustomTexts() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_CUSTOM);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('Could not load custom library', e);
      return [];
    }
  }

  saveCustomTexts() {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(this.customTexts));
    } catch (e) {
      console.error('Could not save custom library', e);
    }
  }

  getAllTexts() {
    return [...this.customTexts, ...DEFAULT_LIBRARY];
  }

  getTextById(id) {
    return this.getAllTexts().find(t => t.id === id) || DEFAULT_LIBRARY[0];
  }

  addCustomText(title, text, difficulty = 'Eigener Text', category = 'eigen') {
    const newDoc = {
      id: 'custom-' + Date.now(),
      title: title.trim() || 'Eigener Text',
      text: text.trim(),
      difficulty,
      category,
      level: 1,
      description: `Selbst erstellter Text (${text.trim().split(/\s+/).length} Wörter)`,
      isCustom: true,
      createdAt: new Date().toISOString()
    };
    this.customTexts.unshift(newDoc);
    this.saveCustomTexts();
    return newDoc;
  }

  deleteCustomText(id) {
    this.customTexts = this.customTexts.filter(t => t.id !== id);
    this.saveCustomTexts();
  }
}

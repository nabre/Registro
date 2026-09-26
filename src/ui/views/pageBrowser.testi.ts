// I testi dello sfoglio di un PDF da dividere (`pageBrowser.ts`) e dei bersagli
// su cui se ne lasciano cadere le pagine (`pageDrop.ts`).
// `pagine` arriva da `dicePagine` già tradotto e in minuscolo.

import { catalogo, conMaiuscola } from '../../i18n/index.js'

const it = {
  // Di chi è una pagina già archiviata, quando non è di una persona
  foglioFirme: 'Foglio firme',
  qualcuno: 'qualcuno',

  // Il volo delle pagine
  mancate: (pagine: string) =>
    `${pagine}: lasciate fuori dalla matrice, e quindi non archiviate. ` +
    'Il bersaglio è la casella che incrocia la riga della persona con la colonna del ' +
    'documento — mentre trascini si accendono tutte.',
  ritagliando: (pagine: string, dove: string) => `${pagine} → ${dove}: sto ritagliando…`,

  // La fotografia e l'etichetta di una pagina
  lettoOcr: (nome: string) =>
    `«${nome}» letto dentro questa striscia, dalla lettura automatica delle scansioni`,
  lettoTesto: (nome: string) => `«${nome}» letto qui, nel testo del PDF`,
  pagina: (numero: number) => `Pagina ${numero}`,
  nonDisegnabile: 'non si riesce a disegnarla',
  disegnando: 'la sto disegnando…',
  leggendo: 'la sto leggendo',
  inCoda: 'in coda',
  daLeggere: 'da leggere',
  nessunNome: 'nessun nome',
  giaArchiviata: (numero: number, chi: string) => `Pagina ${numero}: già archiviata per ${chi}`,
  daOcr: 'letto dalla lettura automatica',
  daTesto: 'letto nel testo del PDF',
  dalTaglio: 'dedotto dal taglio',
  ciLegge: (nome: string, come: string) => `il registro ci legge ${nome} — ${come}`,
  senzaTesto: 'scansione senza testo, ancora da leggere',
  nessunNomeClasse: 'nessun nome della classe riconosciuto',
  trascinala: 'Trascinala sulla casella di chi è.',

  // Assegnare chiedendo
  nessunoInClasse: 'In questa classe non c’è nessuno a cui assegnarle.',
  nessunDocumento: 'Non c’è nessun documento aperto in cui archiviarle.',
  aChi: (pagine: string) => `A chi vanno ${pagine}?`,
  persona: 'Persona',
  archivia: 'Archivia',
  servono: 'Servono la persona e il documento.',

  // Buttare via
  buttareTitolo: (pagine: string) => `Buttare via ${pagine}?`,
  buttareTesto: (pagine: string, nome: string) =>
    `${pagine} di «${nome}» escono da quel che resta da ` +
    'smistare, e non si riprendono. Se non resta altro da dividere, il PDF di partenza va ' +
    'nel cestino del sistema.',

  // Il tasto destro
  archiviataPer: (numero: number, chi: string) => `Pagina ${numero} · archiviata per ${chi}`,
  riprendila: 'Riprendila',
  riprendilaTitolo:
    'Il documento esce dal fascicolo e le sue pagine tornano fra quelle da smistare: ' +
    'è il modo di rimediare a una pagina lasciata sulla riga sbagliata.',
  aprilaNelLettore: 'Aprila nel lettore',
  ciLeggeCoda: (nome: string) => ` · il registro ci legge ${nome}`,
  assegnaA: 'Assegna a…',
  assegnaTitolo: 'Archivia queste pagine dicendo a chi vanno e dentro quale documento',
  perArchiviarle: 'Per archiviarle, trascinale sulla casella della persona',
  rileggiScansione: 'Rileggi la scansione',
  rileggiPagine: (quante: number) => `Rileggi le ${quante} pagine`,
  rileggiTitolo: 'Rimette in coda la lettura: qualche decina di secondi per pagina',
  letturaSpenta: 'Lettura scansioni: spenta',
  /** La chiave è quella dell'impostazione, che non si traduce. */
  apreImpostazioni: (chiave: string) => `Apre le impostazioni su «${chiave}»`,
  apriNelLettore: 'Apri nel lettore',
  soloQueste: 'Apre solo queste pagine nel programma del sistema',
  diNessuno: 'Queste pagine non sono di nessuno: fuori da quel che resta da smistare',

  // La testata dello sfoglio
  quantoGrandi: 'Quanto grandi si vedono le pagine',
  misura: 'Misura delle pagine',
  trascinaleScelte:
    'trascinale sulla casella di chi sono: la riga della persona, la colonna del documento.',
  premiPagina:
    'Premi una pagina per sceglierla — Ctrl per aggiungerne, Maiusc per un tratto — ' +
    'poi trascinala sulla casella di chi è.',
  buttaScelte: (pagine: string) =>
    `Butta via ${pagine}: non sono di nessuno — la copertina dello ` +
    'scanner, un foglio bianco in mezzo al mucchio',
  lascia: 'Lascia',
  lasciaTitolo: 'Lascia andare le pagine scelte',
  tutteArchiviate: 'Tutte le pagine di questo PDF sono archiviate.',
  nessunaDaSmistare: 'Non resta nessuna pagina da smistare.',
  nascondiArchiviata: 'Nascondi l’archiviata',
  nascondiArchiviate: (quante: number) => `Nascondi le ${quante} archiviate`,
  archiviate: (quante: number) => `Archiviate (${quante})`,
  tornaSole: 'Torna alle sole pagine che restano da smistare',
  rimetteInFila:
    'Rimette in fila anche le pagine già finite nel fascicolo di qualcuno: da lì si riprendono',
}

export const testi = catalogo(it, {
  de: {
    foglioFirme: 'Unterschriftenblatt',
    qualcuno: 'jemanden',

    mancate: (pagine) =>
      `${conMaiuscola(pagine)}: ausserhalb der Matrix losgelassen und daher nicht archiviert. ` +
      'Das Ziel ist das Feld, wo sich die Zeile der Person und die Spalte des Dokuments ' +
      'kreuzen — beim Ziehen leuchten alle auf.',
    ritagliando: (pagine, dove) => `${conMaiuscola(pagine)} → ${dove}: wird ausgeschnitten…`,

    lettoOcr: (nome) => `«${nome}» in diesem Streifen gelesen, vom automatischen Lesen der Scans`,
    lettoTesto: (nome) => `«${nome}» hier gelesen, im Text des PDF`,
    pagina: (numero) => `Seite ${numero}`,
    nonDisegnabile: 'lässt sich nicht darstellen',
    disegnando: 'wird dargestellt…',
    leggendo: 'wird gelesen',
    inCoda: 'in der Warteschlange',
    daLeggere: 'zu lesen',
    nessunNome: 'kein Name',
    giaArchiviata: (numero, chi) => `Seite ${numero}: bereits archiviert für ${chi}`,
    daOcr: 'vom automatischen Lesen erkannt',
    daTesto: 'im Text des PDF gelesen',
    dalTaglio: 'aus der Aufteilung abgeleitet',
    ciLegge: (nome, come) => `das Klassenbuch liest darauf ${nome} — ${come}`,
    senzaTesto: 'Scan ohne Text, noch zu lesen',
    nessunNomeClasse: 'kein Name aus der Klasse erkannt',
    trascinala: 'Zieh sie auf das Feld der Person, der sie gehört.',

    nessunoInClasse: 'In dieser Klasse gibt es niemanden, dem man sie zuweisen könnte.',
    nessunDocumento: 'Es gibt kein offenes Dokument, in dem man sie archivieren könnte.',
    aChi: (pagine) => `Wohin mit ${pagine}?`,
    persona: 'Person',
    archivia: 'Archivieren',
    servono: 'Person und Dokument sind beide nötig.',

    buttareTitolo: (pagine) => `${conMaiuscola(pagine)} wegwerfen?`,
    buttareTesto: (pagine, nome) =>
      `Das Klassenbuch nimmt ${pagine} von «${nome}» aus dem heraus, was noch zuzuordnen ist, ` +
      'und das lässt sich nicht rückgängig machen. Bleibt nichts mehr aufzuteilen, kommt das ' +
      'ursprüngliche PDF in den Papierkorb des Systems.',

    archiviataPer: (numero, chi) => `Seite ${numero} · archiviert für ${chi}`,
    riprendila: 'Zurückholen',
    riprendilaTitolo:
      'Das Dokument verlässt das Dossier, und seine Seiten kommen zurück zu den noch ' +
      'zuzuordnenden: So korrigiert man eine Seite, die auf der falschen Zeile gelandet ist.',
    aprilaNelLettore: 'Im Betrachter öffnen',
    ciLeggeCoda: (nome) => ` · das Klassenbuch liest darauf ${nome}`,
    assegnaA: 'Zuweisen an…',
    assegnaTitolo: 'Archiviert diese Seiten mit Angabe, wem sie gehören und in welches Dokument',
    perArchiviarle: 'Zum Archivieren auf das Feld der Person ziehen',
    rileggiScansione: 'Scan neu lesen',
    rileggiPagine: (quante) => `Die ${quante} Seiten neu lesen`,
    rileggiTitolo:
      'Stellt das Lesen wieder in die Warteschlange: einige Dutzend Sekunden pro Seite',
    letturaSpenta: 'Lesen der Scans: aus',
    apreImpostazioni: (chiave) => `Öffnet die Einstellungen bei «${chiave}»`,
    apriNelLettore: 'Im Betrachter öffnen',
    soloQueste: 'Öffnet nur diese Seiten im Programm des Systems',
    diNessuno: 'Diese Seiten gehören niemandem: weg aus dem, was noch zuzuordnen ist',

    quantoGrandi: 'Wie gross die Seiten angezeigt werden',
    misura: 'Seitengrösse',
    trascinaleScelte:
      'zieh sie auf das Feld der Person, der sie gehören: die Zeile der Person, die Spalte ' +
      'des Dokuments.',
    premiPagina:
      'Klicke auf eine Seite, um sie auszuwählen — Ctrl für weitere, Umschalt für einen ' +
      'Bereich —, dann zieh sie auf das Feld der Person, der sie gehört.',
    buttaScelte: (pagine) =>
      `${conMaiuscola(pagine)} wegwerfen: Das gehört niemandem — das Deckblatt des Scanners, ` +
      'ein leeres Blatt mitten im Stapel',
    lascia: 'Loslassen',
    lasciaTitolo: 'Die gewählten Seiten loslassen',
    tutteArchiviate: 'Alle Seiten dieses PDF sind archiviert.',
    nessunaDaSmistare: 'Es bleibt keine Seite zuzuordnen.',
    nascondiArchiviata: 'Archivierte ausblenden',
    nascondiArchiviate: (quante) => `Die ${quante} archivierten ausblenden`,
    archiviate: (quante) => `Archiviert (${quante})`,
    tornaSole: 'Zurück zu den Seiten, die noch zuzuordnen sind',
    rimetteInFila:
      'Zeigt auch die Seiten wieder, die schon im Dossier von jemandem gelandet sind: Von dort ' +
      'holt man sie zurück',
  },
  fr: {
    foglioFirme: 'Feuille de signatures',
    qualcuno: 'quelqu’un',

    mancate: (pagine) =>
      `${conMaiuscola(pagine)} : le dépôt a eu lieu hors de la matrice, rien n’a été archivé. ` +
      'La cible est la case au croisement de la ligne de la personne et de la colonne du ' +
      'document — pendant le glisser, elles s’allument toutes.',
    ritagliando: (pagine, dove) => `${conMaiuscola(pagine)} → ${dove} : découpage en cours…`,

    lettoOcr: (nome) => `« ${nome} » lu dans cette bande, par la lecture automatique des scans`,
    lettoTesto: (nome) => `« ${nome} » lu ici, dans le texte du PDF`,
    pagina: (numero) => `Page ${numero}`,
    nonDisegnabile: 'impossible de l’afficher',
    disegnando: 'affichage en cours…',
    leggendo: 'lecture en cours',
    inCoda: 'en attente',
    daLeggere: 'à lire',
    nessunNome: 'aucun nom',
    giaArchiviata: (numero, chi) => `Page ${numero} : déjà archivée pour ${chi}`,
    daOcr: 'lu par la lecture automatique',
    daTesto: 'lu dans le texte du PDF',
    dalTaglio: 'déduit du découpage',
    ciLegge: (nome, come) => `le registre y lit ${nome} — ${come}`,
    senzaTesto: 'scan sans texte, encore à lire',
    nessunNomeClasse: 'aucun nom de la classe reconnu',
    trascinala: 'Glisse-la sur la case de la personne à qui elle appartient.',

    nessunoInClasse: 'Dans cette classe, il n’y a personne à qui les attribuer.',
    nessunDocumento: 'Il n’y a aucun document ouvert où les archiver.',
    aChi: (pagine) => `Attribuer ${pagine} à qui ?`,
    persona: 'Personne',
    archivia: 'Archiver',
    servono: 'Il faut la personne et le document.',

    buttareTitolo: (pagine) => `Jeter ${pagine} ?`,
    buttareTesto: (pagine, nome) =>
      `Le registre retire ${pagine} de « ${nome} » de ce qui reste à trier, et c’est sans ` +
      'retour. S’il ne reste plus rien à répartir, le PDF de départ va à la corbeille du ' +
      'système.',

    archiviataPer: (numero, chi) => `Page ${numero} · archivée pour ${chi}`,
    riprendila: 'La reprendre',
    riprendilaTitolo:
      'Le document sort du dossier et ses pages reviennent parmi celles à trier : c’est la ' +
      'façon de corriger une page laissée sur la mauvaise ligne.',
    aprilaNelLettore: 'L’ouvrir dans la visionneuse',
    ciLeggeCoda: (nome) => ` · le registre y lit ${nome}`,
    assegnaA: 'Attribuer à…',
    assegnaTitolo: 'Archive ces pages en disant à qui elles vont et dans quel document',
    perArchiviarle: 'Pour les archiver, glisse-les sur la case de la personne',
    rileggiScansione: 'Relire le scan',
    rileggiPagine: (quante) => `Relire les ${quante} pages`,
    rileggiTitolo:
      'Remet la lecture en file d’attente : quelques dizaines de secondes par page',
    letturaSpenta: 'Lecture des scans : désactivée',
    apreImpostazioni: (chiave) => `Ouvre les paramètres sur « ${chiave} »`,
    apriNelLettore: 'Ouvrir dans la visionneuse',
    soloQueste: 'Ouvre seulement ces pages dans le programme du système',
    diNessuno: 'Ces pages ne sont à personne : hors de ce qui reste à trier',

    quantoGrandi: 'Taille d’affichage des pages',
    misura: 'Taille des pages',
    trascinaleScelte:
      'glisse-les sur la case de leur propriétaire : la ligne de la personne, la colonne du ' +
      'document.',
    premiPagina:
      'Clique sur une page pour la choisir — Ctrl pour en ajouter, Maj pour une plage — ' +
      'puis glisse-la sur la case de la personne à qui elle appartient.',
    buttaScelte: (pagine) =>
      `Jeter ${pagine} : ce n’est à personne — la page de garde du scanner, une feuille ` +
      'blanche au milieu de la pile',
    lascia: 'Relâcher',
    lasciaTitolo: 'Relâcher les pages choisies',
    tutteArchiviate: 'Toutes les pages de ce PDF sont archivées.',
    nessunaDaSmistare: 'Il ne reste aucune page à trier.',
    nascondiArchiviata: 'Masquer l’archivée',
    nascondiArchiviate: (quante) => `Masquer les ${quante} archivées`,
    archiviate: (quante) => `Archivées (${quante})`,
    tornaSole: 'Revenir aux seules pages qui restent à trier',
    rimetteInFila:
      'Remet dans la file aussi les pages déjà dans le dossier de quelqu’un : c’est de là ' +
      'qu’on les reprend',
  },
  en: {
    foglioFirme: 'Signature sheet',
    qualcuno: 'someone',

    mancate: (pagine) =>
      `${conMaiuscola(pagine)}: dropped outside the grid, so not archived. ` +
      'The target is the box where the person’s row meets the document’s column — they all ' +
      'light up while you drag.',
    ritagliando: (pagine, dove) => `${conMaiuscola(pagine)} → ${dove}: cutting out…`,

    lettoOcr: (nome) => `“${nome}” read within this strip, by the automatic scan reading`,
    lettoTesto: (nome) => `“${nome}” read here, in the PDF’s text`,
    pagina: (numero) => `Page ${numero}`,
    nonDisegnabile: 'can’t be drawn',
    disegnando: 'drawing it…',
    leggendo: 'reading it',
    inCoda: 'queued',
    daLeggere: 'to read',
    nessunNome: 'no name',
    giaArchiviata: (numero, chi) => `Page ${numero}: already archived for ${chi}`,
    daOcr: 'read by automatic reading',
    daTesto: 'read in the PDF’s text',
    dalTaglio: 'inferred from the split',
    ciLegge: (nome, come) => `the register reads ${nome} on it — ${come}`,
    senzaTesto: 'scan with no text, still to be read',
    nessunNomeClasse: 'no name from the class recognised',
    trascinala: 'Drag it onto the box of whoever it belongs to.',

    nessunoInClasse: 'There’s no one in this class to assign them to.',
    nessunDocumento: 'There’s no open document to archive them in.',
    aChi: (pagine) => `Assign ${pagine} to whom?`,
    persona: 'Person',
    archivia: 'Archive',
    servono: 'Both the person and the document are needed.',

    buttareTitolo: (pagine) => `Throw away ${pagine}?`,
    buttareTesto: (pagine, nome) =>
      `${conMaiuscola(pagine)} of “${nome}” will leave what’s still to be sorted, and can’t be ` +
      'recovered. If nothing is left to split, the original PDF goes to the system’s bin.',

    archiviataPer: (numero, chi) => `Page ${numero} · archived for ${chi}`,
    riprendila: 'Take it back',
    riprendilaTitolo:
      'The document leaves the file and its pages go back among those to sort: it’s how you ' +
      'fix a page dropped on the wrong row.',
    aprilaNelLettore: 'Open it in the viewer',
    ciLeggeCoda: (nome) => ` · the register reads ${nome} on it`,
    assegnaA: 'Assign to…',
    assegnaTitolo: 'Archives these pages, saying whose they are and in which document',
    perArchiviarle: 'To archive them, drag them onto the person’s box',
    rileggiScansione: 'Reread the scan',
    rileggiPagine: (quante) => `Reread the ${quante} pages`,
    rileggiTitolo: 'Queues the reading again: a few tens of seconds per page',
    letturaSpenta: 'Scan reading: off',
    apreImpostazioni: (chiave) => `Opens the settings at “${chiave}”`,
    apriNelLettore: 'Open in the viewer',
    soloQueste: 'Opens just these pages in the system’s program',
    diNessuno: 'These pages belong to no one: out of what’s left to sort',

    quantoGrandi: 'How big the pages are shown',
    misura: 'Page size',
    trascinaleScelte:
      'drag them onto the box of whoever they belong to: the person’s row, the document’s column.',
    premiPagina:
      'Click a page to choose it — Ctrl to add more, Shift for a range — then drag it onto ' +
      'the box of whoever it belongs to.',
    buttaScelte: (pagine) =>
      `Throw away ${pagine}: it’s nobody’s — the scanner’s cover sheet, a blank page in the ` +
      'middle of the pile',
    lascia: 'Let go',
    lasciaTitolo: 'Let go of the chosen pages',
    tutteArchiviate: 'All the pages of this PDF are archived.',
    nessunaDaSmistare: 'No pages left to sort.',
    nascondiArchiviata: 'Hide the archived one',
    nascondiArchiviate: (quante) => `Hide the ${quante} archived`,
    archiviate: (quante) => `Archived (${quante})`,
    tornaSole: 'Back to just the pages still to sort',
    rimetteInFila:
      'Brings back into line the pages already in someone’s file too: that’s where you take ' +
      'them back from',
  },
})

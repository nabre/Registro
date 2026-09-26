// I testi dell'archivio documentale (`archive.ts`).

import { catalogo } from '../../i18n/index.js'
import { plurale } from '../../domain/text.js'

/** Le frecce per una specie di voce: il passo dopo, quello prima, e i due capi. */
interface Frecce {
  readonly dopo: (detto: string) => string
  readonly prima: (detto: string) => string
  readonly nessunoDopo: string
  readonly nessunoPrima: string
}

const it = {
  // Di chi è un foglio che non è di nessuno in particolare
  foglioFirme: 'Foglio firme',
  perTutti: 'Lo stesso per tutti',
  raccoltoDaTe: 'Raccolto da te',
  senzaDocumento: 'senza documento',
  pagine: (quante: number) => plurale(quante, 'pagina', 'pagine'),

  // Il cestino
  buttareTitolo: (chi: string) => `Buttare via «${chi}»?`,
  buttareSmistamento: (nome: string) =>
    `«${nome}» va nel cestino con tutto quel che resta da dividere. Le pagine già ` +
    'assegnate restano dove sono: quelle sono archiviate.',
  buttareFoglio: (nome: string) =>
    `${nome} esce dall’archivio e la spunta di questa richiesta torna indietro. ` +
    'Il file va nel cestino del documento: è spesso l’unica copia che esiste.',
  buttaViaTitolo: (chi: string) => `Butta via «${chi}»`,

  // Le frecce, per specie di voce
  scorri: {
    foglio: {
      dopo: (detto: string) => `Il foglio dopo: ${detto}`,
      prima: (detto: string) => `Il foglio prima: ${detto}`,
      nessunoDopo: 'Non c’è nessun foglio dopo di questo',
      nessunoPrima: 'Non c’è nessun foglio prima di questo',
    } as Frecce,
    documento: {
      dopo: (detto: string) => `Il documento dopo: ${detto}`,
      prima: (detto: string) => `Il documento prima: ${detto}`,
      nessunoDopo: 'Non c’è nessun documento dopo di questo',
      nessunoPrima: 'Non c’è nessun documento prima di questo',
    } as Frecce,
  },

  // La cornice
  del: (quando: string) => `del ${quando}`,
  conto: (quale: number, quanti: number) => `${quale} di ${quanti}`,
  leggi: 'Leggi',
  pagineTasto: 'Pagine',
  apreLettore: 'Apre il PDF nel lettore: pagine intere, zoom, ricerca nel testo',
  mostraPagine: 'Mostra le pagine una per una, da trascinare sulla casella di chi sono',
  apriSistema: 'Apre questo foglio nel programma del sistema',
  tornaMatrice: 'Torna alla matrice a schermo intero',
  fileSparito: 'Il file non è più qui',
  nonSiGuarda: 'Questo non si guarda da qui',
  nonPdf: (nome: string) =>
    `«${nome}» non è un PDF né un’immagine: si apre con il programma del sistema.`,
  apriFuori: 'Apri fuori',
  daDividere: 'da dividere',
  manca: (nome: string) =>
    `Il registro lo dà per arrivato, ma «${nome}» non è più dentro il documento ` +
    'dell’anno. Rifai la scansione, o togli la spunta.',
}

export const testi = catalogo(it, {
  de: {
    foglioFirme: 'Unterschriftenblatt',
    perTutti: 'Für alle gleich',
    raccoltoDaTe: 'Von dir gesammelt',
    senzaDocumento: 'ohne Dokument',
    pagine: (quante) => plurale(quante, 'Seite', 'Seiten'),

    buttareTitolo: (chi) => `«${chi}» wegwerfen?`,
    buttareSmistamento: (nome) =>
      `«${nome}» kommt in den Papierkorb, mit allem, was noch aufzuteilen ist. Bereits ` +
      'zugewiesene Seiten bleiben, wo sie sind: Die sind archiviert.',
    buttareFoglio: (nome) =>
      `${nome} verlässt das Archiv, und das Häkchen dieser Anfrage wird zurückgenommen. ` +
      'Die Datei kommt in den Papierkorb des Dokuments: Oft ist sie die einzige Kopie, die ' +
      'es gibt.',
    buttaViaTitolo: (chi) => `«${chi}» wegwerfen`,

    scorri: {
      foglio: {
        dopo: (detto) => `Nächstes Blatt: ${detto}`,
        prima: (detto) => `Vorheriges Blatt: ${detto}`,
        nessunoDopo: 'Nach diesem kommt kein Blatt mehr',
        nessunoPrima: 'Vor diesem gibt es kein Blatt',
      },
      documento: {
        dopo: (detto) => `Nächstes Dokument: ${detto}`,
        prima: (detto) => `Vorheriges Dokument: ${detto}`,
        nessunoDopo: 'Nach diesem kommt kein Dokument mehr',
        nessunoPrima: 'Vor diesem gibt es kein Dokument',
      },
    },

    del: (quando) => `vom ${quando}`,
    conto: (quale, quanti) => `${quale} von ${quanti}`,
    leggi: 'Lesen',
    pagineTasto: 'Seiten',
    apreLettore: 'Öffnet das PDF im Betrachter: ganze Seiten, Zoom, Textsuche',
    mostraPagine: 'Zeigt die Seiten einzeln, zum Ziehen auf das Feld der Person, der sie gehören',
    apriSistema: 'Öffnet dieses Blatt im Programm des Systems',
    tornaMatrice: 'Zurück zur Matrix im Vollbild',
    fileSparito: 'Die Datei ist nicht mehr da',
    nonSiGuarda: 'Das lässt sich hier nicht ansehen',
    nonPdf: (nome) =>
      `«${nome}» ist weder ein PDF noch ein Bild: Es öffnet sich mit dem Programm des Systems.`,
    apriFuori: 'Extern öffnen',
    daDividere: 'aufzuteilen',
    manca: (nome) =>
      `Das Klassenbuch betrachtet es als eingegangen, aber «${nome}» ist nicht mehr im Dokument ` +
      'des Schuljahrs. Scanne es neu, oder entferne das Häkchen.',
  },
  fr: {
    foglioFirme: 'Feuille de signatures',
    perTutti: 'Le même pour tous',
    raccoltoDaTe: 'Recueilli par toi',
    senzaDocumento: 'sans document',
    pagine: (quante) => plurale(quante, 'page', 'pages'),

    buttareTitolo: (chi) => `Jeter « ${chi} » ?`,
    buttareSmistamento: (nome) =>
      `« ${nome} » va à la corbeille avec tout ce qui reste à répartir. Les pages déjà ` +
      'attribuées restent où elles sont : elles sont archivées.',
    buttareFoglio: (nome) =>
      `${nome} sort de l’archive et la coche de cette demande est retirée. ` +
      'Le fichier va à la corbeille du document : c’est souvent la seule copie qui existe.',
    buttaViaTitolo: (chi) => `Jeter « ${chi} »`,

    scorri: {
      foglio: {
        dopo: (detto) => `Feuille suivante : ${detto}`,
        prima: (detto) => `Feuille précédente : ${detto}`,
        nessunoDopo: 'Aucune feuille après celle-ci',
        nessunoPrima: 'Aucune feuille avant celle-ci',
      },
      documento: {
        dopo: (detto) => `Document suivant : ${detto}`,
        prima: (detto) => `Document précédent : ${detto}`,
        nessunoDopo: 'Aucun document après celui-ci',
        nessunoPrima: 'Aucun document avant celui-ci',
      },
    },

    del: (quando) => `du ${quando}`,
    conto: (quale, quanti) => `${quale} sur ${quanti}`,
    leggi: 'Lire',
    pagineTasto: 'Pages',
    apreLettore: 'Ouvre le PDF dans la visionneuse : pages entières, zoom, recherche dans le texte',
    mostraPagine: 'Montre les pages une par une, à glisser sur la case de la personne concernée',
    apriSistema: 'Ouvre cette feuille dans le programme du système',
    tornaMatrice: 'Revenir à la matrice en plein écran',
    fileSparito: 'Le fichier n’est plus là',
    nonSiGuarda: 'Ceci ne se regarde pas ici',
    nonPdf: (nome) =>
      `« ${nome} » n’est ni un PDF ni une image : il s’ouvre avec le programme du système.`,
    apriFuori: 'Ouvrir à l’extérieur',
    daDividere: 'à répartir',
    manca: (nome) =>
      `Le registre le considère comme arrivé, mais « ${nome} » n’est plus dans le document ` +
      'de l’année. Refais le scan, ou retire la coche.',
  },
  en: {
    foglioFirme: 'Signature sheet',
    perTutti: 'The same for everyone',
    raccoltoDaTe: 'Collected by you',
    senzaDocumento: 'no document',
    pagine: (quante) => plurale(quante, 'page', 'pages'),

    buttareTitolo: (chi) => `Throw away “${chi}”?`,
    buttareSmistamento: (nome) =>
      `“${nome}” goes in the bin with everything still to be split. Pages already ` +
      'assigned stay where they are: those are archived.',
    buttareFoglio: (nome) =>
      `${nome} leaves the archive and this request’s tick is taken back. ` +
      'The file goes in the document’s bin: it’s often the only copy there is.',
    buttaViaTitolo: (chi) => `Throw away “${chi}”`,

    scorri: {
      foglio: {
        dopo: (detto) => `Next sheet: ${detto}`,
        prima: (detto) => `Previous sheet: ${detto}`,
        nessunoDopo: 'No sheet after this one',
        nessunoPrima: 'No sheet before this one',
      },
      documento: {
        dopo: (detto) => `Next document: ${detto}`,
        prima: (detto) => `Previous document: ${detto}`,
        nessunoDopo: 'No document after this one',
        nessunoPrima: 'No document before this one',
      },
    },

    del: (quando) => `from ${quando}`,
    conto: (quale, quanti) => `${quale} of ${quanti}`,
    leggi: 'Read',
    pagineTasto: 'Pages',
    apreLettore: 'Opens the PDF in the viewer: full pages, zoom, text search',
    mostraPagine: 'Shows the pages one by one, to drag onto the box of whoever they belong to',
    apriSistema: 'Opens this sheet in the system’s program',
    tornaMatrice: 'Back to the full-screen grid',
    fileSparito: 'The file is no longer here',
    nonSiGuarda: 'This can’t be viewed here',
    nonPdf: (nome) =>
      `“${nome}” is neither a PDF nor an image: it opens with the system’s program.`,
    apriFuori: 'Open outside',
    daDividere: 'to split',
    manca: (nome) =>
      `The register counts it as received, but “${nome}” is no longer inside the year’s ` +
      'document. Scan it again, or remove the tick.',
  },
})

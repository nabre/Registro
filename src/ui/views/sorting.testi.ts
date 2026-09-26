// I testi dello smistamento dei PDF di classe (`sorting.ts`) e della pagina
// «Da smistare» (`toSort.ts`).
// «Carica dei PDF» e «Archivio documentale» sono nomi di comandi e pagine: in
// ogni lingua uguali a come li scrivono i loro cataloghi.

import { catalogo } from '../../i18n/index.js'
import { plurale } from '../../domain/text.js'

const it = {
  pagine: (quante: number) => `${quante} pagine`,
  spostaIn: 'Sposta in…',

  // I PDF in attesa, in testa alla matrice
  daDividere: 'Da dividere',
  daDividereN: (quanti: number) => `Da dividere (${quanti})`,
  guarda: (nome: string) => `Guarda «${nome}» a pagine e trascinale sulla casella di chi sono`,
  trascinaQui: 'trascina qui i PDF di classe, o usa «Carica dei PDF»',
  spostaTitolo:
    'Manda a un’altra classe le pagine che restano di questo PDF. Quelle già archiviate ' +
    'restano dove sono, e il registro rifà le proposte con i nomi della classe nuova.',

  // I gesti sul PDF intero
  conferma: (proposte: number) => `Conferma ${proposte} proposte`,
  confermaTitolo: 'Archivia in un gesto le pagine di cui il registro ha già letto il nome',
  letturaSpenta: 'Lettura spenta',
  /** La chiave è quella dell'impostazione, che non si traduce. */
  letturaSpentaTitolo: (chiave: string) =>
    `La lettura automatica delle scansioni è spenta: apre le impostazioni su «${chiave}».`,
  inLettura: 'In lettura…',
  inLetturaTitolo: 'Le pagine di questo PDF sono in coda: la barra qui accanto dice a che punto è',
  leggi: (quante: number) => `Leggi le scansioni (${quante})`,
  leggiTitolo:
    'Mette in coda le pagine senza testo: qualche decina di secondi per pagina, e i ' +
    'nomi letti diventano proposte.',
  rileggi: 'Rileggi',
  rileggiN: (quante: number) => `Rileggi le ${quante} pagine`,
  rileggiTitolo: (quante: number) =>
    `Rilegge con l’OCR le ${quante} pagine ancora da smistare di questo PDF, ` +
    'anche quelle che un testo ce l’hanno già: serve quando quel testo non dice niente ' +
    'di utile, o quando il modello è cambiato. Le pagine già archiviate restano dove sono.',

  // Rileggere tutto
  nienteDaRileggere: 'In questa classe non c’è nessun PDF da dividere: niente da rileggere.',
  rileggereTitolo: (pagine: number) =>
    pagine === 1 ? 'Rileggere quella pagina?' : `Rileggere ${pagine} pagine?`,
  rileggereTesto: (pdf: number, classe: string) =>
    `${pdf === 1 ? 'Il PDF' : `I ${pdf} PDF`} ancora da dividere di ` +
    `${classe} ${pdf === 1 ? 'torna' : 'tornano'} in coda di lettura, dalla prima ` +
    'pagina all’ultima — anche quelle che un testo ce l’hanno già. Sono decine di secondi per ' +
    'pagina, e la coda si può fermare. Le pagine già archiviate restano dove sono, e le ' +
    'proposte di adesso vengono rifatte.',
  inCodaFatto: (pagine: number) =>
    `${pagine} pagine in coda: i nomi letti diventano proposte, una pagina alla volta.`,

  // La coda di lettura
  stoLeggendo: (che: string) => `Sto leggendo ${che}`,
  inAvvio: 'Lettura in avvio…',
  fatteDi: (fatte: number, tutte: number) => `${fatte} di ${tutte}`,
  inCoda: (quante: number) => `${quante} in coda`,
  ferma: 'Ferma',
  fermaTitolo: 'Svuota la coda: la pagina in corso finisce, il resto non parte',
  altre: (quante: number) => `…e altre ${quante}`,

  // I file che entrano
  nessunFile: 'Da lì non è arrivato nessun file: trascinane uno dal gestore file.',
  nonPdf: (nome: string) => `«${nome}» non è un PDF: lo smistamento lavora solo su quelli.`,
  leggendoFile: (nome: string) => `«${nome}»: lo sto leggendo…`,

  // La pagina «Da smistare»
  titolo: 'Da smistare',
  dal: (giorno: string) => `dal ${giorno}`,
  nonSiApre: 'non si apre',
  daCollocare: (pagine: number) => ` · ${pagine} pagine da collocare`,
  smista: 'Smista',
  apriNellArchivio: (nome: string, classe: string) => `Apri «${nome}» nell’archivio di ${classe}`,
  nonAttribuiti: 'Non attribuiti a una classe',
  senzaDire: 'Sono entrati senza dire di chi fossero — di solito dalla cartella osservata.',
  finche:
    'Finché non hanno una classe non compaiono in nessun fascicolo: dichiarala qui, ' +
    'e il registro li rilegge cercando i nomi.',
  diQualeClasse: 'Di quale classe è?',
  nessunPdf: 'Nessun PDF in attesa.',
  inMucchi: (pagine: number, mucchi: number) =>
    `${pagine} pagine in ${mucchi === 1 ? 'un mucchio' : `${mucchi} mucchi`}.`,
  niente: 'Niente da smistare',
  nienteTesto:
    'Qui compaiono i PDF caricati che aspettano di essere divisi, di tutte le classi ' +
    'di cui sei docente — compresi quelli arrivati senza una classe, che altrove non ' +
    'si vedono. Si caricano dall’Archivio documentale, o trascinandoli nella pagina.',
  vaiArchivio: 'Vai all’archivio documentale',
}

export const testi = catalogo(it, {
  de: {
    pagine: (quante) => plurale(quante, 'Seite', 'Seiten'),
    spostaIn: 'Verschieben nach…',

    daDividere: 'Aufzuteilen',
    daDividereN: (quanti) => `Aufzuteilen (${quanti})`,
    guarda: (nome) =>
      `«${nome}» seitenweise ansehen und die Seiten auf das Feld der Person ziehen, ` +
      'der sie gehören',
    trascinaQui: 'zieh die PDFs der Klasse hierher, oder nutze «PDFs laden»',
    spostaTitolo:
      'Schickt die verbleibenden Seiten dieses PDF an eine andere Klasse. Bereits archivierte ' +
      'bleiben, wo sie sind, und das Klassenbuch macht die Vorschläge mit den Namen der neuen ' +
      'Klasse neu.',

    conferma: (proposte) => `${proposte} Vorschläge bestätigen`,
    confermaTitolo:
      'Archiviert in einem Schritt die Seiten, deren Namen das Klassenbuch schon gelesen hat',
    letturaSpenta: 'Lesen aus',
    letturaSpentaTitolo: (chiave) =>
      `Das automatische Lesen der Scans ist aus: öffnet die Einstellungen bei «${chiave}».`,
    inLettura: 'Wird gelesen…',
    inLetturaTitolo:
      'Die Seiten dieses PDF sind in der Warteschlange: Der Balken daneben zeigt den Stand',
    leggi: (quante) => `Scans lesen (${quante})`,
    leggiTitolo:
      'Stellt die Seiten ohne Text in die Warteschlange: einige Dutzend Sekunden pro Seite, und ' +
      'die gelesenen Namen werden zu Vorschlägen.',
    rileggi: 'Neu lesen',
    rileggiN: (quante) => `Die ${quante} Seiten neu lesen`,
    rileggiTitolo: (quante) =>
      `Liest die ${quante} noch zuzuordnenden Seiten dieses PDF mit OCR neu, auch die, die schon ` +
      'einen Text haben: nützlich, wenn dieser Text nichts Brauchbares sagt oder wenn sich das ' +
      'Modell geändert hat. Bereits archivierte Seiten bleiben, wo sie sind.',

    nienteDaRileggere: 'In dieser Klasse gibt es kein PDF aufzuteilen: nichts neu zu lesen.',
    rileggereTitolo: (pagine) =>
      pagine === 1 ? 'Diese Seite neu lesen?' : `${pagine} Seiten neu lesen?`,
    rileggereTesto: (pdf, classe) =>
      `${pdf === 1 ? 'Das noch aufzuteilende PDF' : `Die ${pdf} noch aufzuteilenden PDFs`} von ` +
      `${classe} ${pdf === 1 ? 'kommt' : 'kommen'} wieder in die Warteschlange, von der ersten ` +
      'bis zur letzten Seite — auch die, die schon einen Text haben. Das sind Dutzende Sekunden ' +
      'pro Seite, und die Warteschlange lässt sich anhalten. Bereits archivierte Seiten bleiben, ' +
      'wo sie sind, und die jetzigen Vorschläge werden neu gemacht.',
    inCodaFatto: (pagine) =>
      `${plurale(pagine, 'Seite', 'Seiten')} in der Warteschlange: Die gelesenen Namen werden ` +
      'zu Vorschlägen, Seite um Seite.',

    stoLeggendo: (che) => `Wird gelesen: ${che}`,
    inAvvio: 'Lesen startet…',
    fatteDi: (fatte, tutte) => `${fatte} von ${tutte}`,
    inCoda: (quante) => `${quante} in der Warteschlange`,
    ferma: 'Anhalten',
    fermaTitolo: 'Leert die Warteschlange: Die laufende Seite wird fertig, der Rest startet nicht',
    altre: (quante) => `…und ${quante} weitere`,

    nessunFile: 'Von dort ist keine Datei angekommen: Zieh eine aus dem Datei-Explorer.',
    nonPdf: (nome) => `«${nome}» ist kein PDF: Die Zuordnung arbeitet nur mit PDFs.`,
    leggendoFile: (nome) => `«${nome}»: wird gelesen…`,

    titolo: 'Zuzuordnen',
    dal: (giorno) => `seit ${giorno}`,
    nonSiApre: 'lässt sich nicht öffnen',
    daCollocare: (pagine) => ` · ${plurale(pagine, 'Seite', 'Seiten')} zuzuordnen`,
    smista: 'Zuordnen',
    apriNellArchivio: (nome, classe) => `«${nome}» im Archiv von ${classe} öffnen`,
    nonAttribuiti: 'Keiner Klasse zugeordnet',
    senzaDire:
      'Sie kamen herein, ohne zu sagen, wem sie gehören — meist aus dem überwachten Ordner.',
    finche:
      'Solange sie keine Klasse haben, erscheinen sie in keinem Klassendossier: Gib sie hier an, und ' +
      'das Klassenbuch liest sie neu und sucht die Namen.',
    diQualeClasse: 'Zu welcher Klasse gehört es?',
    nessunPdf: 'Kein PDF wartet.',
    inMucchi: (pagine, mucchi) =>
      `${plurale(pagine, 'Seite', 'Seiten')} in ` +
      `${mucchi === 1 ? 'einem Stapel' : `${mucchi} Stapeln`}.`,
    niente: 'Nichts zuzuordnen',
    nienteTesto:
      'Hier erscheinen die geladenen PDFs, die darauf warten, aufgeteilt zu werden, aus allen ' +
      'Klassen, die du unterrichtest — auch die ohne Klasse angekommenen, die sonst nirgends zu ' +
      'sehen sind. Man lädt sie im Dokumentenarchiv oder zieht sie auf die Seite.',
    vaiArchivio: 'Zum Dokumentenarchiv',
  },
  fr: {
    pagine: (quante) => plurale(quante, 'page', 'pages'),
    spostaIn: 'Déplacer vers…',

    daDividere: 'À répartir',
    daDividereN: (quanti) => `À répartir (${quanti})`,
    guarda: (nome) =>
      `Regarder « ${nome} » page par page et glisser les pages sur la case de leur propriétaire`,
    trascinaQui: 'glisse ici les PDF de la classe, ou utilise « Charger des PDF »',
    spostaTitolo:
      'Envoie à une autre classe les pages qui restent de ce PDF. Celles déjà archivées ' +
      'restent où elles sont, et le registre refait les propositions avec les noms de la ' +
      'nouvelle classe.',

    conferma: (proposte) => `Confirmer ${proposte} propositions`,
    confermaTitolo: 'Archive d’un geste les pages dont le registre a déjà lu le nom',
    letturaSpenta: 'Lecture désactivée',
    letturaSpentaTitolo: (chiave) =>
      `La lecture automatique des scans est désactivée : ouvre les paramètres sur « ${chiave} ».`,
    inLettura: 'Lecture en cours…',
    inLetturaTitolo:
      'Les pages de ce PDF sont en file d’attente : la barre à côté dit où on en est',
    leggi: (quante) => `Lire les scans (${quante})`,
    leggiTitolo:
      'Met en file d’attente les pages sans texte : quelques dizaines de secondes par page, et ' +
      'les noms lus deviennent des propositions.',
    rileggi: 'Relire',
    rileggiN: (quante) => `Relire les ${quante} pages`,
    rileggiTitolo: (quante) =>
      `Relit avec l’OCR les ${quante} pages encore à trier de ce PDF, même celles qui ont déjà ` +
      'un texte : utile quand ce texte ne dit rien d’utile, ou quand le modèle a changé. Les ' +
      'pages déjà archivées restent où elles sont.',

    nienteDaRileggere: 'Dans cette classe, il n’y a aucun PDF à répartir : rien à relire.',
    rileggereTitolo: (pagine) =>
      (pagine === 1 ? 'Relire cette page ?' : `Relire ${pagine} pages ?`),
    rileggereTesto: (pdf, classe) =>
      `${pdf === 1 ? 'Le PDF encore à répartir' : `Les ${pdf} PDF encore à répartir`} de ` +
      `${classe} ${pdf === 1 ? 'retourne' : 'retournent'} dans la file de lecture, de la ` +
      'première page à la dernière — même celles qui ont déjà un texte. Cela fait des dizaines ' +
      'de secondes par page, et la file peut être arrêtée. Les pages déjà archivées restent où ' +
      'elles sont, et les propositions actuelles sont refaites.',
    inCodaFatto: (pagine) =>
      `${plurale(pagine, 'page', 'pages')} en file d’attente : les noms lus deviennent des ` +
      'propositions, une page à la fois.',

    stoLeggendo: (che) => `Lecture : ${che}`,
    inAvvio: 'Démarrage de la lecture…',
    fatteDi: (fatte, tutte) => `${fatte} sur ${tutte}`,
    inCoda: (quante) => `${quante} en attente`,
    ferma: 'Arrêter',
    fermaTitolo: 'Vide la file : la page en cours se termine, le reste ne part pas',
    altre: (quante) => `…et ${quante} autres`,

    nessunFile:
      'Aucun fichier n’est arrivé de là : glisses-en un depuis l’explorateur de fichiers.',
    nonPdf: (nome) => `« ${nome} » n’est pas un PDF : le tri ne fonctionne qu’avec ceux-là.`,
    leggendoFile: (nome) => `« ${nome} » : lecture en cours…`,

    titolo: 'À trier',
    dal: (giorno) => `depuis le ${giorno}`,
    nonSiApre: 'ne s’ouvre pas',
    daCollocare: (pagine) => ` · ${plurale(pagine, 'page', 'pages')} à placer`,
    smista: 'Trier',
    apriNellArchivio: (nome, classe) => `Ouvrir « ${nome} » dans l’archive de ${classe}`,
    nonAttribuiti: 'Attribués à aucune classe',
    senzaDire:
      'Ils sont entrés sans dire à qui ils étaient — d’habitude depuis le dossier surveillé.',
    finche:
      'Tant qu’ils n’ont pas de classe, ils n’apparaissent dans aucun dossier de classe : indique-la ici, ' +
      'et le registre les relit en cherchant les noms.',
    diQualeClasse: 'De quelle classe est-il ?',
    nessunPdf: 'Aucun PDF en attente.',
    inMucchi: (pagine, mucchi) =>
      `${plurale(pagine, 'page', 'pages')} en ${mucchi === 1 ? 'un tas' : `${mucchi} tas`}.`,
    niente: 'Rien à trier',
    nienteTesto:
      'Ici apparaissent les PDF chargés qui attendent d’être répartis, de toutes les classes où ' +
      'tu enseignes — y compris ceux arrivés sans classe, qu’on ne voit nulle part ailleurs. On ' +
      'les charge depuis l’Archive des documents, ou en les glissant dans la page.',
    vaiArchivio: 'Aller à l’archive des documents',
  },
  en: {
    pagine: (quante) => plurale(quante, 'page', 'pages'),
    spostaIn: 'Move to…',

    daDividere: 'To split',
    daDividereN: (quanti) => `To split (${quanti})`,
    guarda: (nome) =>
      `View “${nome}” page by page and drag the pages onto the box of whoever they belong to`,
    trascinaQui: 'drag the class PDFs here, or use “Load PDFs”',
    spostaTitolo:
      'Sends the remaining pages of this PDF to another class. Those already archived stay ' +
      'where they are, and the register redoes the suggestions with the new class’s names.',

    conferma: (proposte) => `Confirm ${proposte} suggestions`,
    confermaTitolo: 'Archives in one go the pages whose name the register has already read',
    letturaSpenta: 'Reading off',
    letturaSpentaTitolo: (chiave) =>
      `Automatic scan reading is off: opens the settings at “${chiave}”.`,
    inLettura: 'Reading…',
    inLetturaTitolo: 'This PDF’s pages are queued: the bar alongside shows how far along it is',
    leggi: (quante) => `Read the scans (${quante})`,
    leggiTitolo:
      'Queues the pages with no text: a few tens of seconds per page, and the names read ' +
      'become suggestions.',
    rileggi: 'Reread',
    rileggiN: (quante) => `Reread the ${quante} pages`,
    rileggiTitolo: (quante) =>
      `Rereads with OCR the ${quante} pages of this PDF still to sort, even those that already ` +
      'have text: useful when that text says nothing useful, or when the model has changed. ' +
      'Pages already archived stay where they are.',

    nienteDaRileggere: 'There’s no PDF to split in this class: nothing to reread.',
    rileggereTitolo: (pagine) => (pagine === 1 ? 'Reread that page?' : `Reread ${pagine} pages?`),
    rileggereTesto: (pdf, classe) =>
      `${pdf === 1 ? 'The PDF' : `The ${pdf} PDFs`} still to split for ${classe} ` +
      `${pdf === 1 ? 'goes' : 'go'} back into the reading queue, from the first page to the ` +
      'last — even those that already have text. That’s tens of seconds per page, and the ' +
      'queue can be stopped. Pages already archived stay where they are, and the current ' +
      'suggestions are redone.',
    inCodaFatto: (pagine) =>
      `${plurale(pagine, 'page', 'pages')} queued: the names read become suggestions, one page ` +
      'at a time.',

    stoLeggendo: (che) => `Reading ${che}`,
    inAvvio: 'Reading starting…',
    fatteDi: (fatte, tutte) => `${fatte} of ${tutte}`,
    inCoda: (quante) => `${quante} queued`,
    ferma: 'Stop',
    fermaTitolo: 'Empties the queue: the current page finishes, the rest doesn’t start',
    altre: (quante) => `…and ${quante} more`,

    nessunFile: 'No file came from there: drag one in from the file manager.',
    nonPdf: (nome) => `“${nome}” isn’t a PDF: sorting only works on those.`,
    leggendoFile: (nome) => `“${nome}”: reading it…`,

    titolo: 'To sort',
    dal: (giorno) => `since ${giorno}`,
    nonSiApre: 'won’t open',
    daCollocare: (pagine) => ` · ${plurale(pagine, 'page', 'pages')} to place`,
    smista: 'Sort',
    apriNellArchivio: (nome, classe) => `Open “${nome}” in the ${classe} archive`,
    nonAttribuiti: 'Not assigned to a class',
    senzaDire: 'They came in without saying whose they were — usually from the watched folder.',
    finche:
      'Until they have a class they don’t appear in any class file: set it here, and the register ' +
      'rereads them looking for the names.',
    diQualeClasse: 'Which class is it for?',
    nessunPdf: 'No PDFs waiting.',
    inMucchi: (pagine, mucchi) =>
      `${plurale(pagine, 'page', 'pages')} in ${mucchi === 1 ? 'one pile' : `${mucchi} piles`}.`,
    niente: 'Nothing to sort',
    nienteTesto:
      'Loaded PDFs waiting to be split appear here, from every class you teach — including ' +
      'those that arrived without a class, which you can’t see anywhere else. You load them ' +
      'from the Document archive, or by dragging them onto the page.',
    vaiArchivio: 'Go to the document archive',
  },
})

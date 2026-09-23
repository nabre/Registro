// Dove finisce un documento e con che nome, senza toccare il disco.
//
// Stava tutto in `data/filing.ts`, che sa di `apparato` e di file: comodo
// finché i percorsi li componeva solo chi scriveva. Poi la pagina Documenti ha
// avuto bisogno di sapere se un documento c'è già — e il webview vive in una
// sandbox, non può importare niente che sappia di disco. Le regole sono
// stringhe: classe, ambito, documento, di chi, che dettaglio. Qui, nel dominio,
// le leggono tutti e due, e restano una sola.
//
//   esportazioni/
//     Calcolo professionale/
//       DIC4a/
//         classe/
//           DIC4a_Presenze_1° semestre.pdf
//         allievi/
//           Rossi Mario/
//             DIC4a_Scheda_Rossi Mario_1° semestre.pdf

import { confrontaLezioni, inizioLezione, nomeCompleto } from './calculations.js'
import { classeDelCorsoId, corsiDellaClasse, materiaDelCorso } from './courses.js'
import { dataNelNome, giornoDi, oggi, oraNelNome } from './dates.js'
import { DOCUMENTO_SCHEDE, DOCUMENTO_SCHEDE_PRIMA } from './lexicon.js'
import type { Corso, Iso, PianoLezione, Registro } from './models.js'
import { nomeSicuro } from './text.js'

/**
 * Le due radici della documentazione: quel che si carica e quel che si stampa.
 *
 * `archivio/` è l'unica copia che esiste — una scansione firmata, una verifica
 * — e cancellarlo vuol dire perderlo. `esportazioni/` è una fotografia di
 * com'era il registro un momento fa: si rifà premendo un pulsante, si può
 * cancellare per intero senza perdere niente, e si esclude dalla
 * sincronizzazione con una riga.
 */
export const ARCHIVIO = 'archivio'
export const ESPORTAZIONI = 'esportazioni'

/**
 * Dove sta un PDF di classe finché non è stato diviso.
 *
 * Non è una terza radice della documentazione: è una sala d'attesa. Il file ci
 * entra com'è arrivato, ci resta finché le sue pagine non sono finite nei
 * fascicoli di qualcuno, e poi se ne va nel cestino. Sta scritto qui perché lo
 * nominano in tre: chi ci scrive, chi ne fa l'inventario per il pannello, e chi
 * in pannello deve sapere che un file di lì è un file che c'è.
 */
export const QUARANTENA = 'quarantena'

/** L'ambito dei documenti che non appartengono a un corso ma alla classe. */
export const DOCENTE_DI_CLASSE = 'docente-di-classe'

/**
 * Le due cartelle in cui si divide ogni classe dentro una materia: quel che è
 * di tutti e quel che è di uno. Sono due mestieri diversi — il foglio della
 * classe si guarda una volta e si archivia, quello di una persona si cerca
 * perché quella persona è nella stanza.
 */
export const DI_CLASSE = 'classe'
export const DEGLI_ALLIEVI = 'allievi'

/** Come si chiama la cartella dei ritratti dentro quella di una classe. */
export const FOTO = 'foto'

/**
 * Il percorso di un documento caricato, relativo alla cartella dei dati.
 *
 * `ambito` è la prima cartella dopo la radice — la materia dell'insegnamento —
 * e vuoto vuol dire «del docente di classe». `chi` è la persona di cui parla
 * il foglio, quando ce n'è una: la sua roba va tutta in una cartella sua.
 */
export function percorsoArchivio (
  classe: string,
  ambito: string | null,
  file: string,
  chi: string | null = null,
): string {
  return sotto(ARCHIVIO, classe, ambito, file, chi)
}

/** Lo stesso percorso nell'altra radice: quel che il registro genera. */
export function percorsoEsportazione (
  classe: string,
  ambito: string | null,
  file: string,
  chi: string | null = null,
): string {
  return sotto(ESPORTAZIONI, classe, ambito, file, chi)
}

/** Il pezzo comune alle due radici: sotto sono identiche. */
function sotto (
  radice: string,
  classe: string,
  ambito: string | null,
  file: string,
  chi: string | null,
): string {
  return [
    radice,
    nomeSicuro(ambito ?? DOCENTE_DI_CLASSE),
    nomeSicuro(classe),
    ...(chi ? [DEGLI_ALLIEVI, nomeSicuro(chi)] : [DI_CLASSE]),
    nomeSicuro(file),
  ].join('/')
}

/**
 * Il nome di un file archiviato: classe, documento, allievo, dettaglio.
 *
 * Le tre cose stanno anche nel percorso e si ripetono nel nome apposta: un file
 * esce dall'archivio di continuo — lo si allega a una mail, lo si manda in
 * segreteria — e fuori dalle sue cartelle un «Rossi Mario.pdf» non dice più di
 * che classe è né di che documento parla.
 */
export function nomeFileArchivio (
  classe: string,
  chi: string | null,
  documento: string,
  dettaglio: string | null,
  estensione: string,
): string {
  // Classe, documento, allievo: dal generale al particolare, come le cartelle
  // che lo contengono.
  const pezzi = [classe, documento, chi, dettaglio].filter(
    (pezzo): pezzo is string => Boolean(pezzo && pezzo.trim()),
  )
  const punto = estensione.startsWith('.') ? estensione : `.${estensione}`
  return `${nomeSicuro(pezzi.join('_'))}${punto.toLowerCase()}`
}

/** La cartella che contiene un percorso d'archivio: serve per portarsela via intera. */
export function cartellaDelPercorso (relativo: string): string {
  const barra = relativo.lastIndexOf('/')
  return barra > 0 ? relativo.slice(0, barra) : relativo
}

/**
 * Il numero che distingue due fogli che si chiamerebbero uguale: ` (2)`, ` (3)`.
 *
 * Il primo non porta niente — il caso normale è che di gemelli non ce ne siano,
 * e un `(1)` appeso a ogni nome sarebbe rumore su tutta la cartella. Serve dove
 * le cose che entrano nel nome non bastano a separarle: due bozze di piano
 * nate lo stesso giorno, due prove con lo stesso titolo nello stesso giorno.
 * È l'alternativa a infilare nel nome l'identificatore interno, che separa ma
 * non si legge.
 */
function distinzione (indice: number): string {
  return indice > 0 ? ` (${indice + 1})` : ''
}

/**
 * Come si chiama, nell'archivio, la cartella di un piano lezione.
 *
 * Un piano non ha un titolo — è la lezione di quel corso — e qui serve un nome
 * che stia fermo: un file archiviato porta il nome della cartella dentro il
 * proprio, e un nome che cambia lascia in giro file che dicono il falso.
 *
 * Due date, e sono le uniche due cose del piano che non si riscrivono: quella
 * della prima lezione che lo usa — con la sua ora, perché il lunedì di quel
 * corso può averne due, e due piani non devono finire nella stessa cartella —
 * e, finché lezioni non ce ne sono, quella in cui il piano è nato.
 */
export function documentoPiano (registro: Registro, piano: PianoLezione): string {
  const prima = registro.lezioni
    .filter((l) => l.pianoId === piano.id)
    .sort(confrontaLezioni)[0]
  if (prima) {
    return `Piano ${[dataNelNome(prima.data), oraNelNome(inizioLezione(prima))].filter(Boolean).join(' ')}`
  }

  const nato = giornoDi(piano.creatoIl)
  if (!nato) return 'Piano in preparazione'
  // Due bozze dello stesso corso nate lo stesso giorno si chiamerebbero uguale:
  // la seconda porta il suo numero, e restano due cartelle.
  const gemelle = registro.piani.filter(
    (p) => p.corsoId === piano.corsoId &&
      giornoDi(p.creatoIl) === nato &&
      !registro.lezioni.some((l) => l.pianoId === p.id),
  )
  return `Piano bozza ${dataNelNome(nato)}${distinzione(gemelle.findIndex((p) => p.id === piano.id))}`
}

// --------------------------------------------- i rapporti che il registro fa

/**
 * I generi di rapporto: uno per modello in `templates/`.
 *
 * Sta qui e non nel protocollo perché è il dominio a sapere dove finisce
 * ognuno, e perché il genere è la sola cosa che l'azione `rapporto.genera`
 * porta con sé.
 */
export type GenereRapporto =
  | 'lezione'
  | 'piano'
  | 'valutazioni'
  | 'presenze'
  | 'fascicolo'
  | 'allievo'
  | 'momento'
  | 'foto-classe'

/** Le parti di cui è fatto il posto di un documento: le cartelle e il nome. */
export interface Collocazione {
  /**
   * L'anno scolastico come si legge: `2026/2027`.
   *
   * Sta in testa al nome perché un file esce dalle sue cartelle — allegato a
   * una mail, consegnato in segreteria — e fuori di lì un verbale del 7
   * settembre non dice di che anno è. Dentro il registro, invece, ogni anno ha
   * il suo documento, e lì non servirebbe.
   */
  anno?: string
  classe: string
  ambito: string | null
  documento: string
  /** Di chi è il foglio, quando è di qualcuno — o di che prova parla. */
  chi: string | null
  /**
   * La persona di cui parla, quando ne parla di una sola: la sua roba va nella
   * cartella sua. Sta a sé e non si deduce da `chi`, che a volte è il titolo di
   * una prova.
   */
  allievo: string | null
  /** Che cosa distingue questo file dagli altri dello stesso documento. */
  dettaglio: string | null
  /**
   * Il dettaglio è il giorno in cui il foglio è stato fatto, non un periodo di
   * cui parla.
   *
   * Cambia il modo di riconoscere un file già scritto: un fascicolo stampato
   * ieri sta nella cartella con la data di ieri nel nome, e cercarlo per nome
   * esatto direbbe che non c'è. Si guarda il prefisso — `radiceDi` — e quel che
   * si trova è la copia che c'è, con la sua data leggibile nel nome.
   */
  datato: boolean
}

/**
 * Quel che apre il nome di un documento generato: anno, classe, materia.
 *
 * Sono le tre cose che le cartelle dicono già, e si ripetono nel nome per la
 * stessa ragione per cui `nomeFileArchivio` ripete la classe: il file vive
 * anche fuori dalla sua cartella.
 *
 * Quel che *non* c'è, e prima c'era, è l'identificatore interno del corso e
 * della lezione — `lez-m3k9x2-a7f1` — messo lì per non far coprire due
 * documenti diversi. Separava, ma a chi legge il nome non diceva niente, e un
 * nome di file è fatto per essere letto: adesso a separare sono le cose che si
 * leggono — l'ora della lezione, il periodo, il giorno — e dove non bastano
 * c'è un numero fra parentesi.
 */
function intestazione (collocazione: Collocazione): string {
  return [collocazione.anno, collocazione.classe, collocazione.ambito ?? DOCENTE_DI_CLASSE]
    .filter(Boolean)
    .join('_')
}

/** Il percorso del file, sotto `esportazioni/`. */
export function percorsoDi (collocazione: Collocazione, estensione = 'pdf'): string {
  return percorsoEsportazione(
    collocazione.classe,
    collocazione.ambito,
    nomeFileArchivio(
      intestazione(collocazione),
      collocazione.chi,
      collocazione.documento,
      collocazione.dettaglio,
      estensione,
    ),
    collocazione.allievo,
  )
}

/**
 * Lo stesso percorso senza dettaglio né estensione: il prefisso con cui si
 * riconoscono le copie di un documento datato, qualunque giorno portino.
 */
export function radiceDi (collocazione: Collocazione): string {
  // Il punto dell'estensione entra e subito se ne va: `nomeFileArchivio` è
  // l'unico a sapere come si incollano i pezzi del nome, e rifare qui quella
  // giuntura vorrebbe dire due regole per lo stesso nome.
  const nome = nomeFileArchivio(
    intestazione(collocazione),
    collocazione.chi,
    collocazione.documento,
    null,
    '.',
  )
  return percorsoEsportazione(
    collocazione.classe,
    collocazione.ambito,
    nome.slice(0, -1),
    collocazione.allievo,
  )
}

/**
 * La collocazione mentre la si costruisce: c'è anche di che classe è.
 *
 * Il `classeId` non entra nel nome né nel percorso — serve solo a risalire
 * all'anno scolastico, che nel nome ci va. Ricavarlo dopo, dal nome della
 * classe, vorrebbe dire cercare per nome: due anni possono avere una «DIC4a»
 * ciascuno, e la ricerca avrebbe risposto la prima delle due.
 */
interface Posto extends Collocazione {
  classeId: string | null
}

/** Che cosa si sta guardando quando si chiede un rapporto: il corso e il periodo. */
export interface ContestoRapporto {
  corsoId?: string | null
  semestreId?: string | null
  /** Il giorno che finisce nel nome dei documenti datati: di norma oggi. */
  giorno?: Iso
}

/**
 * Dove va a finire un rapporto, e con che nome.
 *
 * Una funzione sola per gli otto generi, e nel dominio: la usa l'azione che
 * scrive il file e la usa la pagina Documenti per sapere se quel file c'è già.
 * Scritta due volte si sarebbe disallineata al primo documento rinominato, e un
 * disallineamento così non si vede — la pagina direbbe «da fare» su documenti
 * che stanno nella cartella da mesi.
 */
function collocazioneBase (
  registro: Registro,
  genere: GenereRapporto,
  id: string,
  contesto: ContestoRapporto = {},
): Posto | null {
  const giorno = contesto.giorno ?? oggi()

  if (genere === 'lezione') {
    const lezione = registro.lezioni.find((l) => l.id === id)
    if (!lezione) return null
    const corso = registro.corsi.find((c) => c.id === lezione.corsoId) ?? null
    return {
      ...diUnCorso(registro, corso),
      documento: 'Verbali',
      chi: null,
      allievo: null,
      // Giorno e ora: dello stesso corso si fanno due ore nello stesso giorno,
      // e due verbali chiamati uguale sarebbero un verbale solo. L'ora è anche
      // quel che chi cerca il foglio ha in mente — «quello delle otto».
      dettaglio: [dataNelNome(lezione.data), oraNelNome(inizioLezione(lezione))]
        .filter(Boolean)
        .join(' '),
      datato: false,
    }
  }

  if (genere === 'piano') {
    const piano = registro.piani.find((p) => p.id === id)
    if (!piano) return null
    const corso = piano.corsoId ? registro.corsi.find((c) => c.id === piano.corsoId) ?? null : null
    return {
      ...diUnCorso(registro, corso),
      documento: 'Piani',
      chi: null,
      allievo: null,
      dettaglio: documentoPiano(registro, piano),
      datato: false,
    }
  }

  // Valutazioni e presenze sono di un corso, e il periodo sta nel nome: la
  // presenza del primo semestre non è quella del secondo, e chiamandoli uguali
  // il secondo avrebbe coperto il primo alla prima stampa dopo gennaio.
  if (genere === 'valutazioni' || genere === 'presenze') {
    const corso = registro.corsi.find((c) => c.id === id) ?? null
    if (!corso) return null
    return {
      ...diUnCorso(registro, corso),
      documento: genere === 'presenze' ? 'Presenze' : 'Valutazioni',
      chi: null,
      allievo: null,
      dettaglio: etichettaPeriodo(registro, corso.classeId, contesto.semestreId ?? null),
      datato: false,
    }
  }

  if (genere === 'momento') {
    const momento = registro.valutazioni.find((v) => v.id === id)
    if (!momento) return null
    const corso = registro.corsi.find((c) => c.id === momento.corsoId) ?? null
    // Titolo e data insieme: due verifiche possono chiamarsi uguale — «Test 1»
    // a settembre e a gennaio — e senza la data il secondo file coprirebbe il
    // primo. Se anche il giorno è lo stesso — l'orale e lo scritto chiamati
    // tutti e due «Test 1» — la seconda porta il suo numero.
    const gemelle = registro.valutazioni.filter(
      (v) => v.corsoId === momento.corsoId && v.titolo === momento.titolo && v.data === momento.data,
    )
    return {
      ...diUnCorso(registro, corso),
      documento: 'Prove',
      chi: `${momento.titolo}${distinzione(gemelle.findIndex((v) => v.id === momento.id))}`,
      allievo: null,
      dettaglio: dataNelNome(momento.data),
      datato: false,
    }
  }

  if (genere === 'fascicolo') {
    const classe = registro.classi.find((c) => c.id === id)
    if (!classe) return null
    return {
      classeId: classe.id,
      classe: classe.nome,
      // Il fascicolo è l'unico che resta del docente di classe: recapiti,
      // documenti e comunicazioni non appartengono a una materia.
      ambito: null,
      documento: 'Fascicolo',
      chi: null,
      allievo: null,
      dettaglio: dataNelNome(giorno),
      datato: true,
    }
  }

  // La parete di ritratti si chiede da un corso: le facce sono della classe, ma
  // il foglio si stampa per l'aula in cui si insegna, e va nella cartella di
  // quella materia con il resto di quel che ci si porta dentro.
  if (genere === 'foto-classe') {
    const corso = registro.corsi.find((c) => c.id === id) ?? null
    const classe = corso
      ? classeDelCorsoId(registro, corso.id)
      : registro.classi.find((c) => c.id === id) ?? null
    if (!classe) return null
    return {
      classeId: classe.id,
      classe: classe.nome,
      ambito: corso ? materiaDelCorso(registro, corso)?.nome ?? corso.titolo : null,
      documento: 'Foto della classe',
      chi: null,
      allievo: null,
      dettaglio: dataNelNome(giorno),
      datato: true,
    }
  }

  const classe = registro.classi.find((c) => c.allievi.some((a) => a.id === id)) ?? null
  const allievo = classe?.allievi.find((a) => a.id === id) ?? null
  if (!classe || !allievo) return null
  // Il corso lo dice chi chiede la scheda. Se non lo dice, e la classe ne ha
  // uno solo, è quello: chiederlo sarebbe una domanda con una risposta sola.
  // Con più corsi e nessuno indicato la scheda resta di tutta la classe.
  const suoi = corsiDellaClasse(registro, classe.id)
  const corso = suoi.find((c) => c.id === contesto.corsoId) ?? (suoi.length === 1 ? suoi[0] : null)
  return {
    classeId: classe.id,
    classe: classe.nome,
    ambito: corso ? materiaDelCorso(registro, corso)?.nome ?? corso.titolo : null,
    documento: DOCUMENTO_SCHEDE,
    chi: nomeCompleto(allievo),
    allievo: nomeCompleto(allievo),
    dettaglio: etichettaPeriodo(registro, classe.id, contesto.semestreId ?? null),
    datato: false,
  }
}

/** Classe e materia di un corso, come le scrive un percorso. */
function diUnCorso (
  registro: Registro,
  corso: Corso | null,
): { classeId: string | null, classe: string, ambito: string | null } {
  const classe = corso ? classeDelCorsoId(registro, corso.id) : null
  return {
    classeId: classe?.id ?? null,
    classe: classe?.nome ?? 'senza classe',
    ambito: corso ? materiaDelCorso(registro, corso)?.nome ?? corso.titolo : null,
  }
}

/** Come si chiama il periodo nel nome di un file: l'etichetta, o l'anno intero. */
function etichettaPeriodo (
  registro: Registro,
  classeId: string,
  semestreId: string | null,
): string {
  const classe = registro.classi.find((c) => c.id === classeId) ?? null
  const anno = classe ? registro.anni.find((a) => a.id === classe.annoId) ?? null : null
  return anno?.semestri.find((s) => s.id === semestreId)?.etichetta ?? 'anno intero'
}

/** Vecchi nomi della stessa scheda: non cambiano persona, materia o periodo. */
export function precedentiDi (collocazione: Collocazione): string[] {
  if (collocazione.documento !== DOCUMENTO_SCHEDE || !collocazione.allievo) return []
  return DOCUMENTO_SCHEDE_PRIMA.map((documento) => percorsoDi({ ...collocazione, documento }))
}

/**
 * Identità condivisa da stampa singola, automatica, CSV e anteprima.
 *
 * Aggiunge al posto l'anno scolastico, che è della classe: quello corrente vale
 * solo per i documenti che una classe non ce l'hanno — e un anno sbagliato in
 * testa al nome è peggio che nessun anno.
 */
export function collocazioneDi (
  registro: Registro, genere: GenereRapporto, id: string, contesto: ContestoRapporto = {},
): Collocazione | null {
  const posto = collocazioneBase(registro, genere, id, contesto)
  if (!posto) return null
  const classe = registro.classi.find((c) => c.id === posto.classeId) ?? null
  const anno = registro.anni.find((a) => a.id === classe?.annoId)
    ?? registro.anni.find((a) => a.id === registro.annoCorrenteId)
  const { classeId: _, ...collocazione } = posto
  return { ...collocazione, anno: anno?.etichetta }
}

/**
 * Tutti i percorsi con cui un documento può essere stato scritto.
 *
 * Serve a chi elimina: un'ora cancellata dal registro lasciava il suo verbale
 * nella cartella, e quel foglio resta lì a raccontare una lezione che non
 * esiste più — con l'appello di quel giorno e i nomi di chi c'era. La cartella
 * diceva una cosa e il registro un'altra, e a distanza di mesi nessuno sa
 * quale delle due creda.
 *
 * I periodi si enumerano tutti perché i fogli sono divisi per semestre: della
 * stessa scheda ci sono fino a tre copie — l'anno intero e i due semestri — e
 * toglierne una sola lascia le altre. Così per i corsi di una classe: la
 * scheda di una persona sta nella cartella della materia quando la si è
 * chiesta da un corso, e in quella della classe quando la si è chiesta da lì.
 *
 * Restano fuori i documenti con la data nel nome — il fascicolo, la parete di
 * ritratti: si chiamano come il giorno in cui li si è stampati, e quel giorno
 * non si sa più. Si tolgono a mano, dalla cartella.
 */
export function percorsiDiUnDocumento (
  registro: Registro,
  genere: GenereRapporto,
  id: string,
  dentro: ContestoRapporto = {},
): string[] {
  const contesti = contestiPossibili(registro, genere, id, dentro)
  const percorsi = new Set<string>()
  for (const contesto of contesti) {
    const dove = collocazioneDi(registro, genere, id, contesto)
    if (!dove || dove.datato) continue
    percorsi.add(percorsoDi(dove))
    // Anche i nomi di prima: una scheda scritta quando la cartella si chiamava
    // in un altro modo è lo stesso foglio, e lasciarla è lasciare un orfano.
    for (const precedente of precedentiDi(dove)) percorsi.add(precedente)
  }
  return [...percorsi]
}

/** I contesti con cui quel genere può essere stato scritto: periodi e corsi. */
function contestiPossibili (
  registro: Registro,
  genere: GenereRapporto,
  id: string,
  dentro: ContestoRapporto = {},
): ContestoRapporto[] {
  const periodiDi = (classeId: string | null): Array<string | null> => {
    const classe = registro.classi.find((c) => c.id === classeId) ?? null
    const anno = registro.anni.find((a) => a.id === classe?.annoId) ?? null
    return [null, ...(anno?.semestri ?? []).map((s) => s.id)]
  }

  if (genere === 'presenze' || genere === 'valutazioni') {
    const corso = registro.corsi.find((c) => c.id === id) ?? null
    return periodiDi(corso?.classeId ?? null).map((semestreId) => ({ semestreId }))
  }

  if (genere === 'allievo') {
    const classe = registro.classi.find((c) => c.allievi.some((a) => a.id === id)) ?? null
    if (!classe) return [{}]
    // Il corso: la scheda chiesta da una materia sta nella sua cartella, quella
    // chiesta dalla classe sta in quella della classe. Sono posti diversi dello
    // stesso foglio, e valgono tutti.
    // Un corso solo quando chi chiede lo dice: eliminando una materia se ne
    // vanno le schede stampate dentro la sua cartella, non quelle delle altre.
    const corsi: Array<string | null> = dentro.corsoId
      ? [dentro.corsoId]
      : [null, ...corsiDellaClasse(registro, classe.id).map((c) => c.id)]
    return corsi.flatMap((corsoId) =>
      periodiDi(classe.id).map((semestreId) => ({ corsoId, semestreId })),
    )
  }

  return [{}]
}

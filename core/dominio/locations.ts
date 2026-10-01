// Dove finisce un documento e con che nome, senza toccare il disco: le regole
// sono stringhe, e le usano sia chi scrive (`data/filing.ts`) sia il webview
// in sandbox (pagina Documenti, per sapere se un documento c'è già).
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
import { dataNelNome, etichettaSemestre, giornoDi, oggi, oraNelNome } from './dates.js'
import { testi as testiDate } from './dates.testi.js'
import { LINGUE } from '../i18n/index.js'
import { DOCUMENTO_SCHEDE_PRIMA } from './lexicon.js'
import { lessico } from './lexicon.testi.js'
import { testi } from './locations.testi.js'
import type { Corso, Iso, PianoLezione, Registro } from './models.js'
import { nomeSicuro } from './text.js'

/**
 * Le due radici della documentazione. `archivio/` è l'unica copia di quel che
 * si carica (cancellarlo è perderlo); `esportazioni/` è quel che il registro
 * stampa: si rifà con un pulsante, si può cancellare ed escludere dalla
 * sincronizzazione.
 */
export const ARCHIVIO = 'archivio'
export const ESPORTAZIONI = 'esportazioni'

/**
 * Dove sta un PDF di classe finché non è stato diviso: una sala d'attesa, non
 * una terza radice. Finite le pagine, il file va nel cestino.
 */
export const QUARANTENA = 'quarantena'

/** L'ambito dei documenti che non appartengono a un corso ma alla classe. */
export const DOCENTE_DI_CLASSE = 'docente-di-classe'

/**
 * Le due cartelle di ogni classe dentro una materia: quel che è di tutti e
 * quel che è di uno.
 */
export const DI_CLASSE = 'classe'
export const DEGLI_ALLIEVI = 'allievi'

/** Come si chiama la cartella dei ritratti dentro quella di una classe. */
export const FOTO = 'foto'

/**
 * Il percorso di un documento caricato, relativo alla cartella dei dati.
 * `ambito` è la materia (vuoto: docente di classe); `chi` la persona di cui
 * parla il foglio, che ha una cartella sua.
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
function percorsoEsportazione (
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
 * Il nome di un file archiviato: classe, documento, allievo, dettaglio. Si
 * ripetono le cose del percorso perché il file esce dalle sue cartelle (mail,
 * segreteria).
 */
export function nomeFileArchivio (
  classe: string,
  chi: string | null,
  documento: string,
  dettaglio: string | null,
  estensione: string,
): string {
  // Dal generale al particolare, come le cartelle.
  const pezzi = [classe, documento, chi, dettaglio].filter(
    (pezzo): pezzo is string => Boolean(pezzo && pezzo.trim()),
  )
  const punto = estensione.startsWith('.') ? estensione : `.${estensione}`
  return `${accorciaNome(pezzi)}${punto.toLowerCase()}`
}

/**
 * Lunghezza massima del nome di un file archiviato, estensione esclusa: sotto
 * il limite di 255 (ENAMETOOLONG), con posto per estensione e ` (2)`.
 */
const NOME_FILE_MASSIMO = 150

/**
 * I pezzi giunti in un nome lungo al più `NOME_FILE_MASSIMO`, senza punti né
 * spazi in coda: Windows non li tiene. Si accorciano i pezzi più lunghi, testo
 * libero (un titolo, il nome di un file): quelli corti distinguono (una data,
 * «Piano bozza 260901 (2)») e un taglio in coda li perderebbe.
 */
function accorciaNome (pezzi: readonly string[]): string {
  const nome = nomeSicuro(pezzi.join('_'))
  // Per caratteri e non per unità UTF-16: un'emoji tagliata a metà non è un
  // nome scrivibile.
  if (Array.from(nome).length <= NOME_FILE_MASSIMO) return nome

  const caratteri = pezzi.map((pezzo) => Array.from(nomeSicuro(pezzo, '')))
  const posto = NOME_FILE_MASSIMO - (pezzi.length - 1)
  const occupato = (tetto: number) =>
    caratteri.reduce((somma, pezzo) => somma + Math.min(pezzo.length, tetto), 0)
  // Il tetto più alto per pezzo che fa stare tutto: con quattro pezzi non
  // scende sotto i 36 caratteri.
  let tetto = posto
  while (tetto > 0 && occupato(tetto) > posto) tetto -= 1
  const accorciati = caratteri
    .map((pezzo) => pezzo.slice(0, tetto).join('').replace(/[. ]+$/, ''))
    .filter(Boolean)
  // testo-fisso: un nome sul disco, come il ripiego di `nomeSicuro`
  return accorciati.join('_').replace(/[. ]+$/, '') || 'senza nome'
}

/** La cartella che contiene un percorso d'archivio: serve per portarsela via intera. */
export function cartellaDelPercorso (relativo: string): string {
  const barra = relativo.lastIndexOf('/')
  return barra > 0 ? relativo.slice(0, barra) : relativo
}

/**
 * Il numero che distingue due fogli omonimi: ` (2)`, ` (3)`; il primo niente.
 * Serve dove il nome non basta a separarli (due bozze o due prove omonime
 * nello stesso giorno), al posto di un id illeggibile.
 */
function distinzione (indice: number): string {
  return indice > 0 ? ` (${indice + 1})` : ''
}

/** Il nome di un piano che nessuna lezione usa ancora. */
// testo-fisso: il nome della cartella in `archivio/`, che non cambia con la lingua
const BOZZA = 'Piano bozza'

/**
 * Il nome, nell'archivio, della cartella di un piano lezione: deve stare
 * fermo, perché i file archiviati lo portano nel loro. Si basa sulle sole date
 * che non cambiano: la prima lezione che lo usa (con l'ora: un lunedì può
 * averne due), o in mancanza la nascita del piano.
 */
export function documentoPiano (registro: Registro, piano: PianoLezione): string {
  const prima = registro.lezioni
    .filter((l) => l.pianoId === piano.id)
    .sort(confrontaLezioni)[0]
  if (prima) {
    const quando = [dataNelNome(prima.data), oraNelNome(inizioLezione(prima))].filter(Boolean)
    // testo-fisso: il nome della cartella in `archivio/`, che non cambia con la lingua
    return `Piano ${quando.join(' ')}`
  }

  const nato = giornoDi(piano.creatoIl)
  // testo-fisso: il nome della cartella in `archivio/`, che non cambia con la lingua
  if (!nato) return 'Piano in preparazione'
  // Due bozze dello stesso corso e giorno: la seconda prende un numero.
  const gemelle = registro.piani.filter(
    (p) => p.corsoId === piano.corsoId &&
      giornoDi(p.creatoIl) === nato &&
      !registro.lezioni.some((l) => l.pianoId === p.id),
  )
  const numero = distinzione(gemelle.findIndex((p) => p.id === piano.id))
  return `${BOZZA} ${dataNelNome(nato)}${numero}`
}

/**
 * Vero se un nome di file, senza estensione, finisce con la prima di più bozze
 * gemelle possibili: lo stesso nome con « (2)» è la seconda, non un doppione.
 */
export function finisceConBozza (radice: string): boolean {
  return new RegExp(`(^|_)${BOZZA} \\d{6}$`).test(radice)
}

// --------------------------------------------- i rapporti che il registro fa

/**
 * I generi di rapporto, uno per modello in `templates/`. Nel dominio perché è
 * il dominio a sapere dove finisce ognuno, e `rapporto.genera` porta solo il
 * genere.
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
  | 'diario'
  | 'corso'
  | 'supplenze'

/** Le parti di cui è fatto il posto di un documento: le cartelle e il nome. */
export interface Collocazione {
  /**
   * L'anno scolastico come si legge, `2026/2027`, in testa al nome: fuori dalle
   * cartelle un verbale non direbbe di che anno è.
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
   * Il dettaglio è il giorno in cui il foglio è stato fatto, non un periodo.
   * Un file così si riconosce per prefisso (`radiceDi`), non per nome esatto.
   */
  datato: boolean
}

/**
 * L'inizio del nome di un documento generato: anno, classe, materia (il file
 * vive anche fuori dalla cartella). Due documenti si separano con cose
 * leggibili (ora, periodo, giorno) e, se non bastano, un numero fra parentesi;
 * mai con gli id interni.
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
  // Il nome intero, poi senza la coda: la giuntura dei pezzi la sa solo
  // `nomeFileArchivio`, e un nome lungo si accorcia secondo il posto che il
  // dettaglio lascia. Le date nel nome sono lunghe uguali: ogni giorno taglia
  // la radice allo stesso punto.
  const nome = nomeFileArchivio(
    intestazione(collocazione),
    collocazione.chi,
    collocazione.documento,
    collocazione.dettaglio,
    '.',
  )
  const coda = collocazione.dettaglio ? `_${nomeSicuro(collocazione.dettaglio)}.` : '.'
  return percorsoEsportazione(
    collocazione.classe,
    collocazione.ambito,
    nome.endsWith(coda) ? nome.slice(0, -coda.length) : nome.slice(0, -1),
    collocazione.allievo,
  )
}

/**
 * La collocazione in costruzione, con `classeId`: non va nel nome ma serve a
 * trovare l'anno scolastico. Cercarlo per nome della classe sbaglierebbe con
 * due «DIC4a» in due anni.
 */
interface Posto extends Collocazione {
  classeId: string | null
}

/** Che cosa si sta guardando quando si chiede un rapporto: il corso e il periodo. */
export interface ContestoRapporto {
  corsoId?: string | null
  semestreId?: string | null
  /** Se la scheda è per il docente di classe (tutte le materie). */
  docenteDiClasse?: boolean
  /** Il giorno che finisce nel nome dei documenti datati: di norma oggi. */
  giorno?: Iso
}

/**
 * Dove va a finire un rapporto, e con che nome: una funzione sola per tutti i
 * generi, usata dall'azione che scrive e dalla pagina Documenti che controlla
 * se il file c'è già.
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
      documento: testi().documenti.verbali,
      chi: null,
      allievo: null,
      // Giorno e ora: due ore dello stesso corso nello stesso giorno non devono
      // coprirsi, e l'ora è come si cerca il foglio.
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
      documento: testi().documenti.piani,
      chi: null,
      allievo: null,
      dettaglio: documentoPiano(registro, piano),
      datato: false,
    }
  }

  // Valutazioni, presenze, diario, scheda corso e supplenze hanno il periodo nel nome, se no il secondo semestre
  // coprirebbe il primo.
  if (
    genere === 'valutazioni' ||
    genere === 'presenze' ||
    genere === 'diario' ||
    genere === 'corso' ||
    genere === 'supplenze'
  ) {
    const corso = registro.corsi.find((c) => c.id === id) ?? null
    if (!corso) return null
    return {
      ...diUnCorso(registro, corso),
      documento:
        genere === 'corso'
          ? testi().documenti.corso
          : genere === 'supplenze'
            ? testi().documenti.supplenze
            : genere === 'diario'
              ? testi().documenti.diario
              : testi().documenti[genere === 'presenze' ? 'presenze' : 'valutazioni'],
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
    // Titolo e data: due «Test 1» in mesi diversi non si coprono. Nello stesso
    // giorno il secondo prende un numero.
    const gemelle = registro.valutazioni.filter(
      (v) =>
        v.corsoId === momento.corsoId && v.titolo === momento.titolo && v.data === momento.data,
    )
    return {
      ...diUnCorso(registro, corso),
      documento: testi().documenti.prove,
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
      // Il fascicolo è del docente di classe: non appartiene a una materia.
      ambito: null,
      documento: testi().documenti.fascicolo,
      chi: null,
      allievo: null,
      dettaglio: dataNelNome(giorno),
      datato: true,
    }
  }

  // La parete di ritratti si chiede da un corso e va nella cartella di quella
  // materia.
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
      documento: testi().documenti.fotoClasse,
      chi: null,
      allievo: null,
      dettaglio: dataNelNome(giorno),
      datato: true,
    }
  }

  const classe = registro.classi.find((c) => c.allievi.some((a) => a.id === id)) ?? null
  const allievo = classe?.allievi.find((a) => a.id === id) ?? null
  if (!classe || !allievo) return null
  if (contesto.docenteDiClasse) {
    return {
      classeId: classe.id,
      classe: classe.nome,
      ambito: null,
      documento: testi().documenti.schedaDocenteClasse,
      chi: nomeCompleto(allievo),
      allievo: nomeCompleto(allievo),
      dettaglio: etichettaPeriodo(registro, classe.id, contesto.semestreId ?? null),
      datato: false,
    }
  }
  // Il corso lo dice chi chiede; se la classe ne ha uno solo, è quello; se no
  // la scheda è di tutta la classe.
  const suoi = corsiDellaClasse(registro, classe.id)
  const corso = suoi.find((c) => c.id === contesto.corsoId) ?? (suoi.length === 1 ? suoi[0] : null)
  return {
    classeId: classe.id,
    classe: classe.nome,
    ambito: corso ? materiaDelCorso(registro, corso)?.nome ?? corso.titolo : null,
    documento: lessico().documentoSchede,
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
    // testo-fisso: una cartella sul disco, come quella che `data/filing.ts` dà all'archivio
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
  return etichettaSemestre(anno?.semestri.find((s) => s.id === semestreId))
}

/** Vecchi nomi della stessa scheda: non cambiano persona, materia o periodo. */
export function precedentiDi (collocazione: Collocazione): string[] {
  if (collocazione.documento !== lessico().documentoSchede || !collocazione.allievo) return []
  return DOCUMENTO_SCHEDE_PRIMA.map((documento) => percorsoDi({ ...collocazione, documento }))
}

/**
 * Identità condivisa da stampa singola, automatica, CSV e anteprima: aggiunge
 * l'anno scolastico della classe. L'anno corrente vale solo per i documenti
 * senza classe.
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
 * Tutti i percorsi con cui un documento può essere stato scritto, per chi
 * elimina: un verbale rimasto racconterebbe un'ora che non c'è più.
 *
 * Tutti i periodi (anno e due semestri) e tutti i corsi della classe, perché
 * la stessa scheda può stare in più posti. Restano fuori i documenti con la
 * data di stampa nel nome (fascicolo, parete di ritratti): si tolgono a mano.
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
    // Anche i nomi precedenti della stessa scheda.
    for (const precedente of precedentiDi(dove)) percorsi.add(precedente)
  }
  return [...percorsi]
}

/**
 * Gli stessi fogli di `percorsiDiUnDocumento` coi nomi delle altre lingue. A
 * parte perché non si contano: probabilmente non esistono, chi cancella li
 * cerca soltanto.
 */
export function percorsiInAltreLingue (
  registro: Registro,
  genere: GenereRapporto,
  id: string,
  dentro: ContestoRapporto = {},
): string[] {
  const qui = new Set(percorsiDiUnDocumento(registro, genere, id, dentro))
  const altrove = new Set<string>()
  for (const contesto of contestiPossibili(registro, genere, id, dentro)) {
    const dove = collocazioneDi(registro, genere, id, contesto)
    if (!dove || dove.datato) continue
    for (const tradotta of nelleLingue(dove)) {
      const percorso = percorsoDi(tradotta)
      if (!qui.has(percorso)) altrove.add(percorso)
    }
  }
  return [...altrove]
}

/**
 * La stessa collocazione in ognuna delle lingue: cambiano il nome del
 * documento e il periodo (semestre o «anno intero»); il resto l'ha scritto il
 * docente.
 */
function nelleLingue (dove: Collocazione): Collocazione[] {
  const qui: Record<string, string> = testi().documenti
  const chiave = Object.keys(qui).find((k) => qui[k] === dove.documento)
  const scheda = dove.documento === lessico().documentoSchede
  const intero = dove.dettaglio === testiDate().annoIntero
  const semestre = [1, 2].find((numero) => dove.dettaglio === testiDate().semestre(numero))
  return LINGUE.map((lingua) => {
    const documenti: Record<string, string> = testi.in(lingua).documenti
    const documento = chiave
      ? documenti[chiave]
      : scheda ? lessico.in(lingua).documentoSchede : dove.documento
    const dettaglio = intero
      ? testiDate.in(lingua).annoIntero
      : semestre ? testiDate.in(lingua).semestre(semestre) : dove.dettaglio
    return { ...dove, documento, dettaglio }
  })
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

  if (
    genere === 'presenze' ||
    genere === 'valutazioni' ||
    genere === 'diario' ||
    genere === 'corso' ||
    genere === 'supplenze'
  ) {
    const corso = registro.corsi.find((c) => c.id === id) ?? null
    return periodiDi(corso?.classeId ?? null).map((semestreId) => ({ semestreId }))
  }

  if (genere === 'allievo') {
    const classe = registro.classi.find((c) => c.allievi.some((a) => a.id === id)) ?? null
    if (!classe) return [{}]
    if (dentro.docenteDiClasse) {
      return periodiDi(classe.id).map((semestreId) => ({ docenteDiClasse: true, semestreId }))
    }
    // Il corso: una scheda chiesta da una materia sta nella sua cartella,
    // quella chiesta dalla classe nella cartella della classe. Solo il corso
    // indicato: eliminando una materia se ne vanno solo le sue schede.
    const corsi: Array<string | null> = dentro.corsoId
      ? [dentro.corsoId]
      : [null, ...corsiDellaClasse(registro, classe.id).map((c) => c.id)]
    return [
      ...corsi.flatMap((corsoId) =>
        periodiDi(classe.id).map((semestreId) => ({ corsoId, semestreId })),
      ),
      ...periodiDi(classe.id).map((semestreId) => ({ docenteDiClasse: true, semestreId })),
    ]
  }

  return [{}]
}

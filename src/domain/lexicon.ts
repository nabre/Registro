// Il lessico italiano del registro: come si chiamano le cose, in un posto solo.
// Un termine si cambia qui e cambia ovunque: schermo, stampa, posta, guida.
//
// Si tocca solo il valore fra virgolette; le chiavi (`pif`, `classe`…) sono
// nomi del codice. Il genere va tenuto giusto: articoli e accordi nascono da
// lì. Le frasi lunghe della guida sono scritte a mano: cambiando un termine
// importante va riletta.
//
// Le traduzioni stanno in `lexicon.testi.ts` e si leggono con `lessico()`. Due
// famiglie di funzioni:
//
//   - **neutre** — `Maiuscola`, `Uno`, `Molti`, `corto`, `quanti`: per i
//     termini di qualunque lingua;
//   - **italiane** — `il`, `del`, `al`, `un`, `con`, `accorda`, `frase` e le
//     costanti (`PIF`, `UD`, `PERSONE`…): solo dentro i cataloghi italiani
//     (`const it = { … }` di un `.testi.ts`). Fuori, `npm run i18n` le segnala.

import { plurale } from './text.js'
import type {
  CategoriaDocumento,
  ContattoTelefonico,
  EtichettaTelefono,
  Raggruppamento,
  RuoloAllegato,
  StatoLezione,
  StatoPresenza,
  TipoAttivita,
  TipoConsegna,
  TipoOsservazione,
  TipoValutazione,
} from './models.js'

// ------------------------------------------------------------------- i tipi

type Genere = 'm' | 'f'

/**
 * Un nome di cosa, con quel che serve per scriverlo in una frase. Il plurale è
 * scritto, non calcolato: nessuna regola indovina «unità didattiche» e
 * «persone in formazione».
 */
export interface Termine {
  readonly singolare: string
  readonly plurale: string
  readonly genere: Genere
  /**
   * La forma corta, dove lo spazio è poco (colonna, pastiglia, griglia). Manca
   * quando il termine è già corto: vale il singolare.
   */
  readonly breve?: string
}

// ------------------------------------------------------------ chi c'è dentro

/**
 * Le persone di cui il registro parla. «Persona in formazione» è il termine
 * della legge federale sulla formazione professionale; «PiF» (con la «i»
 * minuscola) è la sigla per le colonne strette.
 */
export const PERSONE = {
  pif: {
    singolare: 'persona in formazione',
    plurale: 'persone in formazione',
    genere: 'f',
    breve: 'PiF',
  },
  docente: {
    singolare: 'docente',
    plurale: 'docenti',
    genere: 'm',
  },
  docenteClasse: {
    singolare: 'docente di classe',
    plurale: 'docenti di classe',
    genere: 'm',
  },
  /**
   * Chi risponde per una persona in formazione minorenne. «Rappresentante
   * legale» e non «tutore», che lo nomina un'autorità.
   */
  rappresentante: {
    singolare: 'rappresentante legale',
    plurale: 'rappresentanti legali',
    genere: 'm',
    breve: 'Rappr. legale',
  },
  /** L'azienda dove si fa la pratica: «formatrice» la distingue da un datore qualunque. */
  azienda: {
    singolare: 'azienda formatrice',
    plurale: 'aziende formatrici',
    genere: 'f',
    breve: 'Azienda',
  },
  /** Chi firma per l'azienda: è lui che riceve le richieste di firma. */
  datore: {
    singolare: 'datore di lavoro',
    plurale: 'datori di lavoro',
    genere: 'm',
    breve: 'Datore',
  },
} as const satisfies Record<string, Termine>

// ------------------------------------------------------------- come è divisa

/** Classe, corso, materia, e i pezzi di calendario dentro cui stanno. */
export const SCUOLA = {
  classe: { singolare: 'classe', plurale: 'classi', genere: 'f' },
  corso: { singolare: 'corso', plurale: 'corsi', genere: 'm' },
  materia: { singolare: 'materia', plurale: 'materie', genere: 'f' },
  annoScolastico: {
    singolare: 'anno scolastico',
    plurale: 'anni scolastici',
    genere: 'm',
    breve: 'Anno',
  },
  semestre: { singolare: 'semestre', plurale: 'semestri', genere: 'm' },
  periodo: { singolare: 'periodo', plurale: 'periodi', genere: 'm' },
  vacanza: { singolare: 'vacanza', plurale: 'vacanze', genere: 'f' },
} as const satisfies Record<string, Termine>

// ---------------------------------------------------------- l'ora di lezione

/**
 * Il tempo in aula e come si misura. «Fascia oraria» e non «slot»: è la
 * parola di un orario scolastico italiano.
 */
export const LEZIONE = {
  lezione: { singolare: 'lezione', plurale: 'lezioni', genere: 'f' },
  ora: { singolare: 'ora di lezione', plurale: 'ore di lezione', genere: 'f', breve: 'Ora' },
  unitaDidattica: {
    singolare: 'unità didattica',
    plurale: 'unità didattiche',
    genere: 'f',
    breve: 'UD',
  },
  fascia: { singolare: 'fascia oraria', plurale: 'fasce orarie', genere: 'f', breve: 'Fascia' },
  pausa: { singolare: 'pausa', plurale: 'pause', genere: 'f' },
  orario: { singolare: 'orario', plurale: 'orari', genere: 'm' },
  pianoLezione: {
    singolare: 'piano lezione',
    plurale: 'piani lezione',
    genere: 'm',
    breve: 'Piano',
  },
  attivita: { singolare: 'attività', plurale: 'attività', genere: 'f' },
  tappa: { singolare: 'tappa', plurale: 'tappe', genere: 'f' },
  scaletta: { singolare: 'scaletta', plurale: 'scalette', genere: 'f' },
  risorsa: { singolare: 'risorsa', plurale: 'risorse', genere: 'f' },
} as const satisfies Record<string, Termine>

// -------------------------------------------------------------- che voto ha

/** Le prove e i numeri che ne vengono. */
export const VALUTAZIONE = {
  momento: {
    singolare: 'momento di valutazione',
    plurale: 'momenti di valutazione',
    genere: 'm',
    breve: 'Momento',
  },
  prova: { singolare: 'prova', plurale: 'prove', genere: 'f' },
  voto: { singolare: 'voto', plurale: 'voti', genere: 'm' },
  media: { singolare: 'media', plurale: 'medie', genere: 'f' },
  nota: {
    singolare: 'nota di fine semestre',
    plurale: 'note di fine semestre',
    genere: 'f',
    breve: 'Nota',
  },
  scala: { singolare: 'scala dei voti', plurale: 'scale dei voti', genere: 'f', breve: 'Scala' },
  recupero: { singolare: 'recupero', plurale: 'recuperi', genere: 'm' },
  riconsegna: { singolare: 'riconsegna', plurale: 'riconsegne', genere: 'f' },
  osservazione: { singolare: 'osservazione', plurale: 'osservazioni', genere: 'f' },
} as const satisfies Record<string, Termine>

// ------------------------------------------------------------ che carta gira

/** Quel che si raccoglie, si consegna, si stampa e si spedisce. */
export const CARTE = {
  consegna: { singolare: 'consegna', plurale: 'consegne', genere: 'f' },
  // La lista di controllo di un corso: colonne da spuntare allievo per allievo.
  check: { singolare: 'check', plurale: 'check', genere: 'm' },
  colonnaCheck: {
    singolare: 'colonna del check',
    plurale: 'colonne del check',
    genere: 'f',
    breve: 'Colonna',
  },
  documento: { singolare: 'documento', plurale: 'documenti', genere: 'm' },
  // Un calendario ICS del documento: l'orario di sede, quello dei laboratori.
  calendario: { singolare: 'calendario', plurale: 'calendari', genere: 'm' },
  allegato: { singolare: 'allegato', plurale: 'allegati', genere: 'm' },
  fascicolo: {
    singolare: 'fascicolo di classe',
    plurale: 'fascicoli di classe',
    genere: 'm',
    breve: 'Fascicolo',
  },
  rapporto: { singolare: 'rapporto', plurale: 'rapporti', genere: 'm' },
  comunicazione: { singolare: 'comunicazione', plurale: 'comunicazioni', genere: 'f' },
  /** Il messaggio di posta: «e-mail», sempre con il trattino. */
  email: { singolare: 'e-mail', plurale: 'e-mail', genere: 'f' },
  bozza: { singolare: 'bozza', plurale: 'bozze', genere: 'f' },
  /**
   * Quel che resta da chiudere nella lista del docente. «Pendenza»: una parola
   * sola, quella dell'amministrazione, accanto all'«in sospeso» delle righe
   * vuote.
   */
  pendenza: { singolare: 'pendenza', plurale: 'pendenze', genere: 'f' },
  promemoria: { singolare: 'promemoria', plurale: 'promemoria', genere: 'm' },
  smistamento: { singolare: 'smistamento', plurale: 'smistamenti', genere: 'm' },
} as const satisfies Record<string, Termine>

// ----------------------------------------------------- scriverli in italiano

/** La prima lettera grande, il resto com'è: «Persona in formazione». */
export function Maiuscola (testo: string): string {
  return testo ? testo[0].toUpperCase() + testo.slice(1) : testo
}

/**
 * Quel che le funzioni neutre guardano di un termine: le parole, non il genere
 * (il tedesco ha anche il neutro, che `Termine` non conosce).
 */
export type Parole = Pick<Termine, 'singolare' | 'plurale' | 'breve'> & { readonly genere?: string }

/** Il singolare con la maiuscola: il titolo di una colonna, di un pulsante. */
export function Uno (termine: Parole): string {
  return Maiuscola(termine.singolare)
}

/** Il plurale con la maiuscola: il titolo di un elenco. */
export function Molti (termine: Parole): string {
  return Maiuscola(termine.plurale)
}

/** La forma corta, o il singolare quando non ce n'è una. */
export function corto (termine: Parole): string {
  return termine.breve ?? termine.singolare
}

/**
 * «1 lezione», «3 lezioni»: il numero con la parola giusta secondo la lingua
 * (`plurale`): zero è plurale in italiano, singolare in francese.
 */
export function quanti (numero: number, termine: Parole): string {
  return plurale(numero, termine.singolare, termine.plurale)
}

/**
 * Le parole che vogliono «lo» invece di «il»: s+consonante, z, x, y, gn, pn,
 * ps, e la i che fa da semivocale («lo iodio»).
 */
const VUOLE_LO = /^(?:s[^aeiouàèéìòù]|z|x|y|gn|pn|ps|i[aeiou])/i

/** Le parole che cominciano per vocale: prendono l'apostrofo. */
const VOCALE_INIZIALE = /^[aeiouàèéìòù]/i

/**
 * L'articolo determinativo di una parola: `il`, `lo`, `l’`, `i`, `gli`, `la`,
 * `le`. Decide come comincia la parola, non il termine: «lo studente»,
 * «l’allievo».
 */
function articolo (parola: string, genere: Genere, plurale = false): string {
  if (genere === 'f') {
    if (plurale) return 'le'
    return VOCALE_INIZIALE.test(parola) ? 'l’' : 'la'
  }
  if (plurale) return VOCALE_INIZIALE.test(parola) || VUOLE_LO.test(parola) ? 'gli' : 'i'
  if (VOCALE_INIZIALE.test(parola)) return 'l’'
  return VUOLE_LO.test(parola) ? 'lo' : 'il'
}

/** Attacca l'articolo alla parola: con lo spazio, o con niente dopo l'apostrofo. */
function attacca (articolo: string, parola: string): string {
  return articolo.endsWith('’') ? `${articolo}${parola}` : `${articolo} ${parola}`
}

/**
 * Le preposizioni articolate, per articolo di partenza: si scrivono, perché la
 * regola ha più eccezioni della tabella.
 */
const PREPOSIZIONI = {
  di: { il: 'del', lo: 'dello', 'l’': 'dell’', i: 'dei', gli: 'degli', la: 'della', le: 'delle' },
  a: { il: 'al', lo: 'allo', 'l’': 'all’', i: 'ai', gli: 'agli', la: 'alla', le: 'alle' },
  da: { il: 'dal', lo: 'dallo', 'l’': 'dall’', i: 'dai', gli: 'dagli', la: 'dalla', le: 'dalle' },
  in: { il: 'nel', lo: 'nello', 'l’': 'nell’', i: 'nei', gli: 'negli', la: 'nella', le: 'nelle' },
  su: { il: 'sul', lo: 'sullo', 'l’': 'sull’', i: 'sui', gli: 'sugli', la: 'sulla', le: 'sulle' },
} as const satisfies Record<string, Record<string, string>>

type Preposizione = keyof typeof PREPOSIZIONI

/**
 * Il termine con il suo articolo: «la persona in formazione», «della persona
 * in formazione». La preposizione (`di`, `a`, `da`, `in`, `su`) è facoltativa.
 */
export function con (
  termine: Termine,
  opzioni: { plurale?: boolean; preposizione?: Preposizione } = {},
): string {
  const parola = opzioni.plurale ? termine.plurale : termine.singolare
  const base = articolo(parola, termine.genere, opzioni.plurale)
  if (!opzioni.preposizione) return attacca(base, parola)
  const tabella: Record<string, string> = PREPOSIZIONI[opzioni.preposizione]
  return attacca(tabella[base], parola)
}

/** «la persona in formazione» — la forma che serve nove volte su dieci. */
export function il (termine: Termine): string {
  return con(termine)
}

/** «le persone in formazione» */
export function i (termine: Termine): string {
  return con(termine, { plurale: true })
}

/** «della persona in formazione» */
export function del (termine: Termine): string {
  return con(termine, { preposizione: 'di' })
}

/** «delle persone in formazione» */
export function dei (termine: Termine): string {
  return con(termine, { plurale: true, preposizione: 'di' })
}

/** «alla persona in formazione» */
export function al (termine: Termine): string {
  return con(termine, { preposizione: 'a' })
}

/** «alle persone in formazione» */
export function ai (termine: Termine): string {
  return con(termine, { plurale: true, preposizione: 'a' })
}

/** «una persona in formazione», «un documento», «un’azienda formatrice». */
export function un (termine: Termine): string {
  const parola = termine.singolare
  if (termine.genere === 'f') {
    return VOCALE_INIZIALE.test(parola) ? `un’${parola}` : `una ${parola}`
  }
  return VUOLE_LO.test(parola) ? `uno ${parola}` : `un ${parola}`
}

/**
 * Un aggettivo o participio accordato al termine: `accorda(PIF, 'trovato')` dà
 * «trovata», al plurale «trovate». Si scrive il maschile singolare. Solo le
 * classi regolari in `-o` e `-e`; il resto (invariabile o irregolare) resta
 * com'è.
 */
export function accorda (termine: Termine, aggettivo: string, plurale = false): string {
  const radice = aggettivo.slice(0, -1)
  if (aggettivo.endsWith('o')) {
    if (termine.genere === 'f') return `${radice}${plurale ? 'e' : 'a'}`
    return `${radice}${plurale ? 'i' : 'o'}`
  }
  if (aggettivo.endsWith('e')) return plurale ? `${radice}i` : aggettivo
  return aggettivo
}

/**
 * «Persona in formazione non trovata.»: termine con maiuscola, participio
 * accordato, punto. Il participio si scrive al maschile singolare; `nega`
 * mette il «non», `coda` segue e non si accorda («nella classe»).
 */
export function frase (
  termine: Termine,
  participio: string,
  opzioni: { nega?: boolean; coda?: string; plurale?: boolean } = {},
): string {
  const plurale = opzioni.plurale ?? false
  const parola = plurale ? termine.plurale : termine.singolare
  const pezzi = [
    Maiuscola(parola),
    opzioni.nega ? 'non' : '',
    accorda(termine, participio, plurale),
    opzioni.coda ?? '',
  ]
  return `${pezzi.filter(Boolean).join(' ')}.`
}

// --------------------------------------------------------------- scorciatoie

/** I termini più usati, pronti da importare; gli altri si pescano dal gruppo. */
export const PIF = PERSONE.pif
export const UD = LEZIONE.unitaDidattica
export const FASCIA = LEZIONE.fascia

/**
 * Il nome della famiglia di fogli stampati una per persona, dentro il nome di
 * ogni PDF in `esportazioni/`. Cambiarlo rinomina i file da lì in avanti; il
 * registro rifà quelli vecchi da sé.
 */
export const DOCUMENTO_SCHEDE = `Scheda ${corto(PIF)}`

/**
 * I nomi usati in passato da questa famiglia di fogli: servono a riconoscere i
 * file già sul disco, che altrimenti finirebbero fra i caricati (mai
 * cancellati).
 */
export const DOCUMENTO_SCHEDE_PRIMA: readonly string[] = ['Schede allievo', 'Scheda allievo', 'Schede PiF']

// ----------------------------------------------------- le parole delle liste

/**
 * Come si chiamano le voci delle tendine e delle pastiglie, in un posto solo;
 * i file che le usano le ripubblicano nella forma di prima.
 */

/**
 * L'appello: la sigla che si preme e la parola che la spiega. Sigle ASCII (un
 * carattere che il PDF non sa scrivere diventa «?»), uguali a schermo e in
 * stampa. `Record` completo: uno stato nuovo non si può dimenticare qui.
 */
export const VOCI_PRESENZA: Readonly<Record<StatoPresenza, { sigla: string, nome: string }>> = {
  'non-impostato': { sigla: '-', nome: 'Non impostato' },
  presente: { sigla: 'P', nome: 'Presente' },
  assente: { sigla: 'X', nome: 'Assente' },
  ritardo: { sigla: 'R', nome: 'In ritardo' },
  esonerato: { sigla: 'E', nome: 'Esonerato' },
}

/**
 * Le sigle dell'appello da sole: uguali in tutte le lingue (tasti e stampa).
 * Le parole stanno in `lessico().presenze`.
 */
export const SIGLE_PRESENZA: Readonly<Record<StatoPresenza, string>> = Object.fromEntries(
  chiaviDi(VOCI_PRESENZA).map((stato) => [stato, VOCI_PRESENZA[stato].sigla]),
) as Record<StatoPresenza, string>

/** Gli stati in fila, nell'ordine del dizionario (`Object.keys` lo conserva). */
export const STATI_PRESENZA: ReadonlyArray<{
  valore: StatoPresenza
  sigla: string
  nome: string
}> = chiaviDi(VOCI_PRESENZA).map((valore) => ({ valore, ...VOCI_PRESENZA[valore] }))

/**
 * A chi risponde un numero, con le parole del lessico: cambiando «persona in
 * formazione» cambia anche il titolino sopra i suoi numeri.
 */
export const CONTATTI_TELEFONICI: Readonly<Record<ContattoTelefonico, Termine>> = {
  pif: PERSONE.pif,
  rappresentante: PERSONE.rappresentante,
  datore: PERSONE.datore,
}

/** Come si chiamano i numeri: minuscoli, perché si leggono in una frase. */
export const ETICHETTE_TELEFONO: Readonly<Record<EtichettaTelefono, string>> = {
  cellulare: 'cellulare',
  casa: 'casa',
  lavoro: 'lavoro',
  centralino: 'centralino',
  altro: 'altro',
}

/**
 * L'etichetta proposta per un numero nuovo: cellulare per una persona,
 * centralino per un'azienda.
 */
export const ETICHETTA_TELEFONO_PREDEFINITA: Readonly<
  Record<ContattoTelefonico, EtichettaTelefono>
> = {
  pif: 'cellulare',
  rappresentante: 'cellulare',
  datore: 'centralino',
}

export const TIPI_ATTIVITA: Readonly<Record<TipoAttivita, string>> = {
  'docenza-di-classe': 'Docenza di classe',
  introduzione: 'Introduzione',
  spiegazione: 'Spiegazione',
  esercizio: 'Esercizio',
  laboratorio: 'Laboratorio',
  discussione: 'Discussione',
  gruppo: 'Lavoro di gruppo',
  verifica: 'Verifica',
  ripasso: 'Ripasso',
  compito: 'Compito',
  altro: 'Altro',
}

/**
 * Come lavora la classe durante una tappa. «Plenaria» per prima: è il
 * predefinito di una tappa nuova.
 */
export const RAGGRUPPAMENTI: Readonly<Record<Raggruppamento, string>> = {
  plenaria: 'Tutta la classe',
  individuale: 'Da soli',
  coppie: 'A coppie',
  gruppi: 'In gruppi',
}

/** I tipi di prova: gli stessi nel piano e nel momento vero. */
export const TIPI_VALUTAZIONE: Readonly<Record<TipoValutazione, string>> = {
  scritto: 'Scritto',
  orale: 'Orale',
  pratico: 'Pratico',
  progetto: 'Progetto',
  compito: 'Compito a casa',
  osservazione: 'Osservazione',
}

/**
 * Le chiavi di un dizionario, come elenco. I `Record<Tipo, string>` qui sotto
 * sono esaustivi per il compilatore; gli elenchi di stringhe si derivano da
 * loro invece di essere scritti a mano.
 */
export function chiaviDi<T extends string> (dizionario: Readonly<Record<T, unknown>>): T[] {
  return Object.keys(dizionario) as T[]
}

/** I tipi di osservazione sull'andamento di una persona in formazione o della classe. */
export const TIPI_OSSERVAZIONE: Readonly<Record<TipoOsservazione, string>> = {
  nota: 'Nota',
  merito: 'Merito',
  disciplina: 'Disciplina',
  compiti: 'Compiti',
  materiale: 'Materiale',
  colloquio: 'Colloquio',
}

/** Gli stati di un'ora di lezione. */
export const STATI_LEZIONE: Readonly<Record<StatoLezione, string>> = {
  pianificata: 'Pianificata',
  svolta: 'Svolta',
  annullata: 'Annullata',
}

/** I tipi di consegna. */
export const TIPI_CONSEGNA: Readonly<Record<TipoConsegna, string>> = {
  compito: 'Compito',
  studio: 'Studio',
  materiale: 'Materiale da portare',
  consegna: 'Da consegnare',
  preparazione: 'Preparazione (mia)',
  amministrativo: 'Amministrativo',
  altro: 'Altro',
}

/** Le categorie dei documenti raccolti. */
export const CATEGORIE_DOCUMENTO: Readonly<Record<CategoriaDocumento, string>> = {
  certificato: 'Certificato',
  autorizzazione: 'Autorizzazione',
  giustificazione: 'Giustificazione',
  modulo: 'Modulo',
  altro: 'Altro',
}

/** Come si chiama il foglio appeso a una prova, nel dialogo che lo chiede. */
export const RUOLI_ALLEGATO: Readonly<Record<RuoloAllegato, string>> = {
  verifica: 'Testo',
  soluzione: 'Soluzione',
  prova: 'Prova corretta',
  recupero: 'Testo del recupero',
  'recupero-soluzione': 'Soluzione del recupero',
}

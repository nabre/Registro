// Il lessico del registro: come si chiamano le cose, in un posto solo.
//
// Un registro scolastico è fatto per metà di parole, e le parole di una scuola
// non sono le stesse dappertutto: quella che qui è una «persona in formazione»
// altrove è un'allieva, uno studente, un'apprendista. Prima ognuna di queste
// parole stava scritta a mano nel punto in cui si vedeva — nelle etichette dei
// moduli, nei messaggi che il registro risponde, nelle intestazioni delle
// tabelle dei PDF, nella guida — e cambiarne una voleva dire cercarla in
// duecento posti e trovarne centonovantotto.
//
// Qui c'è l'elenco. Un termine si cambia in questa riga e cambia in tutta
// l'applicazione: schermo, stampa, posta e guida.
//
// **Come si cambia un termine.** Si tocca solo il valore fra virgolette. Le
// chiavi — `pif`, `classe`, `unitaDidattica` — sono i nomi con cui il codice
// pesca il termine e non si vedono da nessuna parte: cambiarle rompe
// l'applicazione senza cambiare una parola sullo schermo.
//
// **Il genere va tenuto giusto.** Non è un dettaglio di stile: gli articoli e
// gli accordi qui sotto nascono da lì, e «persona in formazione» femminile
// scritta maschile produce «il persona in formazione non trovato». Chi mette
// «allievo» al posto di «persona in formazione» cambia anche `genere` in `'m'`,
// e tutto il resto si riallinea da sé.
//
// **Quel che il lessico non fa.** Le frasi lunghe della guida sono scritte a
// mano, e restano nel genere in cui sono state scritte: un generatore di prosa
// italiana corretta non sta in trenta righe, e una guida sgrammaticata è peggio
// di una guida da rileggere. Cambiando un termine grande — la persona in
// formazione, la classe — la guida va riletta.

import type {
  CategoriaDocumento,
  RuoloAllegato,
  StatoLezione,
  StatoPresenza,
  TipoAttivita,
  TipoConsegna,
  TipoOsservazione,
  TipoValutazione,
} from './modelli.js'

// ------------------------------------------------------------------- i tipi

export type Genere = 'm' | 'f'

/**
 * Un nome di cosa, con quel che serve per scriverlo in una frase.
 *
 * Il plurale è scritto e non calcolato: l'italiano fa «unità didattiche» da
 * «unità didattica» e «persone in formazione» da «persona in formazione», e la
 * regola che indovina tutte e due non esiste. Scriverlo è una parola in più da
 * battere una volta sola.
 */
export interface Termine {
  readonly singolare: string
  readonly plurale: string
  readonly genere: Genere
  /**
   * La forma corta, per dove lo spazio è poco: l'intestazione di una colonna,
   * una pastiglia, una casella di griglia. Manca quando il termine è già corto,
   * e allora vale il singolare.
   */
  readonly breve?: string
}

// ------------------------------------------------------------ chi c'è dentro

/**
 * Le persone di cui il registro parla.
 *
 * «Persona in formazione» è il termine della formazione professionale — è così
 * che la legge federale chiama chi è in apprendistato, ed è così che si scrive
 * nei documenti che escono da questa scuola. «PiF» è la sua sigla, con la «i»
 * minuscola come si usa: sta nelle colonne strette, dove «persona in
 * formazione» manderebbe la tabella a capo.
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
   * legale» e non «tutore»: un tutore lo nomina un'autorità, e chiamare così un
   * genitore è sbagliato su un foglio che esce dalla scuola.
   */
  rappresentante: {
    singolare: 'rappresentante legale',
    plurale: 'rappresentanti legali',
    genere: 'm',
    breve: 'Rappr. legale',
  },
  /**
   * L'azienda dove si fa la pratica. «Formatrice» è la parola della formazione
   * professionale, e distingue l'azienda che forma da un datore di lavoro
   * qualunque.
   */
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
 * Il tempo in aula e come si misura.
 *
 * «Fascia oraria» e non «slot»: è la parola che si legge su un orario
 * scolastico, e in un registro italiano una parola inglese in mezzo alle altre
 * si nota. Era scritta in tutti e due i modi, e le due tendine dello stesso
 * modulo si chiamavano una «fascia» e una «slot».
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

// ----------------------------------------------------------------- chi c'era

/** L'appello e quel che ne esce. */
export const PRESENZE = {
  appello: { singolare: 'appello', plurale: 'appelli', genere: 'm' },
  presenza: { singolare: 'presenza', plurale: 'presenze', genere: 'f' },
  assenza: { singolare: 'assenza', plurale: 'assenze', genere: 'f' },
  ritardo: { singolare: 'ritardo', plurale: 'ritardi', genere: 'm' },
  esonero: { singolare: 'esonero', plurale: 'esoneri', genere: 'm' },
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
  documento: { singolare: 'documento', plurale: 'documenti', genere: 'm' },
  allegato: { singolare: 'allegato', plurale: 'allegati', genere: 'm' },
  fascicolo: {
    singolare: 'fascicolo di classe',
    plurale: 'fascicoli di classe',
    genere: 'm',
    breve: 'Fascicolo',
  },
  rapporto: { singolare: 'rapporto', plurale: 'rapporti', genere: 'm' },
  comunicazione: { singolare: 'comunicazione', plurale: 'comunicazioni', genere: 'f' },
  /**
   * Il messaggio di posta elettronica. «E-mail» con il trattino, sempre: il
   * registro lo scriveva «mail» in una schermata ed «e-mail» in quella accanto,
   * e la forma abbreviata su un foglio che esce dalla scuola si legge come una
   * svista.
   */
  email: { singolare: 'e-mail', plurale: 'e-mail', genere: 'f' },
  bozza: { singolare: 'bozza', plurale: 'bozze', genere: 'f' },
  /**
   * Quel che resta da chiudere, nella lista che il registro tiene per il
   * docente. «Pendenza» e non «cosa da fare» o «cosa aperta»: è una parola
   * sola, è quella dell'amministrazione — una pratica pendente è una pratica
   * aperta — e sta accanto al «in sospeso» che il registro già scrive nelle
   * righe vuote.
   */
  pendenza: { singolare: 'pendenza', plurale: 'pendenze', genere: 'f' },
  promemoria: { singolare: 'promemoria', plurale: 'promemoria', genere: 'm' },
  smistamento: { singolare: 'smistamento', plurale: 'smistamenti', genere: 'm' },
} as const satisfies Record<string, Termine>

/** Tutti i termini insieme, che è come li si pesca quasi sempre. */
export const TERMINI = {
  ...PERSONE,
  ...SCUOLA,
  ...LEZIONE,
  ...PRESENZE,
  ...VALUTAZIONE,
  ...CARTE,
} as const

export type NomeTermine = keyof typeof TERMINI

// ----------------------------------------------------- scriverli in italiano

/** La prima lettera grande, il resto com'è: «Persona in formazione». */
export function Maiuscola (testo: string): string {
  return testo ? testo[0].toUpperCase() + testo.slice(1) : testo
}

/** Il singolare con la maiuscola: il titolo di una colonna, di un pulsante. */
export function Uno (termine: Termine): string {
  return Maiuscola(termine.singolare)
}

/** Il plurale con la maiuscola: il titolo di un elenco. */
export function Molti (termine: Termine): string {
  return Maiuscola(termine.plurale)
}

/** La forma corta, o il singolare quando non ce n'è una. */
export function corto (termine: Termine): string {
  return termine.breve ?? termine.singolare
}

/**
 * «1 lezione», «3 lezioni»: il numero con la parola che gli tocca.
 *
 * Zero va al plurale, come si dice in italiano: «0 persona in formazione» non
 * l'ha scritto nessuno.
 */
export function quanti (numero: number, termine: Termine): string {
  return `${numero} ${numero === 1 ? termine.singolare : termine.plurale}`
}

/**
 * Le parole che vogliono «lo» invece di «il»: s+consonante, z, x, y, gn, pn,
 * ps, e la i che fa da semivocale («lo iodio»).
 */
const VUOLE_LO = /^(?:s[^aeiouàèéìòù]|z|x|y|gn|pn|ps|i[aeiou])/i

/** Le parole che cominciano per vocale: prendono l'apostrofo. */
const VOCALE_INIZIALE = /^[aeiouàèéìòù]/i

/**
 * L'articolo determinativo che tocca a una parola: `il`, `lo`, `l’`, `i`,
 * `gli`, `la`, `le`.
 *
 * Guarda come comincia la parola e non il termine da cui viene, perché è la
 * parola che decide: «lo studente» e «l’allievo» sono lo stesso genere e lo
 * stesso numero.
 */
export function articolo (parola: string, genere: Genere, plurale = false): string {
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
 * Le preposizioni articolate, per articolo di partenza. Sono cinque per sette e
 * si scrivono, perché la regola che le costruisce ha più eccezioni della
 * tabella.
 */
const PREPOSIZIONI = {
  di: { il: 'del', lo: 'dello', 'l’': 'dell’', i: 'dei', gli: 'degli', la: 'della', le: 'delle' },
  a: { il: 'al', lo: 'allo', 'l’': 'all’', i: 'ai', gli: 'agli', la: 'alla', le: 'alle' },
  da: { il: 'dal', lo: 'dallo', 'l’': 'dall’', i: 'dai', gli: 'dagli', la: 'dalla', le: 'dalle' },
  in: { il: 'nel', lo: 'nello', 'l’': 'nell’', i: 'nei', gli: 'negli', la: 'nella', le: 'nelle' },
  su: { il: 'sul', lo: 'sullo', 'l’': 'sull’', i: 'sui', gli: 'sugli', la: 'sulla', le: 'sulle' },
} as const satisfies Record<string, Record<string, string>>

export type Preposizione = keyof typeof PREPOSIZIONI

/**
 * Il termine con il suo articolo: «la persona in formazione», «le persone in
 * formazione», «della persona in formazione».
 *
 * La preposizione è quella che si scriverebbe davanti — `di`, `a`, `da`, `in`,
 * `su` — e senza si ha l'articolo semplice.
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
 * Un aggettivo o un participio accordato al termine: `accorda(PIF, 'trovato')`
 * dà «trovata», e al plurale «trovate».
 *
 * Si scrive sempre la forma maschile singolare, che è quella del vocabolario, e
 * la si lascia accordare qui. Vale per le due classi regolari — quella in `-o`
 * («trovato, trovata, trovati, trovate») e quella in `-e` («presente,
 * presenti») — e lascia stare tutto il resto, che in italiano è invariabile
 * («pari», «blu»): un accordo indovinato a caso su una parola irregolare
 * sarebbe un errore stampato.
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
 * «Persona in formazione non trovata.»: il termine con la maiuscola, il
 * participio accordato, e il punto.
 *
 * È la forma di mezzo messaggio di risposta del registro, e scriverla a mano
 * ogni volta era il modo in cui «Allievo non trovata» sarebbe prima o poi
 * finito su uno schermo.
 *
 * Il participio si scrive al maschile singolare e si accorda da sé; `nega`
 * mette il «non» davanti, e `coda` è quel che segue e non si accorda — «nella
 * classe», «dalla classe».
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

/**
 * I termini che si nominano di continuo, già pronti da importare. Sono i soli
 * per cui vale la pena di una scorciatoia: gli altri si pescano dal gruppo.
 */
export const PIF = PERSONE.pif
export const CLASSE = SCUOLA.classe
export const CORSO = SCUOLA.corso
export const UD = LEZIONE.unitaDidattica
export const FASCIA = LEZIONE.fascia

/**
 * Come si chiama, nel nome del file, la famiglia di fogli che il registro
 * stampa una per persona.
 *
 * Sta qui perché è una parola che si legge — è dentro il nome di ogni PDF che
 * finisce in `esportazioni/` — ma non è una parola come le altre: cambiarla
 * cambia il nome dei file da lì in avanti, e quelli già stampati restano con il
 * nome vecchio finché non si rifanno. Il registro li rifà da sé, quindi il
 * disordine dura un giro.
 */
export const DOCUMENTO_SCHEDE = `Schede ${corto(PIF)}`

/**
 * I nomi che questa famiglia di fogli ha avuto prima d'ora. Servono a
 * riconoscere i file già sul disco: una stampa vecchia va riconosciuta come
 * stampa anche dopo che la parola è cambiata, o finirebbe fra le cose caricate,
 * che sono quelle che non si cancellano mai.
 */
export const DOCUMENTO_SCHEDE_PRIMA: readonly string[] = ['Schede allievo']

// ----------------------------------------------------- le parole delle liste

/**
 * Come si chiamano le voci delle tendine e delle pastiglie.
 *
 * Erano sei elenchi in sei file — i tipi di attività in `dominio/attivita.ts`,
 * i tipi di consegna e di valutazione nei moduli, gli stati dell'appello nei
 * calcoli — e ogni elenco era un posto in cui la stessa cosa poteva chiamarsi
 * in un modo diverso da come si chiamava sul PDF. Stanno qui, e i file di prima
 * li ripubblicano nella forma che già usavano.
 */

/**
 * L'appello: la sigla che si preme e la parola che la spiega.
 *
 * Le sigle sono ASCII apposta — un carattere che il PDF non sa scrivere diventa
 * un punto interrogativo, e un appello pieno di punti interrogativi non è un
 * appello — e sono le stesse a schermo e in stampa: chi guarda il foglio
 * accanto allo schermo deve vedere la stessa cosa.
 */
export const STATI_PRESENZA: ReadonlyArray<{
  valore: StatoPresenza
  sigla: string
  nome: string
}> = [
  { valore: 'non-impostato', sigla: '-', nome: 'Non impostato' },
  { valore: 'presente', sigla: 'P', nome: 'Presente' },
  { valore: 'assente', sigla: 'X', nome: 'Assente' },
  { valore: 'ritardo', sigla: 'R', nome: 'In ritardo' },
  { valore: 'esonerato', sigla: 'E', nome: 'Esonerato' },
]

/** I tipi di attività di un piano lezione. */
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
 * I tipi di osservazione sull'andamento di una persona in formazione o della
 * classe.
 */
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

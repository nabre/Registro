// Che cosa cambia da un tipo di attività all'altro.
//
// Una tappa della scaletta non è la stessa cosa a seconda di che cosa è: un
// lavoro di gruppo ha una dimensione dei gruppi e un modo di formarli, una
// verifica ha una durata e un punteggio, un laboratorio ha una postazione e
// un'istruzione di sicurezza da dare prima di cominciare. Sono domande che
// hanno senso per un tipo solo.
//
// Mettere in fila tutti i campi di tutti i tipi renderebbe il modulo di
// un'attività una pagina di domande a cui nove volte su dieci non si risponde;
// tenerli in un testo libero vorrebbe dire non poterli né contare né mostrare.
// Qui c'è un elenco per tipo, e il modulo mostra soltanto quello che serve.
//
// Le chiavi che spariscono non portano via niente: un valore scritto sotto una
// chiave che non è più prevista resta nel file e smette di comparire. È la
// stessa prudenza con cui il registro tratta ogni altro campo — chi ha scritto
// qualcosa non deve perderla perché il programma ha cambiato idea.

import type { Attivita, TipoAttivita } from './modelli.js'

/** Come si chiede un parametro: decide il campo che compare nel modulo. */
export type TipoParametro = 'testo' | 'numero' | 'sino' | 'scelta'

export interface ParametroAttivita {
  chiave: string
  etichetta: string
  tipo: TipoParametro
  /** Solo per `scelta`: le voci ammesse. */
  opzioni?: Array<{ valore: string, testo: string }>
  segnaposto?: string
  aiuto?: string
  /** Unità di misura da mostrare accanto al numero: 'min', 'punti'. */
  unita?: string
}

/**
 * I parametri di ogni tipo di attività.
 *
 * Pochi per tipo, e solo quelli che si riempiono davvero: un elenco lungo si
 * salta, e un campo saltato è peggio di un campo che non c'è — perché chi
 * rilegge non sa se è vuoto perché non contava o perché ci si è dimenticati.
 */
export const PARAMETRI_ATTIVITA: Record<TipoAttivita, ParametroAttivita[]> = {
  // Il tempo da docente di classe non chiede il supporto o il riferimento sul
  // libro: chiede l'ordine del giorno, e se c'è qualcosa da riportare a
  // qualcuno — che è la metà del mestiere.
  'docenza-di-classe': [
    { chiave: 'ordineDelGiorno', etichetta: 'Ordine del giorno', tipo: 'testo', segnaposto: 'gita, moduli, assenze' },
    {
      chiave: 'materia',
      etichetta: 'Di che cosa si tratta',
      tipo: 'scelta',
      opzioni: [
        { valore: 'comunicazioni', testo: 'Comunicazioni' },
        { valore: 'documenti', testo: 'Documenti da raccogliere' },
        { valore: 'colloqui', testo: 'Colloqui' },
        { valore: 'organizzazione', testo: 'Organizzazione (gite, uscite)' },
        { valore: 'disciplina', testo: 'Andamento e disciplina' },
      ],
    },
    {
      chiave: 'daRiportare',
      etichetta: 'Da riportare alla sede',
      tipo: 'sino',
      aiuto: 'Se resta qualcosa da dire in segreteria o al capoclasse, resta scritto che va detto.',
    },
  ],
  introduzione: [
    { chiave: 'aggancio', etichetta: 'Aggancio', tipo: 'testo', segnaposto: 'la lezione scorsa, un esempio dal cantiere' },
  ],
  spiegazione: [
    {
      chiave: 'supporto',
      etichetta: 'Supporto',
      tipo: 'scelta',
      opzioni: [
        { valore: 'lavagna', testo: 'Lavagna' },
        { valore: 'proiezione', testo: 'Proiezione' },
        { valore: 'libro', testo: 'Libro di testo' },
        { valore: 'dispensa', testo: 'Dispensa' },
      ],
    },
    { chiave: 'riferimento', etichetta: 'Riferimento', tipo: 'testo', segnaposto: 'pagine 84–88' },
  ],
  esercizio: [
    { chiave: 'quanti', etichetta: 'Quanti', tipo: 'numero', unita: 'esercizi' },
    { chiave: 'fonte', etichetta: 'Da dove', tipo: 'testo', segnaposto: 'scheda 3, esercizi 4–7' },
    {
      chiave: 'correzione',
      etichetta: 'Correzione',
      tipo: 'scelta',
      opzioni: [
        { valore: 'in-classe', testo: 'In classe' },
        { valore: 'a-casa', testo: 'A casa' },
        { valore: 'ritirata', testo: 'Ritirata e corretta da me' },
      ],
    },
  ],
  laboratorio: [
    { chiave: 'postazione', etichetta: 'Postazione', tipo: 'testo', segnaposto: 'aula CAD, banco 1–12' },
    {
      chiave: 'sicurezza',
      etichetta: 'Istruzioni di sicurezza',
      tipo: 'sino',
      aiuto: 'Da dare prima di cominciare: se la tappa le prevede, resta scritto che vanno date.',
    },
    { chiave: 'materiale', etichetta: 'Materiale', tipo: 'testo', segnaposto: 'squadre, calibro' },
  ],
  discussione: [
    { chiave: 'traccia', etichetta: 'Traccia', tipo: 'testo', segnaposto: 'la domanda da cui si parte' },
  ],
  verifica: [
    { chiave: 'durataProva', etichetta: 'Durata della prova', tipo: 'numero', unita: 'min' },
    { chiave: 'punti', etichetta: 'Punteggio', tipo: 'numero', unita: 'punti' },
    { chiave: 'ammesso', etichetta: 'Materiale ammesso', tipo: 'testo', segnaposto: 'formulario, calcolatrice' },
  ],
  gruppo: [
    { chiave: 'dimensione', etichetta: 'Grandezza dei gruppi', tipo: 'numero', unita: 'per gruppo' },
    {
      chiave: 'composizione',
      etichetta: 'Come si formano',
      tipo: 'scelta',
      opzioni: [
        { valore: 'liberi', testo: 'A scelta loro' },
        { valore: 'sorteggio', testo: 'A sorteggio' },
        { valore: 'assegnati', testo: 'Assegnati da me' },
      ],
    },
    { chiave: 'consegna', etichetta: 'Che cosa devono produrre', tipo: 'testo', segnaposto: 'un cartellone, tre slide' },
  ],
  ripasso: [
    { chiave: 'argomenti', etichetta: 'Su che cosa', tipo: 'testo', segnaposto: 'proporzioni, percentuali' },
  ],
  compito: [
    { chiave: 'perQuando', etichetta: 'Per quando', tipo: 'testo', segnaposto: 'la prossima volta' },
    { chiave: 'tempo', etichetta: 'Tempo stimato', tipo: 'numero', unita: 'min' },
  ],
  altro: [],
}

/**
 * Come si chiama ogni tipo quando lo si legge.
 *
 * Sta qui e non nel pannello perché lo usano in tre: la tendina che lo fa
 * scegliere, le pastiglie che lo mostrano, e i rapporti stampati. Tre elenchi
 * sarebbero stati tre occasioni di chiamare la stessa cosa in tre modi, e il
 * trattino di "docenza-di-classe" sarebbe finito su un PDF.
 */
export const NOMI_TIPO_ATTIVITA: Record<TipoAttivita, string> = {
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

/** L'ordine in cui i tipi si offrono: prima quelli che si scelgono più spesso. */
export const ORDINE_TIPI: TipoAttivita[] = [
  'introduzione',
  'spiegazione',
  'esercizio',
  'laboratorio',
  'discussione',
  'gruppo',
  'verifica',
  'ripasso',
  'compito',
  'docenza-di-classe',
  'altro',
]

export function nomeTipoAttivita (tipo: TipoAttivita): string {
  return NOMI_TIPO_ATTIVITA[tipo] ?? tipo
}

export function parametriDi (tipo: TipoAttivita): ParametroAttivita[] {
  return PARAMETRI_ATTIVITA[tipo] ?? []
}

/** Il valore scritto sotto una chiave, se c'è. */
export function valoreParametro (
  attivita: Attivita,
  chiave: string,
): string | number | boolean | undefined {
  return attivita.parametri?.[chiave]
}

/**
 * I parametri di un'attività detti in una riga, per la scaletta.
 *
 * Solo quelli riempiti, e con l'etichetta davanti: «gruppi da 3 · a sorteggio»
 * si legge di sfuggita mentre si prepara l'ora, che è quando serve. I valori
 * `sì/no` compaiono soltanto quando sono sì: un elenco di cose che non ci sono
 * non aiuta nessuno.
 */
export function riassuntoParametri (attivita: Attivita): string {
  const pezzi: string[] = []
  for (const parametro of parametriDi(attivita.tipo)) {
    const valore = valoreParametro(attivita, parametro.chiave)
    if (valore === undefined || valore === '' || valore === null) continue

    if (parametro.tipo === 'sino') {
      if (valore === true) pezzi.push(parametro.etichetta.toLowerCase())
      continue
    }
    if (parametro.tipo === 'scelta') {
      const voce = parametro.opzioni?.find((o) => o.valore === String(valore))
      pezzi.push((voce?.testo ?? String(valore)).toLowerCase())
      continue
    }
    if (parametro.tipo === 'numero') {
      pezzi.push(`${parametro.etichetta.toLowerCase()} ${valore}${parametro.unita ? ` ${parametro.unita}` : ''}`)
      continue
    }
    pezzi.push(String(valore))
  }
  return pezzi.join(' · ')
}

/** Vero se questa tappa prevede una prova da valutare. */
export function attivitaValutata (attivita: Attivita): boolean {
  return attivita.valutazione !== undefined && attivita.valutazione !== null
}

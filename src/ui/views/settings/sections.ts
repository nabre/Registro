// Come le impostazioni del programma si dividono in sezioni.
// Senza DOM, così si prova: un'impostazione del manifesto finita in nessuna
// sezione non comparirebbe da nessuna parte. Per questo una sezione
// *raccoglie* quel che nessun'altra nomina.

import { Maiuscola } from '../../../domain/lexicon.js'
import { IMPOSTAZIONI } from '../../../manifest.js'
import type { VoceProgramma } from '../../../protocol.js'
import type { NomeIcona } from '../../components/icons.js'
import type { SchedaDocumento, SchedaProgramma } from '../../state.js'
import { testi } from './sections.testi.js'

// La pagina sceglie la lingua prima di caricare il resto e si ricarica quando
// cambia: le costanti del modulo nascono già nella lingua giusta.
const T = testi()

export interface SezioneProgramma {
  id: SchedaProgramma
  titolo: string
  sottotitolo: string
  /** Le chiavi che raccoglie, per prefisso. */
  prefissi: readonly string[]
  /**
   * Quel che va letto prima di toccare queste voci, quando concedono qualcosa ad
   * altri (il condotto apre i dati a ogni programma dello stesso utente).
   */
  avvertenza?: string
  /** La rete — «Generale»: raccoglie anche quel che nessuna sezione ha nominato. */
  raccoglie?: boolean
}

export const SEZIONI_PROGRAMMA: readonly SezioneProgramma[] = [
  {
    id: 'aspetto',
    // Tema, avvio, icona, promemoria e proiezione insieme: si regolano una volta.
    ...T.programma.aspetto,
    prefissi: [
      'registroDocenti.aspetto',
      'registroDocenti.avvio',
      'registroDocenti.vassoio',
      'registroDocenti.promemoria',
      'registroDocenti.proiezione',
    ],
    // È anche la rete: una chiave di un gruppo non previsto finisce qui e si
    // può regolare subito.
    raccoglie: true,
  },
  {
    id: 'posta',
    // Posta di classe e contatti con una persona sola stanno insieme, divisi dai
    // titoli di gruppo; l'id resta quello della posta, a cui portano i rimandi.
    ...T.programma.posta,
    prefissi: ['registroDocenti.posta', 'registroDocenti.recapiti'],
  },
  {
    id: 'modelli',
    // File, catalogo e «chi risponde» in testa, gli interruttori sotto.
    ...T.programma.modelli,
    prefissi: [
      'registroDocenti.modelli',
      'registroDocenti.ocr',
      'registroDocenti.assistente',
      'registroDocenti.dettatura',
    ],
  },
  {
    id: 'aggiornamenti',
    ...T.programma.aggiornamenti,
    prefissi: ['registroDocenti.aggiornamenti'],
  },
  {
    id: 'condotto',
    // Le voci che concedono ad altri programmi dello stesso utente di leggere i
    // dati e mandare posta a nome del docente: mai fra gli avanzi.
    ...T.programma.condotto,
    prefissi: ['registroDocenti.api'],
    avvertenza: T.avvertenzaCondotto,
  },
]

/**
 * Le sezioni delle impostazioni del documento d'anno: solo i nomi. Il disegno
 * lo attacca `views/settings.ts`; qui stanno a parte perché li legge anche la
 * veduta dell'assistente, senza tirarsi dietro la pagina.
 */
interface SezioneDocumento {
  id: SchedaDocumento
  titolo: string
  sottotitolo: string
}

export const SEZIONI_DOCUMENTO: readonly SezioneDocumento[] = [
  { id: 'anno', ...T.documento.anno },
  { id: 'calendario', ...T.documento.calendario },
  // I calendari esterni hanno una scheda loro (link, file, regole di riconoscimento).
  { id: 'ics', ...T.documento.ics },
  { id: 'valutazione', ...T.documento.valutazione },
  { id: 'materie', ...T.documento.materie },
  { id: 'liste', ...T.documento.liste },
  // La carta intestata sta nel documento e viaggia con lui.
  { id: 'intestazione', ...T.documento.intestazione },
  { id: 'file', ...T.documento.file },
]

/** Di chi è una sezione: dell'anno aperto, o di questo computer. */
type AmbitoSezione = 'documento' | 'programma'

/** Un gruppo tematico della colonna delle impostazioni. */
export interface GruppoSezioni {
  /** Un nome stabile: fa l'id del pulsante nella riga delle azioni. */
  id: string
  titolo: string
  simbolo: NomeIcona
  voci: ReadonlyArray<{ ambito: AmbitoSezione, id: string }>
}

/**
 * La colonna delle impostazioni, per argomento; di chi è ogni sezione (anno o
 * computer) lo dice una pastiglia accanto al nome. Ogni sezione compare una
 * volta sola: lo controlla la prova.
 */
export const GRUPPI_SEZIONI: readonly GruppoSezioni[] = [
  {
    id: 'anno',
    titolo: T.gruppi.anno,
    simbolo: 'calendario',
    voci: [
      { ambito: 'documento', id: 'anno' },
      { ambito: 'documento', id: 'calendario' },
      { ambito: 'documento', id: 'ics' },
    ],
  },
  {
    id: 'didattica',
    titolo: T.gruppi.didattica,
    simbolo: 'valutazioni',
    voci: [
      { ambito: 'documento', id: 'materie' },
      { ambito: 'documento', id: 'valutazione' },
    ],
  },
  // Le liste in un gruppo loro, accanto alla didattica: i tipi di settimana sono
  // anche dell'orario.
  {
    id: 'liste',
    titolo: T.gruppi.liste,
    simbolo: 'agenda',
    voci: [{ ambito: 'documento', id: 'liste' }],
  },
  {
    id: 'stampa',
    titolo: T.gruppi.stampa,
    simbolo: 'documento',
    voci: [
      { ambito: 'documento', id: 'intestazione' },
      { ambito: 'documento', id: 'file' },
    ],
  },
  {
    id: 'comunicazioni',
    // Lo stesso testo della sua sezione: un gruppo di una sezione sola ne porta il nome.
    titolo: T.programma.posta.titolo,
    simbolo: 'posta',
    voci: [{ ambito: 'programma', id: 'posta' }],
  },
  {
    id: 'programma',
    titolo: T.gruppi.programma,
    simbolo: 'impostazioni',
    voci: [
      { ambito: 'programma', id: 'aspetto' },
      { ambito: 'programma', id: 'aggiornamenti' },
      // Modelli linguistici e condotto stanno con il resto del programma.
      { ambito: 'programma', id: 'modelli' },
      { ambito: 'programma', id: 'condotto' },
    ],
  },
]

/** La sezione aperta, con il suo gruppo: quel che dicono la fascia, il percorso e la veduta. */
export interface SezioneAperta {
  ambito: AmbitoSezione
  id: string
  titolo: string
  gruppo: GruppoSezioni
}

/**
 * Quale sezione è aperta, dallo stato della pagina. Riceve i tre campi e non lo
 * stato intero: questo file non importa niente. Una scheda sconosciuta ricade
 * sulla prima del suo ambito.
 */
export function sezioneAperta (
  ambito: AmbitoSezione,
  schedaDocumento: string,
  schedaProgramma: string,
): SezioneAperta {
  const sezione = ambito === 'programma'
    ? SEZIONI_PROGRAMMA.find((s) => s.id === schedaProgramma) ?? SEZIONI_PROGRAMMA[0]
    : SEZIONI_DOCUMENTO.find((s) => s.id === schedaDocumento) ?? SEZIONI_DOCUMENTO[0]
  return {
    ambito,
    id: sezione.id,
    titolo: sezione.titolo,
    gruppo: gruppoDellaSezione(ambito, sezione.id),
  }
}

/**
 * Il gruppo in cui sta una sezione, quello acceso nella riga delle azioni. Una
 * sezione senza gruppo (la prova lo vieta) ricade sul primo.
 */
export function gruppoDellaSezione (ambito: AmbitoSezione, id: string): GruppoSezioni {
  return (
    GRUPPI_SEZIONI.find((gruppo) =>
      gruppo.voci.some((voce) => voce.ambito === ambito && voce.id === id),
    ) ?? GRUPPI_SEZIONI[0]
  )
}

/**
 * Le chiavi che una scheda dedicata disegna da sé, e che l'elenco generico
 * salta. Stanno qui per evitare import circolari fra la scheda e il
 * disegnatore delle righe. Le voci sono spostate, non nascoste: le disegna la
 * stessa funzione, accanto alla riga che ne spiega l'effetto.
 */
export const CHIAVI_IN_SCHEDA: Readonly<Record<string, readonly string[]>> = {
  posta: ['registroDocenti.posta.invioDiretto'],
  // Il modello si sceglie nella riga «Chi risponde» in testa alla sezione.
  modelli: [
    'registroDocenti.ocr.modello',
    'registroDocenti.ocr.proiettore',
    'registroDocenti.assistente.modello',
  ],
}

/** Se una chiave la disegna già la scheda dedicata di quella sezione. */
function disegnataDallaScheda (chiave: string, sezione: SezioneProgramma): boolean {
  return (CHIAVI_IN_SCHEDA[sezione.id] ?? []).includes(chiave)
}

/** Se una chiave appartiene a un elenco di prefissi: esatta, o puntata sotto. */
export function sottoPrefisso (chiave: string, prefissi: readonly string[]): boolean {
  return prefissi.some((prefisso) => chiave === prefisso || chiave.startsWith(`${prefisso}.`))
}

/**
 * Le voci di una sezione, nell'ordine del manifesto. Chi raccoglie prende anche
 * quelle che nessun'altra sezione nomina.
 */
export function vociDiSezione (
  voci: readonly VoceProgramma[],
  sezione: SezioneProgramma,
): VoceProgramma[] {
  const nominati = SEZIONI_PROGRAMMA.filter((altra) => !altra.raccoglie).flatMap((altra) => [
    ...altra.prefissi,
  ])
  return voci.filter(
    (voce) =>
      !disegnataDallaScheda(voce.chiave, sezione) &&
      (sezione.raccoglie
        ? sottoPrefisso(voce.chiave, sezione.prefissi) || !sottoPrefisso(voce.chiave, nominati)
        : sottoPrefisso(voce.chiave, sezione.prefissi)),
  )
}

/**
 * Tutte le voci che la sezione mostra, elenco e scheda dedicata insieme: serve
 * a chi conta («Ripristina (3)», il numero nella colonna), che altrimenti
 * salterebbe le voci della scheda. È la stessa unione della prova di copertura.
 */
export function vociMostrateDaSezione (
  voci: readonly VoceProgramma[],
  sezione: SezioneProgramma,
): VoceProgramma[] {
  const promosse = CHIAVI_IN_SCHEDA[sezione.id] ?? []
  return [
    ...vociDiSezione(voci, sezione),
    ...voci.filter((voce) => promosse.includes(voce.chiave)),
  ]
}

/**
 * I titoli dei gruppi di chiavi dove il nome della chiave non basta (molte voci
 * si chiamano «Attivo»). Un gruppo che non è qui prende il nome dal suo ultimo
 * pezzo.
 */
const TITOLI_GRUPPI: Readonly<Record<string, string>> = T.titoliGruppi

export interface GruppoVoci {
  /** `registroDocenti.posta`, o la chiave stessa quando non ha gruppo. */
  prefisso: string
  titolo: string
  voci: VoceProgramma[]
}

/** Il gruppo di una chiave: `registroDocenti.posta.mittente` → `registroDocenti.posta`. */
function gruppoDi (chiave: string): string {
  const pezzi = chiave.split('.')
  return pezzi.length > 2 ? pezzi.slice(0, -1).join('.') : chiave
}

/**
 * Le voci di una sezione divise nei loro gruppi, nell'ordine di arrivo. Solo le
 * voci comuni: le `avanzata` le dà `avanzateDiSezione`. I gruppi di una voce
 * sola con lo stesso nome li scarta chi disegna.
 */
export function gruppiDiSezione (
  voci: readonly VoceProgramma[],
  sezione: SezioneProgramma,
): GruppoVoci[] {
  return raggruppa(vociDiSezione(voci, sezione).filter((voce) => !voce.avanzata))
}

/** Le voci avanzate di una sezione, in fondo nel gruppo che si apre; non divise per gruppo. */
export function avanzateDiSezione (
  voci: readonly VoceProgramma[],
  sezione: SezioneProgramma,
): VoceProgramma[] {
  return vociDiSezione(voci, sezione).filter((voce) => voce.avanzata)
}

function raggruppa (voci: readonly VoceProgramma[]): GruppoVoci[] {
  const gruppi: GruppoVoci[] = []
  for (const voce of voci) {
    const prefisso = gruppoDi(voce.chiave)
    const gia = gruppi.find((gruppo) => gruppo.prefisso === prefisso)
    if (gia) {
      gia.voci.push(voce)
      continue
    }
    gruppi.push({
      prefisso,
      titolo: TITOLI_GRUPPI[prefisso] ?? nomeVoce(prefisso),
      voci: [voce],
    })
  }
  return gruppi
}

/**
 * Il nome di un'impostazione: `etichetta` nel manifesto, o l'ultimo pezzo della
 * chiave a parole.
 */
export function nomeVoce (chiave: string): string {
  const scritta = IMPOSTAZIONI[chiave]?.etichetta
  if (scritta) return scritta
  const ultimo = chiave.split('.').pop() ?? chiave
  const parole = ultimo.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase()
  return Maiuscola(parole)
}

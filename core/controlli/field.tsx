// Un controllo per un valore che non è una chiave del manifesto: i campi del
// documento dell'anno (la durata dell'UD, la scala dei voti, l'altezza di un
// logo). Gli stessi disegni di `Controllo` (ADR-52), con il disegno detto da
// chi chiama invece che ricavato da una `VoceProgramma`: qui non c'è un
// manifesto che dica tipo, estremi e scelte.
//
// Come `Controllo` non sa di ponti: il valore esce da `quandoCambia`, e la
// promessa che torna dice l'esito sotto il campo. Un testo vuoto vuol dire
// «rimetti com'era senza dire niente» (una domanda a cui si è risposto no).

import type { ReactElement } from 'react'

import type { VoceProgramma } from '#contract/protocol.js'
import { numero } from '#core/i18n/index.js'
import {
  Disegna,
  type Cambia,
  type Disegno,
  type Scelta,
  type ValoreCampo,
} from './control.js'

export type { ValoreCampo } from './control.js'

/** I disegni che si possono chiedere per un campo. */
type TipoCampo =
  | 'segmenti' | 'multipli' | 'tendina' | 'interruttore' | 'numero' | 'cursore' | 'testo'

/** Una scelta di un campo: il valore, il nome corto, e la frase che la spiega. */
interface SceltaCampo {
  valore: string | number
  nome: string
  aiuto?: string
}

export interface SpecCampo {
  tipo: TipoCampo
  /**
   * Il nome del campo (`name`), la chiave del fuoco e della riga dell'esito:
   * unica nella pagina, come le chiavi del manifesto.
   */
  chiave: string
  /** Il nome da leggere: diventa il nome accessibile del controllo. */
  nome: string
  valore: string | number | boolean | ReadonlyArray<string | number>
  scelte?: readonly SceltaCampo[]
  /**
   * Per una tendina: il nome dell'ultima scelta, che apre accanto un numero
   * libero (con `minimo`, `massimo`, `passo`, `unita`).
   */
  altro?: string
  minimo?: number
  massimo?: number
  /** Di quanto si muove un numero; 1 se non detto. */
  passo?: number
  /** L'unità scritta accanto al numero («min»). */
  unita?: string
  /** Per `multipli`: quante scelte restano accese al minimo, e che cosa si dice altrimenti. */
  almeno?: { quante: number, motivo: string }
  spento?: boolean
}

/** Il valore di un campo come lo tiene una voce: uno solo. */
function scalare (valore: SpecCampo['valore']): string | number | boolean {
  return Array.isArray(valore) ? '' : valore as string | number | boolean
}

/** La voce finta che i disegni leggono: nome, valore, estremi, e niente manifesto. */
function voceDi (spec: SpecCampo): VoceProgramma {
  const valore = scalare(spec.valore)
  const numerico = spec.tipo === 'numero' || spec.tipo === 'cursore' || spec.altro !== undefined
  return {
    chiave: spec.chiave,
    tipo: spec.tipo === 'interruttore' ? 'boolean' : typeof valore === 'number' ? 'number' : 'string',
    etichetta: spec.nome,
    descrizione: '',
    formato: null,
    scelte: null,
    minimo: spec.minimo ?? null,
    massimo: spec.massimo ?? null,
    passo: numerico ? spec.passo ?? 1 : null,
    unita: spec.unita ?? null,
    controllo: null,
    scelteDinamiche: null,
    sceltaLibera: false,
    predefinito: valore,
    valore,
    scritta: false,
    bloccata: null,
    nonPronta: null,
    dipendeDa: null,
    sospesa: spec.spento ?? false,
    avanzata: false,
    delCollegamento: false,
  }
}

/**
 * Le scelte da disegnare. Un segmentato o una tendina senza «Altro…» il cui
 * valore nessuna scelta porta (scritto a mano, o da un registro di prima) ne
 * prende una in più con il valore stesso: si vede com'è, invece di niente.
 */
function scelteDi (spec: SpecCampo): Scelta[] | null {
  if (!spec.scelte) return null
  const scelte: Scelta[] = spec.scelte.map((una) => ({
    valore: una.valore,
    nome: una.nome,
    aiuto: una.aiuto ?? '',
  }))
  const unico = spec.tipo === 'segmenti' || (spec.tipo === 'tendina' && spec.altro === undefined)
  const valore = scalare(spec.valore)
  if (unico && typeof valore !== 'boolean' && !scelte.some((una) => String(una.valore) === String(valore))) {
    scelte.push({
      valore,
      nome: typeof valore === 'number' ? numero(valore) : String(valore),
      aiuto: '',
    })
  }
  return scelte
}

function disegnoDi (spec: SpecCampo): Disegno {
  switch (spec.tipo) {
    case 'tendina': return spec.altro === undefined ? 'tendina' : 'altro'
    // Il cursore vuole i due estremi: senza, è un numero.
    case 'cursore': return spec.minimo !== undefined && spec.massimo !== undefined ? 'cursore' : 'numero'
    default: return spec.tipo
  }
}

/**
 * Il controllo di un campo: un `div.controllo` con il disegno chiesto e la
 * riga dell'esito sotto, come `Controllo`. `spec` può essere una funzione: si
 * legge a ogni disegno, e dopo un rifiuto il campo si rifà con quel che dice
 * adesso, che per un campo del documento è il registro, non quel che si era battuto.
 */
export function Campo ({ spec, quandoCambia, descrittoDa }: {
  spec: SpecCampo | (() => SpecCampo)
  quandoCambia: Cambia
  /** Gli id di quel che descrive il campo, per `aria-describedby`. */
  descrittoDa?: string
}): ReactElement {
  const adesso = typeof spec === 'function' ? spec() : spec
  return (
    <Disegna
      voce={voceDi(adesso)}
      scelte={scelteDi(adesso)}
      disegno={disegnoDi(adesso)}
      quandoCambia={quandoCambia}
      opzioni={{ descrittoDa }}
      aggiunte={{
        altro: adesso.altro,
        accese: Array.isArray(adesso.valore) ? adesso.valore as ReadonlyArray<string | number> : undefined,
        almeno: adesso.almeno,
      }}
    />
  )
}

/** Il valore di un campo `multipli` come arriva a `quandoCambia`. */
export function comeElenco (valore: ValoreCampo): Array<string | number> {
  return Array.isArray(valore) ? valore : []
}

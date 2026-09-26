// I modelli del linguaggio: scaricare, importare, scegliere, togliere. Non
// toccano il registro (tornano `invariato`) ma passano dalle azioni per il
// giornale (vedi `protocol.ts`).
//
// Uno scarico alla volta, per non dividere la banda; gli altri aspettano in
// una coda che vive quanto il programma, e uno caduto non la ferma.
// `llm.scarica` ritorna subito per non occupare la fila delle scritture;
// l'avanzamento va a chi si iscrive con `registraAvanzamentoScarico`, perché
// questo file non conosce i webview (`npm run layers`).

import * as apparato from 'apparato'

import { elimina as eliminaModello, importaInDisparte, scarica } from '../data/gguf.js'
import { indirizzo } from '../data/huggingFace.js'
import { pesiInUso, scaricaPesi } from '../data/llamaCpp.js'
import { modelloNellaCartella } from '../data/gguf.js'
import type { MessaggioScarico, UsoModello } from '../protocol.js'
import { conMessaggio, invariato, motivoSicuro, rifiuta, scegliFile, type Parte } from './context.js'
import { testi } from './llm.testi.js'

/**
 * Intervallo minimo fra due avanzamenti: `onProgress` arriva centinaia di
 * volte al secondo, e ognuno ridisegnerebbe il pannello. Scartarne è sicuro
 * perché `byte`/`totale` sono assoluti; quello `finito` parte sempre. Come
 * `RESPIRO_MS` in `data/kit.ts`.
 */
const RESPIRO_MS = 250

type Racconto = (avanzamento: Omit<MessaggioScarico, 'tipo'>) => void

/** Chi ascolta l'avanzamento, uno per pannello: un insieme, perché due pannelli possono sovrapporsi. */
const raccontano = new Set<Racconto>()

/** Dice a tutti quelli che ascoltano a che punto si è. */
function racconta (avanzamento: Omit<MessaggioScarico, 'tipo'>): void {
  for (const al of raccontano) al(avanzamento)
}

/** Iscrive chi ascolta l'avanzamento; il pannello chiamerà `dispose` quando si chiude. */
export function registraAvanzamentoScarico (al: Racconto): { dispose: () => void } {
  raccontano.add(al)
  return { dispose: () => { raccontano.delete(al) } }
}

/** Quel che si chiede di scaricare, più quel che serve alla fine. */
interface Richiesta {
  deposito: string
  file: string
  per?: UsoModello
  /** Che cosa lavorava per quel mestiere quando lo si è chiesto. Vedi `avvia`. */
  primaCera: string
}

/** Lo scarico in corso, se ce n'è uno. */
let inCorso: {
  deposito: string
  file: string
  ferma: AbortController
  /** L'ultimo avanzamento: serve a `raccontaCoda`, che non ne ha uno suo. */
  byte: number
  totale: number
} | null = null

/** Quel che aspetta il suo turno, nell'ordine in cui è stato chiesto. */
const coda: Richiesta[] = []

function nomiInCoda (): string[] {
  return coda.map((richiesta) => richiesta.file)
}

/** Racconta subito che la coda è cambiata, senza aspettare il prossimo avanzamento. */
function raccontaCoda (): void {
  if (!inCorso) return
  racconta({ file: inCorso.file, byte: inCorso.byte, totale: inCorso.totale, coda: nomiInCoda() })
}

/**
 * Fa partire uno scarico, non atteso, e alla fine il successivo della coda.
 * Anche i guasti arrivano alla pagina come avanzamento.
 */
function avvia (richiesta: Richiesta): void {
  const ferma = new AbortController()
  const corrente = { deposito: richiesta.deposito, file: richiesta.file, ferma, byte: 0, totale: 0 }
  inCorso = corrente
  // Subito, a zero: si vede che il turno è passato.
  racconta({ file: richiesta.file, byte: 0, totale: 0, coda: nomiInCoda() })

  // Vedi `RESPIRO_MS`.
  let ultimoRacconto = 0

  void (async () => {
    try {
      const arrivato = await scarica({
        uri: indirizzo(richiesta.deposito, richiesta.file),
        nome: richiesta.file,
        // Scritta accanto ai pesi: serve a «Riprendi» dopo una chiusura.
        sorgente: {
          deposito: richiesta.deposito,
          file: richiesta.file,
          ...(richiesta.per ? { per: richiesta.per } : {}),
        },
        segnale: ferma.signal,
        al: ({ byte, totale }) => {
          corrente.byte = byte
          corrente.totale = totale
          const adesso = Date.now()
          if (adesso - ultimoRacconto < RESPIRO_MS) return
          ultimoRacconto = adesso
          racconta({ file: richiesta.file, byte, totale, coda: nomiInCoda() })
        },
      })
      // Scaricato per un mestiere: si sceglie da sé, ma solo se nel frattempo
      // nessuno ha scelto altro (`primaCera`).
      if (richiesta.per) {
        const chiave = `${richiesta.per}.${arrivato.proiettore ? 'proiettore' : 'modello'}`
        if (scrittoOra(chiave) === richiesta.primaCera) await imposta(chiave, arrivato.nome)
      }
      racconta({
        file: richiesta.file,
        byte: arrivato.byte,
        totale: arrivato.byte,
        finito: true,
        nome: arrivato.nome,
        coda: nomiInCoda(),
      })
    } catch (guasto) {
      racconta({
        file: richiesta.file,
        byte: 0,
        totale: 0,
        finito: true,
        motivo: ferma.signal.aborted
          ? testi().scaricoFermato(richiesta.file)
          : guasto instanceof Error ? guasto.message : testi().scaricoFallito,
        coda: nomiInCoda(),
      })
    } finally {
      inCorso = null
      const prossima = coda.shift()
      if (prossima) avvia(prossima)
    }
  })()
}

/** Scrive un'impostazione `registroDocenti.*` dei modelli, una chiave per volta. */
async function imposta (chiave: string, valore: string): Promise<void> {
  await apparato.impostazioni.leggi('registroDocenti').update(chiave, valore)
}

/** Le impostazioni che nominano un file della cartella dei modelli. */
const CHIAVI_DEI_MODELLI = ['assistente.modello', 'ocr.modello', 'ocr.proiettore'] as const

/** Che cosa dice adesso un'impostazione dei modelli. */
function scrittoOra (chiave: string): string {
  return apparato.impostazioni.leggi('registroDocenti').get<string>(chiave, '')
}

export const llm = {
  /**
   * Avvia lo scarico di un modello (deposito e file di Hugging Face), o lo
   * mette in coda. Indirizzo e cartella li decidono `data/huggingFace.ts` e `data/gguf.ts`.
   */
  'llm.scarica': (_contesto, azione) => {
    // Lo stesso file due volte darebbe due file: `data/gguf.ts` non sovrascrive.
    const stesso = (r: { deposito: string, file: string }): boolean =>
      r.deposito === azione.deposito && r.file === azione.file
    if ((inCorso && stesso(inCorso)) || coda.some(stesso)) {
      return rifiuta(testi().giaInDiscesa(azione.file))
    }

    // La scelta di adesso, non di quando parte: vedi `avvia`.
    const chiavePer = azione.per
      ? `${azione.per}.${/mmproj/i.test(azione.file) ? 'proiettore' : 'modello'}`
      : ''
    const richiesta: Richiesta = {
      deposito: azione.deposito,
      file: azione.file,
      ...(azione.per ? { per: azione.per } : {}),
      primaCera: chiavePer ? scrittoOra(chiavePer) : '',
    }

    if (inCorso) {
      coda.push(richiesta)
      raccontaCoda()
      return conMessaggio(testi().inCoda(azione.file))
    }
    avvia(richiesta)
    return invariato
  },

  'llm.annulla': (_contesto, azione) => {
    // Uno in coda si toglie e basta. Così «Ferma» su una barra vecchia non
    // tocca lo scarico partito dopo.
    if (azione.file !== undefined && inCorso?.file !== azione.file) {
      const posto = coda.findIndex((r) => r.file === azione.file)
      if (posto >= 0) {
        coda.splice(posto, 1)
        raccontaCoda()
      }
      return invariato
    }
    // Si ferma quel che scende; la coda riparte da `avvia`.
    inCorso?.ferma.abort()
    return invariato
  },

  /**
   * Porta fra i modelli un file GGUF che si ha già: `data/gguf.ts` lo verifica
   * e ne mette una copia nella cartella dei modelli.
   */
  'llm.importa': async (_contesto, azione) => {
    // Senza percorso: «Carica un file…», con il dialogo di sistema.
    let file = azione.file.trim()
    if (file === '') {
      const scelti = await scegliFile({
        titolo: testi().sceltaTitolo,
        tasto: testi().sceltaTasto,
        filtri: { [testi().filtroGguf]: ['gguf'] },
      })
      // Chiuso senza scegliere: non è un errore e non si dice.
      if (!scelti) return invariato
      file = scelti[0].uri.fsPath
    }
    try {
      // Fuori dal processo principale, che resterebbe bloccato per la copia.
      const arrivato = await importaInDisparte(file)
      return conMessaggio(testi().importato(arrivato.nome))
    } catch (guasto) {
      return rifiuta(motivoSicuro(guasto, testi().nonLetto))
    }
  },

  /**
   * Toglie un modello dalla cartella. Prima si scaricano i pesi dalla memoria:
   * su Windows un file aperto non si cancella.
   */
  'llm.elimina': async (_contesto, azione) => {
    const file = modelloNellaCartella(azione.nome)
    // «In uso», non «caricato»: anche un caricamento a metà lo tiene aperto.
    if (file !== '' && pesiInUso(file)) await scaricaPesi()
    try {
      eliminaModello(azione.nome)
    } catch (guasto) {
      return rifiuta(motivoSicuro(guasto, testi().nonTolto))
    }
    // Fuori dal `try`: il file non c'è più comunque. Le scelte che lo
    // nominavano si svuotano (l'interruttore si spegne, `richiede` nel manifesto).
    for (const chiave of CHIAVI_DEI_MODELLI) {
      if (scrittoOra(chiave) === azione.nome) await imposta(chiave, '')
    }
    return conMessaggio(testi().tolto(azione.nome))
  },

  /** Dice quale modello lavora per quale mestiere; vuoto vuol dire «nessuno». */
  'llm.scegli': async (_contesto, azione) => {
    // Tutti i controlli prima di scrivere, per non lasciare una coppia a metà.
    if (azione.modello !== '' && modelloNellaCartella(azione.modello) === '') {
      return rifiuta(testi().nonScaricato(azione.modello))
    }
    const proiettore = azione.proiettore
    if (proiettore !== undefined && proiettore !== '' && modelloNellaCartella(proiettore) === '') {
      return rifiuta(testi().nonScaricato(proiettore))
    }
    // Cambiato il modello OCR senza proiettore: il vecchio `mmproj` non va con
    // i pesi nuovi, e si svuota.
    const cambiato = azione.uso === 'ocr' && azione.modello !== scrittoOra('ocr.modello')
    await imposta(`${azione.uso}.modello`, azione.modello)
    if (proiettore !== undefined) await imposta(`${azione.uso}.proiettore`, proiettore)
    else if (cambiato) await imposta('ocr.proiettore', '')
    return invariato
  },
} satisfies Parte

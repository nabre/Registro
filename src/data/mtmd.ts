// `llama-mtmd-cli`: il motore di `llm.ts` che legge le scansioni, lanciato come
// programma esterno perché `node-llama-cpp` non accetta immagini.
//
// Servono due `.gguf`, pesi e proiettore `mmproj`: senza il secondo il programma
// ignora l'immagine e inventa, quindi la sua mancanza è un impedimento. Il PNG
// passa dal disco (il programma legge solo da percorso) e si cancella sempre.

import { execFile } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { statSync } from 'node:fs'

import { daSé, programmaScaricato, scaricaCorredo } from './visionKit.js'
import type { Collegamento, Domanda, Motore } from './llm.js'
import { senzaVirgolette } from '../domain/text.js'
import { testi } from './mtmd.testi.js'

/** Dove si prende il programma, per chi non ce l'ha. */
const DA_DOVE = 'github.com/ggml-org/llama.cpp'

// ------------------------------------------------------------- la guardia

/**
 * Il percorso, se è un eseguibile ammissibile; vuoto altrimenti. Viene da un
 * JSON riscrivibile, quindi: assoluto, un file, e su Windows solo `.exe` (non
 * `.bat`/`.cmd`/`.ps1`, che passano da un interprete). L'altra metà della
 * difesa è `shell: false` con gli argomenti a vettore. Non verifica che sia
 * davvero llama-mtmd-cli.
 */
export function programmaValido (scritto: string): string {
  const pulito = senzaVirgolette(scritto)
  if (pulito === '' || !percorso.isAbsolute(pulito)) return ''
  if (process.platform === 'win32' && percorso.extname(pulito).toLowerCase() !== '.exe') return ''
  try {
    return statSync(pulito).isFile() ? pulito : ''
  } catch {
    return ''
  }
}

/**
 * Il programma da far partire: quello scritto a mano vince, lo scaricato è il
 * ripiego. Tutti e due passano dalla stessa guardia.
 */
export function programmaDa (collegamento: Collegamento): string {
  return programmaValido(collegamento.programma) || programmaValido(programmaScaricato())
}

// ------------------------------------------------------- la riga di comando

/**
 * Gli argomenti di `llama-mtmd-cli`, per un'immagine già scritta. Esportata per
 * la prova. `--temp 0` perché si leggono nomi; `-no-cnv` perché altrimenti il
 * programma resta in attesa di un'altra battuta.
 */
export function argomenti (
  collegamento: Collegamento,
  immagine: string,
  domanda: Domanda,
): string[] {
  return [
    '-m', collegamento.modello,
    '--mmproj', collegamento.proiettore,
    '--image', immagine,
    '-p', domanda.richiesta,
    '--temp', '0',
    '-no-cnv',
    ...(domanda.tettoParole ? ['-n', String(domanda.tettoParole)] : []),
  ]
}

// ------------------------------------------------------------ la ripulitura

/**
 * Il testo stampato, senza le righe di servizio che finiscono anche su stdout
 * (`main:`, `clip_…`, `mtmd_…`, righe fra parentesi quadre).
 */
export function ripulisci (uscita: string): string {
  return uscita
    .split('\n')
    .map((riga) => riga.trim())
    .filter((riga) => riga !== '')
    .filter((riga) => !/^(main|clip_[a-z_]*|mtmd_[a-z_]*|llama_[a-z_]*|encoding|decoding)\b.*:/i.test(riga))
    .filter((riga) => !/^\[[^\]]*\]$/.test(riga))
    .join('\n')
    .trim()
}

// --------------------------------------------------------------- il programma

/** Fa girare il programma sull'immagine e torna quel che ha stampato. */
async function esegui (
  collegamento: Collegamento,
  immagine: string,
  domanda: Domanda,
): Promise<string> {
  const programma = programmaDa(collegamento)
  if (programma === '') throw new Error(testi().programmaNonIndicato)
  return new Promise((risolvi, rifiuta) => {
    execFile(
      programma,
      argomenti(collegamento, immagine, domanda),
      {
        // L'attesa viene dall'impostazione: dipende dalla macchina.
        timeout: collegamento.attesaMs,
        maxBuffer: 8 * 1024 * 1024,
        windowsHide: true,
        // Niente shell, argomenti a vettore: vedi `programmaValido`.
        shell: false,
        ...(collegamento.segnale ? { signal: collegamento.segnale } : {}),
      },
      (guasto, uscita) => {
        if (!guasto) {
          risolvi(uscita)
          return
        }
        // Fermato da noi, non scaduto: `killed` è vero in tutti e due i casi.
        if (collegamento.segnale?.aborted) {
          rifiuta(new Error(testi().fermata, { cause: guasto }))
          return
        }
        // Troppa uscita, non troppo tempo: anche qui `killed` è vero.
        if ((guasto as { code?: unknown }).code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') {
          rifiuta(new Error(testi().troppaUscita, { cause: guasto }))
          return
        }
        const scaduto = (guasto as { killed?: boolean }).killed === true
        rifiuta(
          new Error(
            scaduto
              ? testi().scaduta(Math.round(collegamento.attesaMs / 1000))
              : testi().nonRiuscito(guasto.message),
            { cause: guasto },
          ),
        )
      },
    )
  })
}

// --------------------------------------------------------------- il motore

export const MTMD: Motore = {
  nome: 'llama-mtmd-cli',
  vede: true,

  impedimento: (collegamento) => {
    if (programmaDa(collegamento) === '') {
      // Manca ma si scarica da sé: non è un impedimento, perché
      // `actions/sorting.ts` rifiuterebbe la coda. Lo scarico avviene in `genera`.
      if (collegamento.programma.trim() === '' && daSé()) return ''
      return testi().senzaProgramma(DA_DOVE)
    }
    // Quel che manca è l'`mmproj`: la stessa frase di `prontezza()` a interruttore spento.
    if (collegamento.proiettore === '') return testi().senzaProiettore
    return ''
  },

  /**
   * Una pagina, letta: solo la prima immagine, come la manda `ocr.ts`. La
   * cartella temporanea nasce e muore qui dentro.
   */
  genera: async (collegamento, domanda) => {
    const png = domanda.immagini?.[0]
    if (!png) throw new Error(testi().nienteDaGuardare)
    // Programma assente: si scarica adesso. Lo scarico è condiviso, le pagine
    // in coda lo aspettano invece di rifarlo.
    if (programmaDa(collegamento) === '' && collegamento.programma.trim() === '' && daSé()) {
      await scaricaCorredo()
    }
    const cartella = mkdtempSync(percorso.join(tmpdir(), 'registro-pagina-'))
    const file = percorso.join(cartella, 'pagina.png')
    try {
      writeFileSync(file, png)
      return ripulisci(await esegui(collegamento, file, domanda))
    } finally {
      // Sempre, anche su errore o scadenza: è la scansione di un documento.
      rmSync(cartella, { recursive: true, force: true })
    }
  },
}

// `llama-mtmd-cli`: come si dà un'immagine a un modello locale, e nient'altro.
//
// È **un motore** nel senso di `llm.ts` — quello della lettura delle scansioni
// — e questo file contiene soltanto il suo dialetto: gli argomenti della sua
// riga di comando, il file che si aspetta di trovare, e la ripulitura di quel
// che stampa.
//
// ------------------------------------------------- perché un programma, e non la libreria
//
// L'assistente gira dentro il processo, con `node-llama-cpp`: nessun programma
// da installare, nessuna porta. Qui no, e la ragione è secca: **quella libreria
// non accetta immagini.** llama.cpp sa guardare — ha `libmtmd`, ha i modelli
// che vedono — ma il legame per Node espone soltanto il testo.
//
// Quindi per le scansioni si esce dal processo e si fa partire il programma che
// llama.cpp pubblica per questo: `llama-mtmd-cli`. È la stessa forma della
// dettatura, che fa partire `whisper-cli`, ed è la stessa per la stessa ragione
// — ed è anche il motivo per cui la lettura delle scansioni resta spenta finché
// qualcuno non dice dove sta quel programma. Chi non lo vuole non lo installa,
// e non gli manca niente che avesse prima.
//
// --------------------------------------------------------------- i due file
//
// Un modello che guarda sta in **due** `.gguf`: i pesi del linguaggio e
// l'`mmproj`, il proiettore, che trasforma un'immagine in qualcosa che il
// linguaggio sappia leggere. Con il solo primo, `llama-mtmd-cli` parte, ignora
// l'immagine e risponde immaginando: è il guasto peggiore di tutti, perché non
// sembra un guasto. Perciò il proiettore non è facoltativo e la sua mancanza è
// un impedimento dichiarato, non un errore che si scopre dopo tre minuti.
//
// --------------------------------------------------------------- il PNG a terra
//
// Il programma legge un'immagine **da un percorso**, non dallo standard input:
// la pagina scansionata tocca il disco per il tempo di una lettura. Dentro ci
// sono i cognomi di un foglio firmato, come in ogni altra cosa che passa di
// qui, e la cartella se ne va nel `finally` — anche quando il programma è
// andato storto, anche quando l'attesa è scaduta.
//
// --------------------------------------------------- perché questi argomenti
//
//   -m / --mmproj  i due file, vedi sopra.
//   --image        la pagina. Una per volta: un modello piccolo a cui se ne
//                  danno cinque le mescola, e quel che si vuole qui è il testo
//                  di *questa* pagina.
//   --temp 0       si legge un cognome su un foglio: un modello che varia le
//                  parole varia anche le lettere di un nome.
//   -n             un tetto alle parole prodotte. Lo porta la domanda, perché
//                  è chi chiede a sapere quanto testo si aspetta.
//   -no-cnv        niente conversazione: una domanda, una risposta, e il
//                  programma esce. Senza, resta ad aspettare che qualcuno
//                  scriva dell'altro, e quel qualcuno non c'è.

import { execFile } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { statSync } from 'node:fs'

import { daSé, programmaScaricato, scaricaCorredo } from './visionKit.js'
import type { Collegamento, Domanda, Motore } from './llm.js'
import { senzaVirgolette } from '../domain/text.js'

/** Dove si prende il programma, per chi non ce l'ha. */
const DA_DOVE = 'github.com/ggml-org/llama.cpp'

// ------------------------------------------------------------- la guardia

/**
 * Il percorso di un eseguibile, se è un percorso che si può eseguire.
 *
 * È la stessa guardia di `dictation.ts`, e c'è per la stessa ragione: il valore
 * arriva da un JSON in `userData`, cioè da un file che qualunque programma che
 * gira con lo stesso accesso può riscrivere, e quel che ci si legge dentro non
 * è un indirizzo — è **un'esecuzione**.
 *
 * Deve essere assoluto, deve essere un file, e su Windows deve finire in
 * `.exe`: non `.bat`, non `.cmd`, non `.ps1`, che non sono programmi ma righe
 * date a un interprete, ed è così che un percorso innocuo diventa l'esecuzione
 * di qualcos'altro. Il vettore di argomenti e `shell: false`, più sotto, sono
 * l'altra metà della stessa difesa.
 *
 * Quel che non si controlla, e si dice: **che l'eseguibile sia davvero
 * llama-mtmd-cli.** Non si può, non da qui: chi ha potuto riscrivere il
 * percorso ha potuto anche mettere un altro programma in quel punto del disco.
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
 * Il programma da far partire: quello scritto a mano, o quello scaricato.
 *
 * **Quel che è scritto vince**, ed è la regola dichiarata in testa a
 * `visionKit.ts`: lo scarico è il ripiego, non il padrone. Chi ha una copia
 * sua — compilata, con l'accelerazione della sua scheda — continua ad avere
 * ragione lui.
 *
 * Il ripiego passa dalla **stessa** guardia qui sopra. Un file nella cartella
 * del corredo non è più fidato di uno scelto a mano: se non è un `.exe` non si
 * esegue. Senza questa riga quella cartella sarebbe una seconda porta con un
 * controllo più largo, che è il modo in cui queste difese si perdono.
 */
export function programmaDa (collegamento: Collegamento): string {
  return programmaValido(collegamento.programma) || programmaValido(programmaScaricato())
}

// ------------------------------------------------------- la riga di comando

/**
 * Gli argomenti di `llama-mtmd-cli`, per un'immagine già scritta.
 *
 * Esportata per la prova, che guarda le due cose che non si vedono da fuori:
 * che il proiettore ci sia sempre — senza, il programma risponde immaginando —
 * e che la conversazione sia spenta, perché un programma che resta in attesa di
 * una seconda battuta scade e basta.
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
 * Il testo, da quel che il programma ha stampato.
 *
 * `llama-mtmd-cli` mescola al testo le proprie righe di servizio — quanti
 * livelli ha messo sulla scheda video, quanti token al secondo — e le scrive
 * quasi tutte sullo standard error, ma non tutte. Si tolgono le righe che sono
 * marche del programma e non parole del modello: cominciano con `main:`,
 * `clip_`, `mtmd_` o stanno fra parentesi quadre.
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
  if (programma === '') throw new Error('Il programma per leggere le scansioni non è indicato.')
  return new Promise((risolvi, rifiuta) => {
    execFile(
      programma,
      argomenti(collegamento, immagine, domanda),
      {
        // L'attesa è dell'impostazione: una pagina su una macchina senza scheda
        // video impiega più di una con, e un tetto scritto qui sarebbe
        // un'attesa mascherata da costante.
        timeout: collegamento.attesaMs,
        maxBuffer: 8 * 1024 * 1024,
        windowsHide: true,
        // Niente shell, e gli argomenti come vettore: vedi la guardia sopra.
        shell: false,
        ...(collegamento.segnale ? { signal: collegamento.segnale } : {}),
      },
      (guasto, uscita) => {
        if (!guasto) {
          risolvi(uscita)
          return
        }
        // Fermato da noi — l'applicazione che esce, lo smistamento annullato —
        // e non è una scadenza. `killed` è vero in tutti e due i casi, e senza
        // questa riga nel giornale resterebbe scritto che la lettura ci ha
        // messo troppo proprio per le pagine a cui non si è dato il tempo.
        if (collegamento.segnale?.aborted) {
          rifiuta(new Error('La lettura della scansione è stata fermata.', { cause: guasto }))
          return
        }
        const scaduto = (guasto as { killed?: boolean }).killed === true
        rifiuta(
          new Error(
            scaduto
              ? `La lettura non è finita entro ${Math.round(collegamento.attesaMs / 1000)} secondi.`
              : `llama-mtmd-cli non è riuscito a leggere la pagina: ${guasto.message}`,
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
      // Manca, ma il registro se lo prende da sé: **non è un impedimento**, e
      // dirlo qui lo sarebbe davvero. Chi chiama questa funzione non la usa per
      // informare, la usa per **fermare**: `actions/sorting.ts` rifiuta la
      // lettura quando c'è un impedimento, e una riga qui vorrebbe dire una
      // coda respinta per un file che sarebbe arrivato in venti secondi.
      // Quei venti secondi li aspetta la prima pagina, dentro `genera`.
      if (collegamento.programma.trim() === '' && daSé()) return ''
      return (
        'Per leggere le scansioni serve «llama-mtmd-cli», il programma di llama.cpp per i ' +
        `modelli che guardano: si scarica da ${DA_DOVE} e si indica nelle impostazioni, ` +
        'sotto «Lettura delle scansioni».'
      )
    }
    if (collegamento.proiettore === '') {
      return (
        'Il modello che legge le scansioni ha bisogno anche del suo proiettore — il file ' +
        '«mmproj» —, che si scarica insieme a lui dalla pagina «Modelli linguistici».'
      )
    }
    return ''
  },

  /**
   * Una pagina, letta.
   *
   * La cartella temporanea nasce e muore dentro questa funzione: fuori non
   * esiste un percorso da ricordare, e non c'è nessun caso in cui l'immagine di
   * un foglio firmato sopravviva al testo che ne è uscito.
   *
   * Una sola immagine per volta, anche quando ne arrivano più d'una: è il modo
   * in cui `ocr.ts` le manda — una pagina per domanda — e mescolarle qui
   * vorrebbe dire restituire un testo che non è di nessuna pagina.
   */
  genera: async (collegamento, domanda) => {
    const png = domanda.immagini?.[0]
    if (!png) throw new Error('Non c’è niente da guardare.')
    // Prima pagina di una macchina su cui il programma non c'è ancora: scende
    // adesso. Sta qui e non in `ocr.ts` perché è **questo** motore ad avere un
    // programma — l'assistente gira dentro il processo e non ha niente da
    // scaricare — e perché la guardia che decide che cosa si esegue è due
    // righe più su. Lo scarico è condiviso: venti pagine in coda lo aspettano,
    // non lo rifanno venti volte.
    if (programmaDa(collegamento) === '' && collegamento.programma.trim() === '' && daSé()) {
      await scaricaCorredo()
    }
    const cartella = mkdtempSync(percorso.join(tmpdir(), 'registro-pagina-'))
    const file = percorso.join(cartella, 'pagina.png')
    try {
      writeFileSync(file, png)
      return ripulisci(await esegui(collegamento, file, domanda))
    } finally {
      // Anche se è andata storta, anche se l'attesa è scaduta: quella è la
      // scansione di un documento di una classe.
      rmSync(cartella, { recursive: true, force: true })
    }
  },
}

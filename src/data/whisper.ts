// whisper.cpp: come si parla a questo programma, e nient'altro.
//
// È **un motore** nel senso di `dictation.ts` — l'unico che oggi il registro
// conosca — e questo file contiene soltanto il suo dialetto: gli argomenti
// della sua riga di comando, il formato che vuole sentirsi dare in pasto, e la
// ripulitura di quel che stampa.
//
// Quel che *non* sta qui è quel che non è di whisper.cpp: le impostazioni, il
// controllo del percorso del programma, la prontezza, le frasi che si mostrano
// a chi guarda. Stanno in `dictation.ts`, come per i modelli stanno in
// `llm.ts`. Il confine si riconosce dalla stessa regola: **se cambiando
// programma la riga cambierebbe, sta qui; se resterebbe uguale, sta di là.**
//
// ------------------------------------------------------------ il filo intero
//
//   assistant/voice.ts   microfono → PCM a 16 kHz, un canale
//        ↓  busta `Dettatura` — vedi `protocol.ts`
//   panels/transcription.ts
//        ↓
//   dictation.ts         impostazioni, guardie, silenzio
//        ↓
//   questo file          WAV temporaneo → whisper-cli → testo
//
// --------------------------------------------------------------- il formato
//
// whisper.cpp legge **WAV PCM a 16 bit, un canale, 16 kHz** e nient'altro: non
// decodifica opus, non ricampiona, e a una frequenza diversa risponde con un
// errore o con una frase che non è stata detta. Il ricampionamento lo fa la
// pagina, che ha già il motore audio del browser in mano
// (`assistant/voice.ts`); qui si scrive l'intestazione di quarantaquattro byte
// e si consegnano i campioni così come sono arrivati.
//
// Il file è **temporaneo e si cancella subito**: `whisper-cli` legge da un
// percorso e non dallo standard input, quindi la voce di chi detta tocca il
// disco per il tempo di una trascrizione. Dentro ci sono i nomi delle persone
// in formazione, come in ogni altra cosa che passa di qui, e la cartella se ne
// va nel `finally` — anche quando il programma è andato storto, anche quando
// l'attesa è scaduta.
//
// --------------------------------------------------- perché questi argomenti
//
//   -l it    la lingua è dichiarata, non indovinata. Il riconoscimento
//            automatico guarda i primi secondi e su una frase corta — «metti
//            assente Rossi» — sbaglia lingua e scrive un'altra cosa;
//            dichiarandola si risparmia anche il giro di rilevazione.
//   -nt      niente marche temporali: qui serve una frase da mettere in una
//            casella, non dei sottotitoli.
//   -np      niente stampe di servizio: quel che resta sullo standard output è
//            il testo, e la ripulitura ha una cosa sola da fare.
//   --prompt il vocabolario di scuola, che il modello altrimenti non si
//            aspetta: «giustificazione», «insufficienza», «nota disciplinare».
//            Lo compone `dictation.ts`, perché è una decisione sul registro.
//
// **Non c'è `-tr`, e non ci sarà.** È l'argomento che traduce in inglese: una
// dettatura tradotta è una frase che nessuno ha detto, scritta nel registro di
// una classe. Lo dice anche una prova, in `tests/data/dictation.test.mjs`.

import { execFile } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { cpus, tmpdir } from 'node:os'
import * as percorso from 'node:path'

import type { Collegamento, MotoreVoce, Registrazione } from './dictation.js'

/** Dove si prendono il programma e i modelli, per chi non li ha. */
const DA_DOVE = 'https://github.com/ggml-org/whisper.cpp'

/**
 * Quanti processori usare.
 *
 * Non tutti: chi detta sta usando il registro mentre whisper macina, e
 * prendersi la macchina intera per tre secondi di voce si vede come una
 * finestra che smette di rispondere. Sopra gli otto non si guadagna quasi
 * niente — il collo di bottiglia diventa la memoria — e sotto l'uno non si va.
 */
function processori (): number {
  return Math.max(1, Math.min(8, cpus().length - 2))
}

// ------------------------------------------------------------------- il WAV

/** I quarantaquattro byte davanti ai campioni, come li vuole un lettore di WAV. */
function intestazione (byteCampioni: number, frequenza: number): Uint8Array {
  const testa = new Uint8Array(44)
  const vista = new DataView(testa.buffer)
  const scrivi = (posizione: number, testo: string): void => {
    for (let i = 0; i < testo.length; i += 1) testa[posizione + i] = testo.charCodeAt(i)
  }

  scrivi(0, 'RIFF')
  vista.setUint32(4, 36 + byteCampioni, true)
  scrivi(8, 'WAVE')
  scrivi(12, 'fmt ')
  // Sedici byte di descrittore, formato 1 — PCM intero, senza compressione.
  vista.setUint32(16, 16, true)
  vista.setUint16(20, 1, true)
  vista.setUint16(22, 1, true)
  vista.setUint32(24, frequenza, true)
  // Byte al secondo e byte per campione: un canale, due byte l'uno.
  vista.setUint32(28, frequenza * 2, true)
  vista.setUint16(32, 2, true)
  vista.setUint16(34, 16, true)
  scrivi(36, 'data')
  vista.setUint32(40, byteCampioni, true)
  return testa
}

/**
 * I campioni impacchettati in un file WAV.
 *
 * Esportata per la prova: l'intestazione è quarantaquattro byte di campi
 * posizionali, ed è esattamente il genere di cosa che si scrive una volta, si
 * sbaglia di due byte e si scopre sei mesi dopo da una trascrizione che dice
 * parole a caso.
 */
export function wav (registrazione: Registrazione): Uint8Array {
  const campioni = registrazione.campioni
  const byte = campioni.length * 2
  const file = new Uint8Array(44 + byte)
  file.set(intestazione(byte, registrazione.frequenza), 0)
  file.set(new Uint8Array(campioni.buffer, campioni.byteOffset, byte), 44)
  return file
}

// ------------------------------------------------------- la riga di comando

/**
 * Gli argomenti di `whisper-cli`, per un file già scritto.
 *
 * Esportata per la prova, che guarda due cose e le guarda per sempre: che la
 * lingua sia dichiarata, e che `-tr` non ci sia mai.
 */
export function argomenti (collegamento: Collegamento, file: string): string[] {
  return [
    '-m', collegamento.modello,
    '-f', file,
    '-l', collegamento.lingua,
    '-t', String(processori()),
    '-nt',
    '-np',
    ...(collegamento.suggerimento ? ['--prompt', collegamento.suggerimento] : []),
  ]
}

// ------------------------------------------------------------ la ripulitura

/**
 * Le frasi che whisper scrive quando non ha sentito niente.
 *
 * Non sono un caso raro e non sono rumore di fondo: un modello multilingue
 * messo davanti a mezzo secondo di silenzio produce la frase più frequente nei
 * sottotitoli italiani su cui è stato addestrato, sempre quella, con la
 * sicurezza di una trascrizione vera. Finirebbe nel campo della domanda come
 * se qualcuno l'avesse detta.
 *
 * Il silenzio si ferma già prima — `dictation.ts` non manda a trascrivere una
 * registrazione muta — e questa è la seconda rete: mezzo secondo di voce
 * troppo bassa passa la prima e arriva qui.
 */
const PARASSITI: readonly RegExp[] = [
  /^sottotitoli\b.*$/i,
  /^sottotitolazione\b.*$/i,
  /^grazie per (aver guardato|la visione)\b.*$/i,
  /^iscriviti al canale\b.*$/i,
]

/**
 * Il testo, da quel che il programma ha stampato.
 *
 * Tre cose: le righe fra parentesi quadre o tonde — `[BLANK_AUDIO]`,
 * `(musica)` — che sono annotazioni e non parole dette; le frasi parassite qui
 * sopra; e gli a capo, che whisper mette ogni tanti secondi e che in una
 * casella da tre righe sono soltanto spazi storti.
 */
export function ripulisci (uscita: string): string {
  const righe = uscita
    .split('\n')
    .map((riga) => riga.trim())
    .filter((riga) => riga !== '')
    .filter((riga) => !/^[[(][^\])]*[\])]$/.test(riga))
    .filter((riga) => !PARASSITI.some((parassita) => parassita.test(riga)))
  return righe.join(' ').replace(/\s+/g, ' ').trim()
}

// --------------------------------------------------------------- il programma

/** Fa girare `whisper-cli` sul file e torna quel che ha stampato. */
async function esegui (collegamento: Collegamento, file: string): Promise<string> {
  return new Promise((risolvi, rifiuta) => {
    execFile(
      collegamento.programma,
      argomenti(collegamento, file),
      {
        // L'attesa è dell'impostazione: un modello grande su una macchina senza
        // scheda video impiega più di una registrazione corta, e un tetto
        // scritto qui sarebbe un'attesa mascherata da costante.
        timeout: collegamento.attesaMs,
        maxBuffer: 4 * 1024 * 1024,
        windowsHide: true,
        // Niente shell, e gli argomenti come vettore: il percorso del programma
        // arriva da un file di impostazioni che qualunque programma sulla
        // macchina può riscrivere, e una riga passata a `cmd` sarebbe
        // un'esecuzione di comandi regalata a chi l'ha riscritto. Che quel
        // percorso sia un eseguibile e non uno script lo controlla
        // `dictation.ts`; questa riga è l'altra metà della stessa difesa.
        shell: false,
      },
      (guasto, uscita, errori) => {
        if (!guasto) {
          risolvi(uscita)
          return
        }
        const scaduto = (guasto as { killed?: boolean }).killed === true
        rifiuta(
          new Error(
            scaduto
              ? `whisper.cpp non ha finito entro ${Math.round(collegamento.attesaMs / 1000)} secondi.`
              : `whisper.cpp non è riuscito a trascrivere: ${errori.trim() || guasto.message}`,
            { cause: guasto },
          ),
        )
      },
    )
  })
}

/**
 * Il motore, come `dictation.ts` lo vuole.
 *
 * La cartella temporanea nasce e muore dentro questa funzione: fuori non esiste
 * un percorso da ricordare, e non c'è nessun caso in cui un file di voce
 * sopravviva alla frase che ha prodotto.
 */
export const WHISPER: MotoreVoce = {
  nome: 'whisper.cpp',
  comeScaricare: (modello: string) =>
    `il modello «${percorso.basename(modello) || 'ggml-large-v3-turbo-q5_0.bin'}» e il ` +
    `programma «whisper-cli» si prendono da ${DA_DOVE}`,
  trascrivi: async (collegamento: Collegamento, registrazione: Registrazione) => {
    const cartella = mkdtempSync(percorso.join(tmpdir(), 'registro-voce-'))
    const file = percorso.join(cartella, 'dettatura.wav')
    const suono = wav(registrazione)
    try {
      writeFileSync(file, suono)
      return ripulisci(await esegui(collegamento, file))
    } finally {
      // Anche se è andata storta, anche se l'attesa è scaduta: quel file è la
      // voce di chi ha parlato del registro di una classe.
      rmSync(cartella, { recursive: true, force: true })
      // E la stessa voce che era in memoria. Il raccoglitore ci arriverebbe da
      // sé, ma non si sa quando: fra il «ho la frase» e il giro dopo, un dump
      // del processo conterrebbe ancora i cognomi appena pronunciati. Adesso
      // la dettatura è in tempo reale e di questi giri ne passa uno ogni
      // pausa, quindi è il posto giusto per non lasciarne indietro nessuno.
      suono.fill(0)
      registrazione.campioni.fill(0)
    }
  },
}

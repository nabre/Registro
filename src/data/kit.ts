// Come il registro si prende un programma da internet, e con quali guardie.
//
// Sono i pezzi che il registro **non** impacchetta e che gli servono lo stesso:
// `whisper-cli` per la dettatura, `llama-mtmd-cli` per leggere le scansioni, e
// il modello che riconosce la voce. Fino a ieri erano sette passaggi a mano
// — vai su GitHub, scegli fra dodici archivi che si chiamano quasi uguale,
// scompatta, copia il percorso nelle impostazioni — e chi insegna non li fa:
// la funzione restava spenta per chiunque non fosse già capace di farli.
//
// Qui c'è il **come**. Il **che cosa** lo dichiarano due file accanto, uno per
// funzione, e non è un'astrazione a vuoto: le guardie qui sotto sono la parte
// che non deve poter divergere fra un corredo e l'altro.
//
//   voiceKit.ts    whisper-cli + il modello ggml       → la dettatura
//   visionKit.ts   llama-mtmd-cli                      → le scansioni
//
// ------------------------------------------ che cosa è cambiato, e che cosa no
//
// In testa a `dictation.ts` e a `mtmd.ts` c'era scritto — e per anni è stato
// vero — che **il registro non installa roba**. La frase resta, perché quel che
// difendeva non è cambiato:
//
//   non installa    niente esce da queste cartelle. Nessun servizio, nessuna
//                   voce nel registro di sistema, nessun PATH toccato, niente
//                   che sopravviva alla disinstallazione. Cancellare la
//                   cartella riporta la macchina com'era.
//   non decide      chi ha già i suoi programmi continua a scrivere il percorso
//                   nelle impostazioni, e quello vince. Questo è il ripiego,
//                   non la regola.
//   non di nascosto ogni corredo ha il suo `scaricoAutomatico`, e spento torna
//                   la frase di prima con l'indirizzo da cui prenderli a mano.
//
// Quel che è cambiato è soltanto chi preme i tasti.
//
// ------------------------------------------------------------- la guardia vera
//
// Qui si scarica **un eseguibile da internet e poi lo si fa partire**, ed è la
// cosa più pericolosa che il registro faccia. La guardia non è una, sono
// quattro, e nessuna delle quattro è facoltativa:
//
//   1. **L'indirizzo è scritto nel sorgente**, per intero, dal file che
//      dichiara il pacco. Non si compone con niente che venga da fuori — non da
//      un'impostazione, non da una risposta di rete: non c'è nessuna stringa da
//      riscrivere per farlo puntare altrove.
//   2. **La versione è fissa**, mai «l'ultima»: «l'ultima» vuol dire che il
//      registro esegue ogni volta un programma diverso da quello che qualcuno
//      ha guardato, e che una release compromessa domani si propaga oggi.
//   3. **L'impronta è verificata.** SHA-256 dell'intero file, confrontato con
//      quello dichiarato, **prima** che il file prenda il nome definitivo. Un
//      byte diverso — un proxy che rimaneggia, uno specchio avvelenato, uno
//      scarico troncato — e quel che è sceso viene cancellato.
//   4. **Si estrae soltanto quel che serve**, con il nome appiattito: da un
//      archivio escono l'eseguibile e le sue librerie, passati per `basename`,
//      dentro la cartella del corredo. Una voce chiamata con delle risalite non
//      scrive da nessun'altra parte.
//
// Quel che **non** si controlla, e si dice: che quel build sia onesto. Non si
// può da qui. Si può sapere di eseguire esattamente il file la cui impronta è
// scritta nel sorgente, e che quel file viene da una release del deposito
// ufficiale — ed è il confine che questi file tengono.
//
// ------------------------------------------------------------ mezzo gigabyte
//
// Il modello della dettatura pesa 574 MB, che su una linea di scuola sono
// minuti. Perciò:
//
//   - si scrive in `nome.parziale` e si rinomina alla fine, come fa `gguf.ts`
//     con `.ipull`: finché porta quel nome, quel file non è niente;
//   - **si riprende.** Un `Range:` sul tentativo dopo riparte da dove si era
//     arrivati, perché chi ha scaricato 500 MB e ha perso la rete non deve
//     ricominciare da zero — è il punto esatto in cui si rinuncia e si spegne
//     la funzione;
//   - **si racconta**, per chi ha un modo di raccontarlo. Chi aspetta senza un
//     numero che si muove chiude il pannello convinto che si sia piantato.

import * as apparato from 'apparato'
import { createHash } from 'node:crypto'
import {
  createReadStream,
  createWriteStream,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import * as percorso from 'node:path'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import { cartellaApplicazione } from './appData.js'
import { apriZip } from './zip.js'
import { senzaVirgolette } from '../domain/text.js'

/** Come si chiama quel che sta ancora scendendo. Vedi la nota in testa. */
const IN_CORSO = '.parziale'

/**
 * Quanto si aspetta **che arrivi qualcosa**, prima di rinunciare.
 *
 * Di silenzio e non di durata, ed è la differenza fra una funzione che c'è e
 * una che non c'è. Il segnale di `AbortSignal.timeout` passato a `fetch` non
 * vale soltanto per la risposta: vale anche per il corpo che scende, e quindi
 * è un tetto alla durata dell'intero scarico. Mezzo gigabyte in trenta secondi
 * vuol dire centocinquanta megabit al secondo, che non è la linea di nessuna
 * scuola: il modello della dettatura moriva sempre allo stesso punto — alla
 * scadenza, mai alla fine.
 *
 * Perciò l'orologio è nostro e riparte a ogni pezzo che arriva: scatta quando
 * dall'altra parte non arriva più niente, che è la cosa che si voleva sapere.
 */
const ATTESA_MS = 30_000

/*
 * L'attesa si può abbassare da fuori, e serve alle prove.
 *
 * La regola da provare è «conta il silenzio, non la durata», e per provarla
 * serve uno scarico **più lungo dell'attesa**: con i trenta secondi veri quella
 * prova da sola costava trentaquattro secondi a ogni `npm test` — più di dieci
 * volte tutto il resto della suite messo insieme, cioè il genere di conto che
 * si smette di pagare smettendo di lanciare le prove. Abbassata, la stessa
 * regola si prova in due secondi e con gli stessi due casi.
 *
 * È un parametro con un predefinito, non una variabile d'ambiente: chi scarica
 * per davvero non lo passa mai, e chi legge questa firma vede subito che il
 * numero vero è quello qui sopra.
 */

/** Ogni quanto si racconta a che punto si è: più spesso sarebbe rumore. */
const RESPIRO_MS = 250

// ----------------------------------------------------------------- un pacco

/** Di che genere è il pezzo: mentre scende si chiama in un modo o nell'altro. */
export type Pezzo = 'programma' | 'modello'

/** Un file da prendere, con tutto quel che serve per fidarsene. */
export interface Pacco {
  che: Pezzo
  /** Come si chiama nella frase che chi aspetta legge. */
  titolo: string
  /** L'indirizzo, scritto per intero nel sorgente: vedi la guardia 1. */
  uri: string
  /** Il nome con cui scende nella cartella. Per un programma è un archivio. */
  archivio: string
  /** Quanto pesa, dichiarato: la barra ha un totale anche prima della risposta. */
  byte: number
  /** SHA-256 dell'intero file, in esadecimale: vedi la guardia 3. */
  impronta: string
  /** Il file che deve comparire nella cartella perché il pezzo ci sia davvero. */
  arrivo: string
  /**
   * Che cosa si tiene, quando `archivio` è un archivio.
   *
   * Assente per i pacchi che sono già il file che serve — un `.bin` di pesi
   * scende con il nome con cui si usa e non c'è niente da aprire. Presente per
   * gli altri, e sempre stretta: dentro questi archivi ci sono trenta
   * eseguibili di cui ne serve uno, e trenta eseguibili in più sul disco di una
   * scuola sono trenta eseguibili in più sul disco di una scuola.
   */
  tiene?: (nome: string) => boolean
}

/** A che punto è: lo racconta a chi sta aspettando. */
export interface Avanzamento {
  che: Pezzo
  /** Che cosa sta scendendo, in italiano: «il modello che riconosce la voce». */
  titolo: string
  byte: number
  totale: number
  /**
   * L'ultimo: il corredo è al suo posto e si comincia a lavorare.
   *
   * Serve perché fra l'ultimo byte e la prima parola c'è un salto di stato che
   * chi guarda deve vedere — una barra piena che resta piena sembra una barra
   * ferma. Non si deduce da `byte === totale`: i pacchi possono essere due, e
   * il primo ci arriva a metà dell'attesa.
   */
  finito?: boolean
}

// ---------------------------------------------------------------- la cartella

/**
 * Dove sta un corredo.
 *
 * Nei dati dell'applicazione, come i modelli del linguaggio e per la stessa
 * ragione: mezzo gigabyte dentro la cartella del materiale finirebbe nelle
 * copie, nelle sincronizzazioni e nei backup di una cartella che deve restare
 * leggera.
 *
 * L'impostazione vince, se dice un percorso assoluto. È la via di chi tiene già
 * i suoi file altrove, ed è anche quel che permette alle prove di lavorare in
 * una cartella loro invece che nei dati veri della macchina su cui girano.
 */
export function cartellaDi (chiave: string, sotto: string): string {
  const scritta = senzaVirgolette(
    apparato.impostazioni.leggi('registroDocenti').get<string>(chiave, ''),
  )
  if (scritta !== '' && percorso.isAbsolute(scritta)) return scritta
  return percorso.join(cartellaApplicazione(), sotto)
}

/** Il percorso di un file dentro una cartella, se quel file c'è davvero. */
export function nellaCartella (cartella: string, nome: string): string {
  const intero = percorso.join(cartella, nome)
  try {
    return statSync(intero).isFile() ? intero : ''
  } catch {
    return ''
  }
}

/** Se il registro deve prendersi da sé quel che manca a quella funzione. */
export function scaricoAutomatico (chiave: string): boolean {
  return apparato.impostazioni.leggi('registroDocenti').get<boolean>(chiave, true)
}

// ------------------------------------------------------------- che cosa scende

/**
 * L'impronta di un file che sta sul disco.
 *
 * A file finito e non mentre scende: con la ripresa, quel che era già sceso non
 * ripassa da qui, e un'impronta calcolata sulla sola coda direbbe il falso.
 * Mezzo gigabyte si rilegge in qualche secondo, ed è il prezzo di sapere che
 * cosa si sta per eseguire.
 */
async function impronta (file: string): Promise<string> {
  const conto = createHash('sha256')
  await pipeline(createReadStream(file), conto)
  return conto.digest('hex')
}

/** Se quel che sta sul disco è davvero quel pacco: la guardia 3, in una riga. */
async function suo (file: string, pacco: Pacco): Promise<boolean> {
  try {
    return await impronta(file) === pacco.impronta
  } catch {
    // Illeggibile è come sbagliato: si riscarica, e non si fa scoppiare una
    // dettatura per un file che stavamo per buttare comunque.
    return false
  }
}

/**
 * Dal nome provvisorio a quello vero.
 *
 * Una riga sola in tutto il file, ed è voluto: sopra questa funzione c'è un
 * file con un nome che non vuol dire niente, sotto c'è un file che il registro
 * fa partire. Chiamarla senza aver confrontato l'impronta è il modo di
 * scavalcare la guardia 3.
 */
function consegna (parziale: string, arrivo: string): string {
  rmSync(arrivo, { force: true })
  renameSync(parziale, arrivo)
  return arrivo
}

/**
 * Che cosa si dice quando l'orologio scatta, e sono due cose diverse.
 *
 * Il sito che non risponde è una cosa da riprovare più tardi; la linea che si
 * è spenta a metà scarico è una cosa da riprovare e basta, e chi legge deve
 * sapere che i megabyte già scesi restano dove sono — è il motivo per cui il
 * file parziale porta quel nome.
 */
function silenzio (pacco: Pacco, arrivato: boolean): Error {
  const secondi = Math.round(ATTESA_MS / 1000)
  return new Error(
    arrivato
      ? `Non riesco a scaricare ${pacco.titolo}: da ${secondi} secondi non arriva più niente. ` +
        'Riprova quando la connessione torna: quel che è già sceso non si riscarica.'
      : `Non riesco a scaricare ${pacco.titolo}: il sito non risponde entro ${secondi} secondi.`,
  )
}

/**
 * Prende un file e lo mette nella cartella, riprendendo se era rimasto a metà.
 *
 * Scrive in `nome.parziale` e rinomina **soltanto dopo** aver confrontato
 * l'impronta. Quel che non torna viene cancellato: un file a metà lasciato lì
 * farebbe fallire anche il tentativo dopo, che ripartirebbe da un punto che non
 * vuol dire niente.
 */
async function prendi (
  pacco: Pacco,
  cartella: string,
  al?: (avanzamento: Avanzamento) => void,
  attesaMs: number = ATTESA_MS,
): Promise<string> {
  const arrivo = percorso.join(cartella, pacco.archivio)
  const parziale = arrivo + IN_CORSO

  let già = 0
  try {
    già = statSync(parziale).size
  } catch {
    già = 0
  }
  // Già tutto, e nessuno se n'era accorto. Succede quando la connessione cade
  // — o il registro si chiude — fra l'ultimo byte e il rinomino, e prima
  // costava mezzo gigabyte riscaricato per un'interruzione a un byte dalla
  // fine. Basta fargli la stessa domanda che si fa a un file appena sceso: se
  // l'impronta è quella, è quello, e da dove venga il file non cambia niente.
  if (già === pacco.byte && await suo(parziale, pacco)) return consegna(parziale, arrivo)
  // Più di quanto il file intero misura, o tanto quanto ma con dentro
  // altro: quel che c'è non è un pezzo di questo file. Si butta, invece di
  // riprenderlo da un punto che non esiste.
  if (già >= pacco.byte) {
    rmSync(parziale, { force: true })
    già = 0
  }

  // L'orologio è nostro perché va riarmato a ogni pezzo: vedi `ATTESA_MS`.
  const fermo = new AbortController()
  let arrivato = false
  const sveglia = setTimeout(() => fermo.abort(), attesaMs)

  let sceso = già
  try {
    const risposta = await fetch(pacco.uri, {
      headers: già > 0 ? { range: `bytes=${già}-` } : {},
      signal: fermo.signal,
    }).catch((guasto: unknown) => {
      throw new Error(
        `Non riesco a scaricare ${pacco.titolo}: controlla la connessione.`,
        { cause: guasto },
      )
    })
    if (!risposta.ok || !risposta.body) {
      throw new Error(
        `Non riesco a scaricare ${pacco.titolo}: il sito risponde ${risposta.status}.`,
      )
    }
    // Il `Range` ignorato e il file da capo — succede con certi proxy: si
    // riparte da zero, invece di accodare la testa del file alla sua metà.
    const riprende = già > 0 && risposta.status === 206
    if (già > 0 && !riprende) già = 0

    sceso = già
    let ultimo = 0
    const conta = new Transform({
      transform (pezzo: Buffer, _codifica, avanti) {
        // Quel che è arrivato sposta la scadenza in avanti: è l'unica riga che
        // trasforma un tetto alla durata in un'attesa di silenzio.
        arrivato = true
        sveglia.refresh()
        sceso += pezzo.length
        const adesso = Date.now()
        if (al && adesso - ultimo >= RESPIRO_MS) {
          ultimo = adesso
          al({ che: pacco.che, titolo: pacco.titolo, byte: sceso, totale: pacco.byte })
        }
        avanti(null, pezzo)
      },
    })

    await pipeline(
      Readable.fromWeb(risposta.body as Parameters<typeof Readable.fromWeb>[0]),
      conta,
      createWriteStream(parziale, { flags: riprende ? 'a' : 'w' }),
    )
  } catch (guasto) {
    // La scadenza arriva fin qui vestita da `DOMException` che parla inglese —
    // «The operation was aborted» — o avvolta nella frase della connessione, e
    // in tutti e due i casi non dice quel che è successo. Qui si dice, e in
    // italiano come ogni altro errore di questo file.
    if (fermo.signal.aborted) throw silenzio(pacco, arrivato)
    throw guasto
  } finally {
    // Sempre: un orologio da trenta secondi lasciato acceso tiene su il ciclo
    // degli eventi, e la riga dopo è un'impronta che su mezzo gigabyte ci mette
    // dei secondi — abbastanza perché scatti su uno scarico già finito bene.
    clearTimeout(sveglia)
  }
  al?.({ che: pacco.che, titolo: pacco.titolo, byte: sceso, totale: pacco.byte })

  // La guardia 3, e sta qui e non altrove: prima del nome definitivo.
  if (!await suo(parziale, pacco)) {
    rmSync(parziale, { force: true })
    throw new Error(
      `Quel che è arrivato non è ${pacco.titolo}: l’impronta non corrisponde a quella ` +
      'attesa, e non lo tengo. Riprova, e se succede di nuovo scaricalo a mano.',
    )
  }
  return consegna(parziale, arrivo)
}

/**
 * Tira fuori dall'archivio quel che il pacco dichiara di tenere.
 *
 * Esportata per la prova, che guarda la guardia 4: i nomi passano da
 * `basename`, quindi una voce chiamata con delle risalite non scrive fuori
 * dalla cartella — e non scrive nemmeno dentro, perché non passa da `tiene`.
 *
 * Torna quanti file ne sono usciti: zero vuol dire che quell'archivio non è
 * quello che ci aspettavamo, ed è un guasto da dire invece di una cartella con
 * dentro niente.
 */
export function scompatta (
  archivio: Uint8Array,
  cartella: string,
  tiene: (nome: string) => boolean,
): number {
  let quanti = 0
  for (const voce of apriZip(archivio).voci) {
    const nome = percorso.basename(voce.nome)
    if (!tiene(nome)) continue
    writeFileSync(percorso.join(cartella, nome), voce.dati())
    quanti += 1
  }
  return quanti
}

/**
 * Scompatta di fianco, e sposta soltanto a estrazione finita.
 *
 * L'impronta verificata è quella **dell'archivio**, non di quel che ne esce: è
 * giusto così — è l'archivio che è arrivato da internet — ma vuol dire che
 * l'estrazione non ha nessuna guardia dietro di sé. Scritti dritti in cartella,
 * un disco pieno o un registro chiuso a metà ci lasciavano un `whisper-cli.exe`
 * troncato, e da quel momento era buono **per sempre**: `porta()` salta i
 * pacchi il cui file d'arrivo c'è già, e quello c'era.
 *
 * Perciò si scrive di fianco e si sposta alla fine, con i rinomini che su uno
 * stesso disco non costano niente. E il file d'arrivo si sposta **per ultimo**,
 * perché è quello a cui `porta()` guarda: finché non c'è lui, per il registro
 * quel corredo non c'è, e un'interruzione in mezzo ai rinomini si rimedia da
 * sola alla dettatura dopo.
 */
function estrai (archivio: string, cartella: string, pacco: Pacco): number {
  const tiene = pacco.tiene
  if (!tiene) return 0
  // Il pid nel nome: due registri aperti insieme sulla stessa cartella — due
  // sessioni sullo stesso computer, una cartella su un disco condiviso — non
  // devono estrarre l'uno dentro la cartella dell'altro.
  const diFianco = percorso.join(cartella, `.estrazione-${process.pid}`)
  rmSync(diFianco, { recursive: true, force: true })
  mkdirSync(diFianco, { recursive: true })
  try {
    const quanti = scompatta(readFileSync(archivio), diFianco, tiene)
    if (quanti === 0) return 0
    const usciti = readdirSync(diFianco)
    const perUltimo = (nome: string): number => (nome === pacco.arrivo ? 1 : 0)
    for (const nome of [...usciti].sort((qua, là) => perUltimo(qua) - perUltimo(là))) {
      const dove = percorso.join(cartella, nome)
      rmSync(dove, { force: true })
      renameSync(percorso.join(diFianco, nome), dove)
    }
    return quanti
  } finally {
    rmSync(diFianco, { recursive: true, force: true })
  }
}

/**
 * Gli scarichi in corso, uno per cartella.
 *
 * **Condivisi**: due pagine che chiedono la stessa cosa a un secondo di
 * distanza non scaricano mezzo gigabyte due volte, aspettano la stessa
 * promessa. È la ragione per cui `actions/llm.ts` ne tiene uno solo in corso,
 * con in più che qui nessuno ha chiesto di scaricare — ha chiesto di dettare, o
 * di leggere una pagina.
 *
 * Per cartella e non uno globale: la dettatura e le scansioni sono due funzioni
 * che non si conoscono, e far aspettare l'una perché l'altra sta prendendo i
 * suoi file sarebbe un blocco che nessuno saprebbe spiegarsi.
 */
const inCorso = new Map<string, Promise<void>>()

/**
 * Porta nella cartella quel che manca, e lo racconta mentre lo fa.
 *
 * Non solleva per quel che su questo sistema non si può prendere: chi chiama
 * dichiara in `pacchi` soltanto quel che ha senso qui, e se ne accorge perché
 * la prontezza continua a dire che manca, con dentro dove si prende a mano.
 */
export function scarica (
  cartella: string,
  pacchi: readonly Pacco[],
  al?: (avanzamento: Avanzamento) => void,
  attesaMs: number = ATTESA_MS,
): Promise<void> {
  const già = inCorso.get(cartella)
  if (già) return già
  const corsa = porta(cartella, pacchi, al, attesaMs).finally(() => {
    inCorso.delete(cartella)
  })
  inCorso.set(cartella, corsa)
  return corsa
}

/** Il lavoro vero di `scarica`, fuori dalla promessa condivisa. */
async function porta (
  cartella: string,
  pacchi: readonly Pacco[],
  al?: (avanzamento: Avanzamento) => void,
  attesaMs: number = ATTESA_MS,
): Promise<void> {
  mkdirSync(cartella, { recursive: true })

  let ultimo: Pacco | null = null
  for (const pacco of pacchi) {
    if (nellaCartella(cartella, pacco.arrivo) !== '') continue

    const sceso = await prendi(pacco, cartella, al, attesaMs)
    ultimo = pacco
    // Già al suo posto: i pesi scendono con il nome con cui si usano.
    if (!pacco.tiene) continue

    // Quel che è sceso è un archivio: se ne tira fuori l'eseguibile, e poi
    // l'archivio se ne va. Tenerlo sarebbero megabyte di niente, e il giorno in
    // cui mancasse di nuovo si riscarica in un minuto.
    try {
      const quanti = estrai(sceso, cartella, pacco)
      if (quanti === 0) throw new Error(`dentro «${pacco.archivio}» non c’è «${pacco.arrivo}»`)
    } catch (guasto) {
      throw new Error(
        `Non riesco a tirare fuori ${pacco.titolo} da quel che ho scaricato: ` +
        `${guasto instanceof Error ? guasto.message : String(guasto)}.`,
        { cause: guasto },
      )
    } finally {
      rmSync(sceso, { force: true })
    }
  }

  // Niente sceso, niente da dire: il corredo c'era già, e chi aspettava non ha
  // aspettato niente da raccontare.
  if (ultimo) {
    al?.({
      che: ultimo.che,
      titolo: ultimo.titolo,
      byte: ultimo.byte,
      totale: ultimo.byte,
      finito: true,
    })
  }
}

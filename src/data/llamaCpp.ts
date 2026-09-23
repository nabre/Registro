// llama.cpp dentro il processo: come si fa parlare un `.gguf`, e nient'altro.
//
// È **un motore** nel senso di `llm.ts` — quello dell'assistente — e questo
// file contiene soltanto il suo dialetto: come si caricano dei pesi, come si
// apre una conversazione, come si dice a un modello quali attrezzi ha in mano.
//
// Quel che *non* sta qui è quel che non è di llama.cpp: le impostazioni, quale
// modello vale per quale uso, le frasi che si mostrano a chi guarda. Stanno in
// `llm.ts`, una volta per tutti gli usi e per tutti i motori. Il confine si
// riconosce da una regola sola: **se cambiando libreria la riga cambierebbe,
// sta qui; se resterebbe uguale, sta di là.**
//
// -------------------------------------------------------- il modello resta su
//
// Caricare quattro gigabyte di pesi costa dai cinque ai trenta secondi, e non
// dipende dalla domanda: dipende dal disco. Pagarli a ogni messaggio vorrebbe
// dire un assistente che ci mette mezzo minuto a rispondere «sì», ed è il
// genere di lentezza per cui una funzione si smette di usare.
//
// Perciò il modello **resta caricato** finché non cambia, e quel che nasce e
// muore a ogni giro è il *contesto* — la memoria della conversazione, che costa
// centinaia di megabyte e si apre in un istante. Cambiare modello nelle
// impostazioni scarica il precedente: due modelli in RAM insieme sono il modo
// più veloce di far finire la memoria su una macchina da scuola.
//
// ------------------------------------------------------------- gli attrezzi
//
// Qui c'è la differenza più grossa rispetto a quando dall'altra parte c'era un
// servizio HTTP. Un servizio torna delle *richieste di chiamata* e sta a chi ha
// chiesto rimandare i risultati nel formato giusto; `node-llama-cpp` invece la
// conversazione la tiene lui, e vuole delle **funzioni** — le chiama quando
// servono, ne legge il risultato, e continua a generare.
//
// È meglio, e non solo più comodo: il formato con cui un risultato torna al
// modello cambia da famiglia a famiglia — Qwen non lo scrive come Llama, che
// non lo scrive come Mistral — e indovinarlo da fuori è esattamente il punto in
// cui un modello piccolo smette di capire che gli si sta rispondendo.
//
// Quel che **non** si lascia decidere alla libreria è *che cosa si esegue*: la
// funzione che gli attrezzi eseguono la porta chi chiama, in `Giro.esegui`, e
// là dentro vive il controllo che una procedura sia di sola lettura. Il motore
// chiama una funzione che gli è stata data; non sa che cosa faccia, e non può
// allargarla.
//
// ------------------------------------------------------------- la temperatura
//
// Zero, e non per gusto: qui si risponde su presenze e medie. Un modello che
// varia le parole varia anche le cifre, e chi vuole conversazione ha già dieci
// altri programmi.
//
// Zero però non basta, ed è una cosa che si impara leggendo la libreria e non
// il codice nostro: **quel che non si dichiara non è spento, è predefinito.**
// Senza dirlo, `repeatPenalty` punisce i token ripetuti negli ultimi
// sessantaquattro — e i token ripetuti dentro una chiamata d'attrezzo sono i
// nomi dei campi e le cifre di un identificatore; e il budget dei pensieri vale
// tre quarti del contesto, cioè abbastanza perché un modello che ragiona si
// mangi lo spazio dei dati prima ancora di chiedere il primo attrezzo. Tutti e
// due stanno scritti qui sotto accanto alla temperatura, perché un parametro
// che decide la composizione di un JSON non può restare implicito.

import type {
  Attrezzo,
  Collegamento,
  Giro,
  Motore,
} from './llm.js'
import {
  llama,
  modulo,
  type ChatHistoryItem,
  type LlamaChatSession,
  type LlamaModel,
} from './nodeLlama.js'

/**
 * Quanto contesto si apre.
 *
 * Non quello massimo del modello: un `.gguf` moderno ne dichiara 128 000 token
 * e riservarli vuol dire chiedere al sistema qualche gigabyte in più di quelli
 * dei pesi — su una macchina da scuola, quella è la differenza fra un modello
 * che parte e uno che non parte.
 *
 * Sedicimila, e non ottomila com'era: **il catalogo degli attrezzi da solo non
 * ci stava.** Le istruzioni più le ventisette procedure che l'assistente può
 * aprire, tradotte in quel che la griglia vuole, sono 8560 token misurati col
 * vocabolario di Qwen2.5 — cioè più di tutto il contesto che si apriva. Non
 * restava niente per la domanda, niente per quel che gli attrezzi leggono,
 * niente per la risposta: la conversazione moriva prima della prima chiamata,
 * con un messaggio della libreria che parla di storia che non entra e non dice
 * perché.
 *
 * Il conto adesso: 8560 di catalogo, sei-settecento di contesto della pagina, e
 * restano circa settemila token per due o tre risultati — già tagliati a
 * seimila caratteri da chi li rimanda — più la risposta. Un modello che ne
 * dichiara di meno vince lui.
 */
const CONTESTO = 16384

/**
 * Sotto quanti token non vale la pena cominciare.
 *
 * `contextSize` non è un ordine, è una trattativa: `max` vuol dire «non più di»
 * e la libreria **scende in silenzio** fino a quel che la memoria concede — nei
 * casi stretti fino a ventiquattro token. Un contesto sceso a duemila non si
 * annuncia: si scopre dopo, quando il catalogo degli attrezzi non ci entra e
 * quel che si legge è che la storia della conversazione non sta nel contesto.
 *
 * Perciò un pavimento, e dichiarato: sotto questa soglia il catalogo non entra
 * e l'assistente non può lavorare, ed **è meglio dirlo prima** — con una frase
 * che dice che cosa fare — che macinare venti secondi e morire su un messaggio
 * che parla di token.
 *
 * Dodicimila e non sedicimila: è il minimo in cui una domanda con dentro una
 * lettura sta in piedi, ed è la differenza fra una macchina che fa l'assistente
 * più lentamente e una che non lo fa.
 */
const CONTESTO_MINIMO = 12288

/**
 * Quante volte il modello può chiedere un attrezzo in un giro solo.
 *
 * Un modello piccolo che non trova quel che cerca riprova con gli stessi
 * argomenti, e lo rifarebbe finché qualcuno non lo ferma. Dieci bastano a
 * qualunque domanda vera — guarda i corsi, scegline uno, chiedine le presenze —
 * e oltre non c'è una risposta che arriva: c'è una macchina che macina.
 *
 * Il tetto gemello è `GIRI_MASSIMI` in `src/cli/registro.mjs`, e **non conta la
 * stessa cosa**: là si contano i *giri* del modello, qui le singole *chiamate*
 * d'attrezzo, e in un giro solo il modello può chiederne più d'una. I due
 * numeri coincidono per scelta, non per necessità: cambiandone uno, si guardi
 * l'altro e si decida se vale anche per lui.
 */
const CHIAMATE_MASSIME = 10

/**
 * Quante volte si lascia che il modello chieda un attrezzo *dopo* il tetto.
 *
 * Il tetto, da solo, non fermava niente: era una frase — «hai esaurito gli
 * attrezzi» — e una frase non è un freno. Un modello piccolo che la riceve
 * richiama lo stesso, e la libreria continua a ciclare finché qualcuno non
 * interviene: ogni giro a vuoto costa contesto, e il contesto che si consuma è
 * quello in cui stanno i dati appena letti. L'unico limite vero erano i
 * centoventi secondi d'attesa.
 *
 * Tre, e non uno: la frase va data una possibilità di funzionare, perché
 * quando funziona il modello conclude da sé e la risposta è migliore di quella
 * che si ottiene togliendogli gli attrezzi di mano. Al terzo rifiuto si smette
 * di sperare — vedi `CHIUSURA`.
 */
const RIFIUTI_MASSIMI = 3

/**
 * La domanda finale, quella che si fa **senza attrezzi**.
 *
 * È l'unico modo vero di fermare le chiamate: senza `functions` la griglia non
 * contempla nessuna chiamata, e il modello non può emetterne una nemmeno
 * volendo. Quel che ha letto è ancora nella storia della conversazione, perciò
 * non gli si chiede di ricominciare: gli si chiede di concludere.
 */
const CHIUSURA =
  'Basta attrezzi. Rispondi adesso, in italiano, con quel che hai già letto qui sopra, ' +
  'e di’ apertamente che cosa non sei riuscito a sapere.'

/**
 * I tetti ai token che il modello può spendere a pensare e a commentare.
 *
 * Non passandoli, la libreria concede ai pensieri il settantacinque per cento
 * del contesto: dodicimila token su sedicimila. Con un modello che ragiona —
 * Qwen3, i distillati di R1, e nella cartella dei modelli si può trascinare
 * qualunque `.gguf` — un solo giro di pensiero può prendersi tutto lo spazio e
 * far cominciare lo sfoltimento del contesto **prima della prima chiamata**.
 *
 * Cinquecentododici e duecentocinquantasei sono sobri di proposito: con la
 * temperatura a zero e un compito che è leggere e riferire, il pensiero lungo
 * non porta niente e costa il contesto dei dati.
 */
const PENSIERO_MASSIMO = 512
const COMMENTO_MASSIMO = 256

/**
 * Il `pattern` con cui `api/schemas.ts` scrive una data.
 *
 * Sta qui perché è l'unico `pattern` del catalogo — tutti e quindici quelli
 * offerti all'assistente sono questo — e perché la griglia una data la sa
 * scrivere, purché gliela si chieda con il suo nome: `format: 'date'`. Vedi
 * `perGriglia`.
 */
const DATA_ISO = '^\\d{4}-\\d{2}-\\d{2}$'

// --------------------------------------------------------- i pesi, una volta

/**
 * Dei pesi in memoria: da che file vengono, come sono caricati, e **quante
 * domande li stanno usando in questo momento**.
 *
 * `strati` dice com'è caricato adesso, non che abbia funzionato: quel che ha
 * funzionato lo dice `ultimoBuono`.
 *
 * `utenti` è il campo che non c'era, e la sua mancanza era un guasto vero.
 * Quattro gigabyte si smaltiscono in un colpo — `dispose()` — e fin qui niente
 * di male, se non fosse che una domanda all'assistente **salta la coda delle
 * scritture**: può essere viva mentre qualcuno cancella quel modello dalla
 * pagina, o mentre un'altra domanda cambia gli strati e ricarica. Smaltire dei
 * pesi sotto chi li sta usando non è un rallentamento, è un processo che cade.
 * Perciò si contano gli utenti e si smaltisce a zero: vedi `smaltisci`.
 */
interface Pesi {
  file: string
  modello: LlamaModel
  strati: Strati
  /** Quante domande li stanno usando adesso. Vedi `presta` e `molla`. */
  utenti: number
  /** Chi aspetta che l'ultimo molli per portarli via. Vedi `smaltisci`. */
  congedo: (() => void) | null
}

/** I pesi in memoria adesso, o `null` se nessuno. */
let caricato: Pesi | null = null

/**
 * L'ultimo gradino da cui si è davvero aperto un contesto, e per quale file.
 *
 * Due campi e non uno, e la ragione è un guasto vero. `apparecchia` diceva di
 * ripartire «da quello dell'ultima volta che ha funzionato» e ripartiva invece
 * da `caricato.strati`, che è tutt'altro: `pesi()` lo scrive **al
 * caricamento**, prima di sapere se il contesto si aprirà. Dopo un fallimento
 * totale — scesi fino a zero strati, contesto negato lo stesso — restava
 * `caricato.strati === 0`, e da lì la macchina non risaliva mai: chiuso il
 * programma che si era preso la memoria video, l'assistente continuava a
 * macinare tutto sul processore finché qualcuno non riavviava il registro.
 *
 * Perciò questo campo si scrive in un punto solo — dopo un `apri()` riuscito —
 * e quando è vuoto si riparte dall'alto.
 */
let ultimoBuono: { file: string, strati: Strati } | null = null

/**
 * Quanti strati del modello vanno sulla scheda video.
 *
 * `'quel che ci sta'` lascia decidere alla libreria, dicendole però quanto
 * contesto servirà dopo; un numero è un ordine, e `0` vuol dire tutto sul
 * processore.
 */
type Strati = 'quel che ci sta' | number

/**
 * I caricamenti in volo, uno per `(file, strati)`.
 *
 * **Condivisi**, come gli scarichi in `kit.ts` e per un guasto della stessa
 * famiglia. `pesi()` era un guarda-e-poi-agisci con un `await` in mezzo: il
 * riquadro dell'assistente e la sua finestra staccata possono chiedere insieme
 * — `panels/conversation.ts` tiene più giri vivi —, tutt'e due vedevano
 * `caricato` vuoto, tutt'e due caricavano quattro gigabyte, e la seconda
 * assegnazione copriva la prima. I gigabyte della prima non si liberavano più:
 * nessuno aveva più un riferimento da cui smaltirli.
 *
 * La chiave tiene dentro anche gli strati perché due richieste con strati
 * diversi sono due caricamenti diversi, e accodare l'una all'altra vorrebbe
 * dire dare a una domanda dei pesi che non sono quelli che ha chiesto.
 */
const inVolo = new Map<string, Promise<Pesi>>()

/** Un altro che li sta usando: fino a che non molla, non si smaltiscono. */
function presta (quali: Pesi): Pesi {
  quali.utenti += 1
  return quali
}

/**
 * Finita: se era l'ultimo e qualcuno aspettava per portarli via, si fa avanti.
 */
function molla (quali: Pesi): void {
  quali.utenti -= 1
  if (quali.utenti > 0 || !quali.congedo) return
  const aspetta = quali.congedo
  quali.congedo = null
  aspetta()
}

/**
 * Porta via dei pesi, aspettando che l'ultima domanda che li usa abbia finito.
 *
 * Aspetta e non rifiuta, perché chi chiama non ha un ripiego: chi cancella un
 * modello dalla pagina vuole che quel file se ne vada, e un «riprova fra poco»
 * vorrebbe dire scaricare su chi insegna un'attesa che il registro sa fare da
 * sé. L'attesa è limitata da sola: una domanda ha la sua scadenza, e quando
 * scade molla.
 */
async function smaltisci (quali: Pesi): Promise<void> {
  if (quali.utenti > 0) {
    await new Promise<void>((liberi) => {
      quali.congedo = liberi
    })
  }
  await quali.modello.dispose().catch(() => {
    // Smaltire dei pesi non può far fallire né una domanda né una
    // cancellazione: se la libreria non ci riesce, il peggio è che la memoria
    // si libera più tardi.
  })
}

/**
 * Il modello di quel file, caricandolo se non è già quello o se la volta scorsa
 * si era chiesto troppo alla scheda video.
 *
 * Il file arriva da `Collegamento.modello`, che `llm.ts` ha già risolto dentro
 * la cartella dei modelli: qui non si controlla un percorso, perché qui non
 * arriva un percorso scelto da qualcun altro.
 *
 * Quel che torna è **in prestito**: chi lo prende lo deve mollare quando ha
 * finito, e finché non lo molla quei gigabyte non se ne vanno da sotto.
 */
async function pesi (file: string, strati: Strati, segnale: AbortSignal): Promise<Pesi> {
  // Già lì e sono quelli giusti: ci si mette in fila e non si carica niente.
  // `congedo` pieno vuol dire che qualcuno li sta già portando via, e allora
  // non sono più quelli giusti per nessuno.
  if (caricato?.file === file && caricato.strati === strati && !caricato.congedo) {
    return presta(caricato)
  }
  const chiave = `${String(strati)}\u0000${file}`
  let corsa = inVolo.get(chiave)
  if (!corsa) {
    corsa = carica(file, strati, segnale).finally(() => {
      inVolo.delete(chiave)
    })
    inVolo.set(chiave, corsa)
  }
  // Il prestito si segna **dopo** l'attesa e non dentro `carica`: chi si è
  // accodato alla promessa di un altro è un utente in più, e senza questa riga
  // il secondo giro lavorerebbe su dei pesi che il primo può portare via.
  return presta(await corsa)
}

/** Il caricamento vero, fuori dalla promessa condivisa. */
async function carica (file: string, strati: Strati, segnale: AbortSignal): Promise<Pesi> {
  if (caricato) {
    // Prima di caricare il nuovo: due modelli insieme in memoria sono il modo
    // più veloce di finirla. Vale anche quando il file è lo stesso e cambiano
    // soltanto gli strati — quel che si vuole liberare è la memoria video che
    // il caricamento di prima si era preso.
    const vecchio = caricato
    caricato = null
    await smaltisci(vecchio)
  }
  const motore = await llama()
  const modello = await motore.loadModel({
    modelPath: file,
    gpuLayers: strati === 'quel che ci sta' ? { fitContext: { contextSize: CONTESTO } } : strati,
    // Il segnale arriva fin qui, e non è un dettaglio: quattro gigabyte di
    // pesi da un disco lento sono trenta secondi, `apparecchia` può rifarli
    // fino a cinque volte scendendo di gradino, e senza questa riga niente di
    // tutto quello era né contato nell'attesa né interrompibile. Chi annullava
    // restava a guardare una barra che girava.
    loadSignal: segnale,
  })
  caricato = { file, modello, strati, utenti: 0, congedo: null }
  return caricato
}

/**
 * Il modello e il suo contesto, scendendo verso la memoria di sistema finché
 * non ci stanno tutti e due.
 *
 * ------------------------------------------------ perché non basta chiederlo bene
 *
 * Dire alla libreria quanto contesto servirà — `fitContext` — le fa fermare gli
 * strati prima di riempire la scheda. Funziona quando la memoria video è quella
 * che sembra, e **non basta quando non lo è**: la conta si fa al caricamento, e
 * fra il caricamento e l'apertura del contesto c'è un'altra applicazione che
 * prende quel che era libero. Su una scheda da otto gigabyte con un modello da
 * quattro e mezzo, basta un secondo programma che ne voglia due perché il
 * contesto non entri più.
 *
 * Il ripiego è quello ovvio e va detto perché non è automatico: **i pesi che
 * non stanno sulla scheda stanno nella memoria di sistema**, che su qualunque
 * macchina è più abbondante. Si scende di gradino — metà degli strati, poi
 * nessuno — ricaricando i pesi e riprovando ad aprire il contesto. Si paga in
 * velocità, perché gli strati rimasti fuori li macina il processore, e si
 * guadagna una conversazione che arriva in fondo invece di un guasto.
 *
 * Il contesto non si accorcia mai, ed è la scelta che questa funzione difende:
 * un contesto corto non si annuncia, si scopre a metà risposta quando il
 * catalogo degli attrezzi non ci sta. Meglio un assistente più lento di un
 * assistente che risponde male.
 *
 * L'ultimo gradino è tutto sul processore: se non basta nemmeno quello, il
 * modello è troppo grosso per questa macchina, ed è una cosa da dire — la
 * dice `apri`, con dentro che cosa fare.
 */
async function apparecchia (
  file: string,
  segnale: AbortSignal,
): Promise<{ presi: Pesi, contesto: Contesto }> {
  // Il gradino di partenza è quello dell'ultima volta **che ha aperto un
  // contesto**, e non quello a cui i pesi stanno adesso: senza il primo, una
  // macchina stretta ricaricherebbe i pesi due volte a ogni domanda; senza la
  // distinzione, una macchina che ha fallito una volta resterebbe in fondo per
  // sempre. Vedi `ultimoBuono`.
  let strati: Strati = ultimoBuono?.file === file ? ultimoBuono.strati : 'quel che ci sta'
  for (;;) {
    const presi = await pesi(file, strati, segnale)
    try {
      const contesto = await apri(presi.modello, segnale)
      ultimoBuono = { file, strati }
      console.log(
        `[llama.cpp] contesto aperto: ${contesto.contextSize} token dei ${CONTESTO} chiesti, ` +
        `${strati === 'quel che ci sta' ? 'strati sulla scheda decisi dalla libreria' : `${strati} strati sulla scheda`}.`,
      )
      // Il prestito resta aperto: lo chiude chi ha chiesto, quando ha finito
      // di parlare. Vedi `molla` e il `finally` di `chatta`.
      return { presi, contesto }
    } catch (guasto) {
      // Il gradino non ha aperto niente: questi pesi non servono più a questa
      // domanda, e trattenerli impedirebbe al gradino sotto di ricaricarli.
      molla(presi)
      // Chi ha annullato, o l'attesa che è scaduta, non vuole un gradino più
      // in basso: vuole smettere. Senza questa riga si scenderebbe fino a zero
      // ricaricando i pesi a ogni giro, dopo che la domanda è già morta.
      if (segnale.aborted) throw guasto
      const sotto = piùGiù(strati, presi.modello.gpuLayers)
      if (sotto === null) throw guasto
      strati = sotto
    }
  }
}

/**
 * Il gradino sotto quello che non è bastato, o `null` se si è già in fondo.
 *
 * Si dimezza invece di togliere uno strato per volta: ogni gradino costa un
 * caricamento di pesi — secondi, non millisecondi — e scendere di uno alla
 * volta su un modello da ventotto strati vorrebbe dire ventotto caricamenti
 * per arrivare dove due ne bastano.
 */
function piùGiù (strati: Strati, quantiNeAveva: number): Strati | null {
  const ora = strati === 'quel che ci sta' ? quantiNeAveva : strati
  if (ora <= 0) return null
  return Math.floor(ora / 2)
}

/**
 * Scarica quel che è in memoria.
 *
 * La chiama chi cancella un modello dalla cartella: su Windows un file aperto
 * non si cancella, e un `.gguf` caricato è un file aperto. Senza questa riga,
 * «Elimina» sul modello in uso risponderebbe che il file è occupato da un altro
 * programma — e quell'altro programma saremmo noi.
 */
export async function scaricaPesi (): Promise<void> {
  // Prima i caricamenti in volo, e non è pignoleria: chi cancella un modello
  // mentre una domanda lo sta aprendo troverebbe `caricato` ancora vuoto, non
  // smaltirebbe niente, e mezzo secondo dopo quel file sarebbe aperto da noi —
  // cioè non cancellabile, con «Elimina» che dà la colpa a un altro programma.
  await Promise.allSettled([...inVolo.values()])
  if (!caricato) return
  const vecchio = caricato
  caricato = null
  // Anche il gradino buono se ne va: chi chiama questa funzione sta cancellando
  // quel file, e se domani ne arriva un altro con lo stesso nome ripartire da
  // un numero deciso per i pesi di prima non vorrebbe dire niente.
  if (ultimoBuono?.file === vecchio.file) ultimoBuono = null
  // Aspetta chi sta ancora parlando: una domanda all'assistente salta la coda
  // delle scritture, quindi può benissimo essere viva adesso. Vedi `smaltisci`.
  await smaltisci(vecchio)
}

/** Quale modello è caricato adesso, per chi deve deciderlo. Vuoto se nessuno. */
export function pesiCaricati (): string {
  return caricato?.file ?? ''
}

// ------------------------------------------------------- lo schema per la griglia

/**
 * Lo schema di un attrezzo, nella forma che la griglia accetta.
 *
 * `node-llama-cpp` non si fida del modello per la forma degli argomenti: si
 * costruisce una **griglia** — una grammatica — che durante la generazione
 * lascia passare soltanto i token che formano un JSON di quella forma. È il
 * motivo per cui qui non serve districare stringhe che JSON non sono: non
 * possono nascere.
 *
 * Il prezzo è che la griglia conosce un sottoinsieme di JSON Schema, e quel che
 * `api/schemas.ts` stampa è JSON Schema intero — `pattern`, `minLength`,
 * `examples`, e i nullabili scritti `type: ["string", "null"]`. Quel che la
 * griglia non sa leggere non si butta e non si passa com'è: **si traduce in
 * quel che sa leggere**, e quel che non ha traduzione sparisce.
 *
 * Quel che ha una traduzione, però, va tradotto, e per un pezzo qui dentro non
 * si faceva: si buttavano tre cose che la griglia sa leggere benissimo.
 *
 *   — `pattern: '^\d{4}-\d{2}-\d{2}$'` è `format: 'date'`, e sono tutti e
 *     quindici i `pattern` del catalogo offerto. Tradotto, una data storta
 *     diventa **impossibile da generare** invece che rifiutata dopo — e la
 *     libreria, per i campi obbligatori, la annuncia pure al modello.
 *   — `minLength`/`maxLength` sulle stringhe e `minItems`/`maxItems` sugli
 *     elenchi: la griglia li conosce, e un identificatore lungo al massimo
 *     sessantaquattro caratteri è un identificatore che non si inventa lungo.
 *   — `examples` non ha una casella sua, ma ha un posto: si ricopia **dentro
 *     la `description`**, perché la descrizione è l'unico campo che sopravvive
 *     a tutte le traduzioni, compreso l'incarto dei facoltativi.
 *
 * `description` è la cosa che conta di più: è l'`aiuto:` scritto sulla
 * procedura, cioè l'unica frase con cui il modello capisce che cosa mettere in
 * un campo. E sopravvive sempre, ma questo è vero da poco: per i campi
 * facoltativi la frase finiva **dentro** il ramo dell'incarto `oneOf`, e il
 * generatore della libreria la `description` la legge solo sulla proprietà —
 * del ramo si limita a unire i tipi con una barra. Risultato misurato:
 * centoquindici proprietà su centoventotto dei ventisette attrezzi offerti
 * arrivavano al modello come `dal: null | string` e nient'altro. Sparivano
 * frasi come «Senza, dall'inizio dell'anno» e «Quante righe al massimo: da 1 a
 * 500. Senza, 50», ed era il novanta per cento della documentazione scritta a
 * mano sulle procedure. Adesso la frase sta sull'incarto, che è l'unico posto
 * in cui verrebbe letta.
 *
 * Esportata per la prova, e non per comodità: è una traduzione fra due
 * dialetti di JSON Schema, e una traduzione sbagliata non si vede — si vede un
 * modello che smette di riempire un campo, o che lo riempie sempre con la
 * stessa cosa, mesi dopo e senza che niente sia cambiato.
 */
/**
 * La frase da mettere sul campo, con dentro gli esempi che lo spiegavano.
 *
 * `examples` la griglia non ce l'ha, e buttarli era buttare sessantasette
 * esempi scritti a mano — per i campi facoltativi, buttati insieme alla frase
 * che li accompagnava. Ricopiati qui dentro sopravvivono, perché la
 * `description` sopravvive sempre.
 *
 * Solo numeri e stringhe: un esempio che è un oggetto, stampato dentro una
 * frase, diventa rumore che il modello legge come istruzione.
 *
 * E non si ricopia quel che la griglia dice già meglio: dove c'è un `format`,
 * la libreria scrive da sé «format: date» accanto al campo **e** rende il
 * valore storto impossibile da generare. Un «(es. 2026-09-21)» in coda alla
 * frase sarebbe la terza copia della stessa regola, pagata in contesto su una
 * finestra che il catalogo riempie già per metà.
 */
function spiegazione (dentro: Record<string, unknown>): { description?: string } {
  const detto = typeof dentro.description === 'string' ? dentro.description : ''
  // Il `pattern` della data, non il `format`: qui si guarda lo schema **prima**
  // della traduzione, e il `format` nasce di là.
  if (dentro.pattern === DATA_ISO) return detto === '' ? {} : { description: detto }
  const esempi = Array.isArray(dentro.examples)
    ? (dentro.examples as unknown[])
        .filter((e) => typeof e === 'string' || typeof e === 'number')
        .map((e) => String(e))
    : []
  if (esempi.length === 0) return detto === '' ? {} : { description: detto }
  const coda = `(es. ${esempi.join(', ')})`
  return { description: detto === '' ? coda : `${detto} ${coda}` }
}

/**
 * Le due misure di un campo, se ci sono e se sono numeri.
 *
 * Una sola funzione per le lunghezze delle stringhe e per le dimensioni degli
 * elenchi perché è la stessa domanda fatta a due forme, e la griglia le legge
 * tutte e quattro. Quel che arriva storto — una misura scritta come testo — si
 * lascia fuori invece di farla cadere: uno schema rifiutato non si vede, si
 * vede un attrezzo che non viene più offerto.
 */
function quanti (
  dentro: Record<string, unknown>,
  minimo: string,
  massimo: string,
): Record<string, number> {
  const misure: Record<string, number> = {}
  for (const chiave of [minimo, massimo]) {
    const quanto = dentro[chiave]
    if (typeof quanto !== 'number' || !Number.isFinite(quanto)) continue
    // `minLength: 1` non si scrive: dice soltanto «non vuoto», e a quello ci
    // arrivano già due cose prima della griglia — `senzaFiltriVuoti` toglie i
    // campi facoltativi lasciati a stringa vuota, e il nucleo rifiuta i
    // richiesti con una frase che nomina il campo. Sono trentacinque volte
    // quattordici caratteri di catalogo, cioè mezzo migliaio, su una finestra
    // che il catalogo riempie già per metà.
    //
    // `minItems: 1` invece **si scrive**, e non è la stessa cosa: un elenco
    // vuoto è una cosa che un modello genera volentieri, la griglia sa
    // impedirlo, e impedirlo costa tredici caratteri su tre attrezzi. Quel che
    // non si può generare non va rifiutato dopo.
    if (chiave === minimo && minimo === 'minLength' && quanto <= 1) continue
    misure[chiave] = quanto
  }
  return misure
}

export function perGriglia (schema: unknown): Record<string, unknown> {
  if (typeof schema !== 'object' || schema === null || Array.isArray(schema)) {
    return { type: 'string' }
  }
  const dentro = schema as Record<string, unknown>
  const nota = spiegazione(dentro)

  if (Array.isArray(dentro.enum)) return { ...nota, enum: dentro.enum as unknown[] }

  // `type: ["string", "null"]` — come `schemaJson` scrive un nullabile — diventa
  // la scelta fra due forme, che è come la griglia esprime la stessa cosa.
  if (Array.isArray(dentro.type)) {
    return {
      ...nota,
      oneOf: (dentro.type as string[]).map((tipo) => perGriglia({ ...dentro, type: tipo })),
    }
  }

  switch (dentro.type) {
    case 'object': {
      const proprietà = (dentro.properties ?? {}) as Record<string, unknown>
      const obbligatori = Array.isArray(dentro.required) ? (dentro.required as string[]) : []
      const tradotte: Record<string, unknown> = {}
      for (const [nome, forma] of Object.entries(proprietà)) {
        const tradotta = perGriglia(forma)
        // Quel che non è obbligatorio si offre come «oppure niente», e non si
        // toglie dall'elenco: la griglia esige tutte le proprietà che dichiara,
        // e un campo tolto è un campo che il modello non può più riempire.
        //
        // La frase va **sull'incarto**, non dentro il ramo: è l'unico posto in
        // cui il generatore della libreria va a leggerla, e finché stava di là
        // nessun campo facoltativo arrivava al modello con la sua spiegazione.
        // `GbnfJsonOneOfSchema` una `description` la ammette: è dichiarata nei
        // suoi tipi accanto a `oneOf`.
        // E va **solo** di là: lasciarla anche dentro il ramo la scriverebbe
        // due volte in un catalogo che si misura a caratteri, e la seconda
        // copia non la legge nessuno.
        const { description: frase, ...ramo } = tradotta
        const sua = typeof frase === 'string' ? { description: frase } : {}
        tradotte[nome] = obbligatori.includes(nome)
          ? tradotta
          : { ...sua, oneOf: [{ type: 'null' }, ramo] }
      }
      return { ...nota, type: 'object', properties: tradotte }
    }
    case 'array':
      return {
        ...nota,
        type: 'array',
        items: perGriglia(dentro.items),
        ...quanti(dentro, 'minItems', 'maxItems'),
      }
    case 'string':
      // Una data si chiede con il suo nome. Le due misure di lunghezza valgono
      // per tutto il resto, e non insieme al formato: nei tipi della libreria
      // una stringa **o** ha un `format` **o** ha una lunghezza, mai tutti e
      // due, e qui nel catalogo non c'è un campo che li voglia entrambi.
      if (dentro.pattern === DATA_ISO) return { ...nota, type: 'string', format: 'date' }
      return { ...nota, type: 'string', ...quanti(dentro, 'minLength', 'maxLength') }
    case 'number':
    case 'integer':
    case 'boolean':
    case 'null':
      return { ...nota, type: dentro.type }
    default:
      // `qualunque`: una forma senza `type`. La griglia vuole qualcosa, e del
      // testo è la cosa che un modello sa sempre produrre.
      return { ...nota, type: 'string' }
  }
}

// ----------------------------------------------------------------- il giro

/** L'ultima cosa che ha detto chi scrive, e tutto quel che c'era prima. */
function dividi (battute: readonly { ruolo: string, testo: string }[]): {
  istruzioni: string
  precedenti: { ruolo: string, testo: string }[]
  domanda: string
} {
  const istruzioni = battute.filter((b) => b.ruolo === 'sistema').map((b) => b.testo).join('\n\n')
  const conversazione = battute.filter((b) => b.ruolo !== 'sistema')
  const ultima = conversazione.at(-1)
  return {
    istruzioni,
    precedenti: ultima?.ruolo === 'utente' ? conversazione.slice(0, -1) : conversazione,
    domanda: ultima?.ruolo === 'utente' ? ultima.testo : '',
  }
}

/**
 * Una domanda al modello, con tutto quel che non si lascia implicito.
 *
 * Una funzione e non due righe ripetute perché le domande sono due — quella
 * vera e la chiusura senza attrezzi — e le impostazioni del campionamento
 * devono essere le stesse in tutte e due. Vedi in testa al file, «la
 * temperatura».
 *
 * `promptWithMeta` e non `prompt`: costa uguale e torna anche *perché* si è
 * fermata. `stopOnAbortSignal` fa sì che un annullo torni quel che c'era
 * invece di far saltare la conversazione, e chi chiama guarda i segnali per
 * sapere di chi era l'annullo.
 */
async function chiedi (
  sessione: LlamaChatSession,
  testo: string,
  segnale: AbortSignal,
  attrezzi: Record<string, unknown> | undefined,
): Promise<{ responseText: string, stopReason: string }> {
  return sessione.promptWithMeta(testo, {
    ...(attrezzi ? { functions: attrezzi as never } : {}),
    temperature: 0,
    // Non dichiararlo non voleva dire spento: voleva dire `lastTokens: 64` su
    // quel che il modello ha appena generato. Dentro una chiamata d'attrezzo i
    // token che si ripetono sono i nomi dei campi e le cifre di un
    // identificatore, e penalizzarli sposta il campionamento su un id diverso
    // da quello giusto. In fase di attrezzi si spegne, e basta.
    repeatPenalty: false,
    budgets: { thoughtTokens: PENSIERO_MASSIMO, commentTokens: COMMENTO_MASSIMO },
    signal: segnale,
    stopOnAbortSignal: true,
  })
}

/**
 * Che cosa si dice quando l'attesa è finita.
 *
 * `AbortSignal.timeout()` aborta con una `DOMException` che dice «The operation
 * was aborted due to timeout», e quella frase arrivava fino in fondo: `conMotivo`
 * chiede `prontezza()`, che risponde «pronto» — perché tutto *è* a posto — e
 * rilancia il guasto tale e quale. Finiva dentro la conversazione, in inglese,
 * nel registro di una scuola italiana.
 *
 * La frase qui sotto è fatta come quella di `mtmd.ts` per la stessa cosa: dice
 * i secondi, e dice le ragioni plausibili, perché chi legge deve poter scegliere
 * se riscrivere la domanda o cambiare modello.
 *
 * E dice **dove il tempo se n'è andato**, che è la metà che mancava. Da quando
 * il cronometro parte prima di `apparecchia` — giusto, perché prima quei minuti
 * non erano né contati né interrompibili — dentro l'attesa c'è anche il
 * caricamento dei pesi, che su un disco lento sono decine di secondi e che
 * `apparecchia` può ripetere scendendo di gradino. Dare la colpa alla lunghezza
 * della domanda quando la domanda non è stata nemmeno letta manda chi legge a
 * riscriverla, cioè a rifare l'unica cosa che non c'entra.
 */
function scaduta (collegamento: Collegamento, prontoDopoMs: number | null): Error {
  const secondi = Math.round(collegamento.attesaMs / 1000)
  const modelloPiùPiccolo =
    'si rimedia scegliendone uno più piccolo nella pagina «Modelli linguistici».'

  if (prontoDopoMs === null) {
    return new Error(
      `Il modello non è riuscito nemmeno a caricarsi entro ${secondi} secondi: la domanda ` +
      `non è stata letta. È grosso per questa macchina, o il disco è lento — ${modelloPiùPiccolo}`,
    )
  }

  // Il caricamento ha un'attesa sua, quindi non ha tolto tempo alla risposta —
  // ma se è stato lento è il segno che quei pesi sono tanti per questa macchina,
  // e allora lenta sarà stata anche la generazione. Dirlo indirizza al rimedio
  // giusto, che non è riscrivere la domanda.
  const caricamento = Math.round(prontoDopoMs / 1000)
  if (prontoDopoMs * 2 > collegamento.attesaMs) {
    return new Error(
      `Il modello ci ha messo ${caricamento} secondi solo a caricarsi, e poi non ha finito ` +
      `di rispondere entro altri ${secondi}. Per questa macchina è grosso: ${modelloPiùPiccolo}`,
    )
  }

  return new Error(
    `Il modello non ha finito di rispondere entro ${secondi} secondi. Può essere che la ` +
    'domanda fosse lunga, oppure che questo modello sia grosso per questa macchina: si ' +
    'rimedia chiedendo meno cose insieme, o scegliendone uno più piccolo nella pagina ' +
    '«Modelli linguistici».',
  )
}

/**
 * Quante chiamate restano, quante ne ha chieste in più, e il freno.
 *
 * Un oggetto e non tre variabili perché lo condividono due posti: il manico di
 * ogni attrezzo, che consuma e conta, e `chatta`, che dopo deve sapere com'è
 * andata per decidere se chiudere senza attrezzi.
 */
interface Budget {
  rimaste: number
  rifiuti: number
  freno: AbortController
}

/**
 * Le funzioni che il modello può chiamare, costruite dagli attrezzi.
 *
 * Il budget è condiviso da tutte: è un giro solo, e il tetto vale per il giro.
 * Toccato il tetto si **risponde al modello** che ha finito gli attrezzi, che
 * è la cosa che lo fa concludere con quel che ha invece di riprovare — quando
 * funziona. Quando non funziona, al terzo rifiuto si tira il freno: vedi
 * `RIFIUTI_MASSIMI` e `CHIUSURA`.
 */
async function funzioni (
  attrezzi: readonly Attrezzo[],
  giro: Giro,
  budget: Budget,
): Promise<Record<string, unknown>> {
  const { defineChatSessionFunction } = await modulo()
  const tavolo: Record<string, unknown> = {}

  for (const attrezzo of attrezzi) {
    tavolo[attrezzo.nome] = defineChatSessionFunction({
      description: attrezzo.descrizione,
      params: perGriglia(attrezzo.ingresso) as never,
      handler: async (argomenti: unknown) => {
        if (budget.rimaste <= 0) {
          budget.rifiuti += 1
          if (budget.rifiuti >= RIFIUTI_MASSIMI) budget.freno.abort()
          // Anche una chiamata rifiutata si racconta, marcata per quel che è.
          // Tacerla lascerebbe chi guarda davanti a una barra ferma e a una
          // risposta che arriva: e una risposta scritta con metà delle letture
          // è una cosa diversa da una scritta con tutte.
          giro.al?.({ attrezzo: attrezzo.nome, esaurito: true })
          return (
            'Hai esaurito gli attrezzi per questa domanda. Rispondi adesso con quel che hai ' +
            'letto, e di’ apertamente che cosa non sei riuscito a sapere.'
          )
        }
        budget.rimaste -= 1
        giro.al?.({ attrezzo: attrezzo.nome })
        if (!giro.esegui) return 'Errore: qui non c’è niente che possa eseguire gli attrezzi.'
        try {
          return await giro.esegui({ nome: attrezzo.nome, argomenti })
        } catch (guasto) {
          // `Giro.esegui` promette di non sollevare mai, e la promessa è
          // scritta in due posti — nel suo contratto e nella docstring di
          // `usaAttrezzo`. Sollevare però **può**: `impagina()`, un
          // `JSON.stringify` su un ciclo o su un `BigInt`, `schemaJson()`, un
          // guasto del disco. E qui una promessa non mantenuta non costava una
          // chiamata: costava la domanda intera. La libreria, se il manico
          // rifiuta, annulla tutto e rilancia — verificato in
          // `LlamaChatSession.js` — e chi aveva chiesto le assenze di una
          // classe si vedeva morire la conversazione per un attrezzo su dieci.
          //
          // Un errore raccontato al modello è invece una cosa da cui si esce:
          // cambia attrezzo, o dice che quel dato non l'ha.
          return `Errore: ${guasto instanceof Error ? guasto.message : String(guasto)}`
        }
      },
    })
  }
  return tavolo
}

// ---------------------------------------------------------------- il contesto

/** Quel che `createContext` torna: la libreria non ne esporta il nome da qui. */
type Contesto = Awaited<ReturnType<LlamaModel['createContext']>>

/**
 * Il contesto della conversazione, o un guasto che dice che cosa fare.
 *
 * Due numeri e non uno. `max` è quel che si vorrebbe; `min` è quel che serve
 * perché la domanda abbia un senso — e senza il secondo la libreria **scende
 * da sé**, senza dirlo, fino a un contesto in cui il catalogo degli attrezzi
 * non entra. Quel che si legge dopo, allora, è che la storia della
 * conversazione non sta nel contesto: una frase vera che indica il posto
 * sbagliato, perché la storia non c'entra — è il catalogo che non ci sta.
 *
 * Il pavimento si abbassa fino a quel che il modello dichiara: un `.gguf` da
 * quattromila token non è rotto, è piccolo, e chiedergliene dodicimila
 * fallirebbe sempre e per un motivo che non è quello vero. Quel che succede
 * dopo — il catalogo che non entra in quattromila — lo dice la libreria, e a
 * quel punto lo dice giustamente.
 *
 * Il guasto della memoria si traduce qui e non in `llm.ts`: là si sa che cosa
 * manca *nelle impostazioni* — l'assistente spento, il modello mai scaricato —
 * e questa è un'altra cosa. C'è tutto, ed è la macchina a non bastare: chi
 * legge deve sapere che il rimedio è un modello più piccolo o un programma
 * chiuso, non un'impostazione da cambiare.
 *
 * Chi la chiama è `apparecchia`, che il guasto lo prende e **riprova più in
 * basso**, con meno strati sulla scheda video. La frase qui sotto si legge
 * soltanto quando anche l'ultimo gradino — tutto nella memoria di sistema — non
 * è bastato: allora non è una questione di dove stanno i pesi, è che il modello
 * è troppo grosso per questa macchina.
 */
async function apri (modello: LlamaModel, segnale: AbortSignal): Promise<Contesto> {
  const pavimento = Math.min(CONTESTO_MINIMO, modello.trainContextSize)
  try {
    return await modello.createContext({
      contextSize: { min: pavimento, max: CONTESTO },
      // Come per i pesi: aprire centinaia di megabyte di contesto è tempo, e
      // il tempo di chi aspetta è uno solo.
      createSignal: segnale,
    })
  } catch (guasto) {
    throw new Error(
      'Non c’è abbastanza memoria per far ragionare questo modello: gli servono ' +
      `${pavimento} token di contesto e la macchina non li concede, né sulla scheda video ` +
      'né nella memoria di sistema. Si rimedia scegliendo un modello più piccolo nella ' +
      'pagina «Modelli linguistici», oppure chiudendo i programmi che stanno occupando la ' +
      'memoria.',
      { cause: guasto },
    )
  }
}

// ------------------------------------------------- quando il contesto si riempie

/**
 * Che cosa si scrive al posto di un risultato che non c'entra più.
 *
 * Un risultato tolto in silenzio è la cosa peggiore: il modello non sa di aver
 * perso qualcosa e risponde «non ho trovato niente» su dati che ha letto venti
 * secondi prima. Un segnaposto invece è un'istruzione: dice che c'era, perché
 * non c'è più, e che si può richiedere.
 */
function segnaposto (nome: string): string {
  return (
    `[Il risultato di «${nome}» è stato tolto da qui per far posto: il contesto era pieno. ` +
    'Se ti serve ancora, richiama quell’attrezzo.]'
  )
}

/**
 * La storia della conversazione accorciata **senza buttare le letture**.
 *
 * ------------------------------------------------------ che cosa faceva la libreria
 *
 * Quando il contesto si riempie, `node-llama-cpp` sfoltisce da sé, e la
 * strategia predefinita — `eraseFirstResponseAndKeepFirstSystem` — butta **per
 * prime** le chiamate d'attrezzo complete di risultato, e conserva la battuta
 * di sistema. Nel suo mondo è ragionevole: le istruzioni sono la cosa che
 * definisce il comportamento. Nel nostro è esattamente il contrario di quel che
 * serve. Il modello continua a sapere *come* comportarsi e smette di sapere
 * *che cosa ha letto*, e questo è un assistente che risponde «non ho trovato»
 * su una classe di cui aveva appena contato le assenze.
 *
 * --------------------------------------------------------------- che cosa si fa qui
 *
 * Si tolgono prima i pensieri già chiusi — sono ballast, il modello li ha già
 * usati — e poi, dalle letture più vecchie verso le più recenti, si sostituisce
 * il **risultato** con un segnaposto, lasciando in piedi la chiamata: il
 * modello continua a vedere che quella lettura l'ha fatta e con quali
 * argomenti, e legge che può rifarla.
 *
 * ------------------------------------------------------ perché il conto è approssimato
 *
 * La libreria misura se la storia ci sta mettendoci dentro anche il catalogo
 * degli attrezzi — ottomilacinquecento token — ma alla strategia il catalogo
 * non lo passa: `generateContextState` di qui dentro lo vede senza. Il conto
 * si ricava: lo sfoltimento comincia appena la storia sfora, quindi il
 * catalogo è all'incirca la differenza fra il tetto e quel che si misura
 * adesso. Sopra ci va un margine del cinque per cento, perché sbagliare in
 * difetto vuol dire non tagliare abbastanza.
 *
 * E se il conto è sbagliato lo stesso non si rompe niente: la libreria
 * ricontrolla quel che torna di qui e, se non ci sta, **usa la sua strategia**
 * con un avviso in console. Il peggio che può capitare è tornare a com'era.
 */
function sfoltisci (
  storia: readonly ChatHistoryItem[],
  tetto: number,
  misura: (storia: ChatHistoryItem[]) => number,
): ChatHistoryItem[] {
  // Copia fino alle risposte: quel che arriva è la storia vera della sessione,
  // e mutarla vorrebbe dire riscrivere la conversazione della libreria sotto i
  // suoi piedi.
  const copia: ChatHistoryItem[] = storia.map((voce) =>
    voce.type === 'model' ? { ...voce, response: [...voce.response] } : voce)

  const catalogo = Math.max(0, tetto - misura(copia))
  const bersaglio = Math.max(1, tetto - catalogo - Math.ceil(tetto / 20))

  for (const voce of copia) {
    if (voce.type !== 'model') continue
    const senzaPensieri = voce.response.filter(
      (pezzo) => typeof pezzo === 'string' || pezzo.type !== 'segment' || !pezzo.ended,
    )
    if (senzaPensieri.length !== voce.response.length) voce.response = senzaPensieri
  }

  // Si misura una volta, e poi **solo dopo aver sostituito qualcosa**: `misura`
  // tokenizza la storia intera, e chiamarla a ogni giro anche quando il pezzo
  // non è una chiamata voleva dire ritokenizzare tutto una volta per pezzo. Su
  // una conversazione lunga — che è l'unica in cui si sfoltisce — erano decine
  // di passate inutili dentro i secondi che restavano per rispondere.
  let quanto = misura(copia)
  for (const voce of copia) {
    if (voce.type !== 'model') continue
    for (let i = 0; i < voce.response.length; i += 1) {
      if (quanto <= bersaglio) return copia
      const pezzo = voce.response[i]
      if (typeof pezzo === 'string' || pezzo.type !== 'functionCall') continue
      voce.response[i] = { ...pezzo, result: segnaposto(pezzo.name) }
      quanto = misura(copia)
    }
  }
  return copia
}

// --------------------------------------------------------------- il motore

export const LLAMA_CPP: Motore = {
  nome: 'llama.cpp',

  // Non vede, e non è una versione indietro: `node-llama-cpp` non ha un modo di
  // passare un'immagine. Chi deve guardare una scansione usa `mtmd.ts`, ed è
  // `llm.ts` a saperlo — non chi chiede.
  vede: false,

  // Niente da procurarsi: la libreria viaggia dentro il programma e il modello
  // sta nella cartella, cosa che `llm.ts` ha già controllato prima di arrivare
  // qui.
  impedimento: () => '',

  chatta: async (collegamento, giro) => {
    const { LlamaChatSession } = await modulo()
    const { istruzioni, precedenti, domanda } = dividi(giro.battute)
    if (domanda === '') {
      // Prima si chiamava `prompt('')` lo stesso, e un modello a cui non si
      // chiede niente risponde qualcosa: un saluto, una domanda, l'ultima cosa
      // che gli era rimasta in mente. Finiva nel registro come risposta. Che
      // l'ultima battuta sia di chi scrive è un'assunzione di questo motore, e
      // un'assunzione o si dichiara o prima o poi si smentisce da sola.
      throw new Error(
        'Non c’è niente da chiedere: l’ultima battuta della conversazione non è di chi scrive.',
      )
    }

    // **Due attese, non una.** Il caricamento dei pesi ne ha una sua e la
    // risposta ne ha un'altra, che parte quando i pesi sono pronti.
    //
    // Per un pezzo ce n'è stata una sola, e prima ancora nessuna: l'attesa
    // copriva soltanto la generazione, e `apparecchia` poteva ricaricare i pesi
    // fino a cinque volte — cinque-trenta secondi l'una su un disco lento —
    // senza che nessuno di quei minuti contasse né si potesse interrompere. Su
    // una macchina stretta si aspettava minuti prima che l'attesa
    // *cominciasse*. Metterli dentro la stessa attesa ha risolto quello e ne ha
    // aperto un altro, più silenzioso: il tempo del disco veniva tolto a quello
    // della risposta, e su un modello grosso la domanda scadeva **senza essere
    // stata letta** — con un messaggio che dava la colpa alla sua lunghezza.
    //
    // Così invece nessuna delle due può correre all'infinito, tutte e due si
    // interrompono, e la risposta ha sempre il suo tempo intero. Il totale è al
    // più il doppio, ed è un prezzo che si paga soltanto la prima volta che si
    // carica un modello.
    const caricamento = AbortSignal.timeout(collegamento.attesaMs)
    const perCaricare = collegamento.segnale
      ? AbortSignal.any([collegamento.segnale, caricamento])
      : caricamento
    // Il freno è nostro e non c'entra con l'attesa: lo tira il tetto delle
    // chiamate quando il modello non vuol saperne di smettere. Vedi `funzioni`.
    const freno = new AbortController()

    // Quando i pesi sono stati pronti, per poterlo dire se l'attesa scade:
    // `null` vuol dire che pronti non lo sono mai stati. Vedi `scaduta`.
    const acceso = Date.now()
    let prontoDopoMs: number | null = null
    // Finché i pesi non sono pronti, la scadenza che vale è quella del
    // caricamento: serve al `catch`, che scatta anche mentre si carica.
    let scadenza: AbortSignal = caricamento
    let attesa: AbortSignal = perCaricare

    try {
      // I pesi e il contesto insieme, e non uno dopo l'altro: quanti strati
      // stiano sulla scheda video dipende da quanto contesto poi ci entra, e
      // scoprirlo vuol dire provare. Vedi `apparecchia`.
      const { presi, contesto } = await apparecchia(collegamento.modello, perCaricare)
      prontoDopoMs = Date.now() - acceso
      scadenza = AbortSignal.timeout(collegamento.attesaMs)
      attesa = collegamento.segnale
        ? AbortSignal.any([collegamento.segnale, scadenza])
        : scadenza
      try {
        const sessione = new LlamaChatSession({
          contextSequence: contesto.getSequence(),
          ...(istruzioni ? { systemPrompt: istruzioni } : {}),
          // Come si sfoltisce quando il contesto si riempie. Dichiararlo è il
          // punto: la strategia predefinita butta per prime le letture e tiene
          // le istruzioni, che qui è il contrario di quel che serve. Vedi
          // `sfoltisci`.
          contextShift: {
            strategy: ({ chatHistory, maxTokensCount, tokenizer, chatWrapper }) => ({
              chatHistory: sfoltisci(
                chatHistory,
                maxTokensCount,
                (quale) => chatWrapper
                  .generateContextState({ chatHistory: quale })
                  .contextText.tokenize(tokenizer).length,
              ),
            }),
          },
        })

        // La conversazione di prima entra come storia, non come domande da
        // rifare: senza, ogni messaggio ripartirebbe da zero e «e in seconda?»
        // non vorrebbe dire niente.
        if (precedenti.length > 0) {
          sessione.setChatHistory([
            ...(istruzioni ? [{ type: 'system' as const, text: istruzioni }] : []),
            ...precedenti.map((battuta) =>
              battuta.ruolo === 'utente'
                ? { type: 'user' as const, text: battuta.testo }
                : { type: 'model' as const, response: [battuta.testo] },
            ),
          ])
        }

        const attrezzi = giro.attrezzi ?? []
        const budget: Budget = { rimaste: CHIAMATE_MASSIME, rifiuti: 0, freno }
        let detto = await chiedi(
          sessione,
          domanda,
          AbortSignal.any([attesa, freno.signal]),
          attrezzi.length > 0 ? await funzioni(attrezzi, giro, budget) : undefined,
        )

        // Il freno è scattato: il modello ha continuato a chiedere attrezzi
        // dopo che gli era stato detto tre volte che non ce n'erano più. La
        // seconda domanda va **senza `functions`**, e allora non è più una
        // preghiera: la griglia non contempla nessuna chiamata, e quel che ha
        // già letto è ancora tutto lì nella storia della sessione.
        if (freno.signal.aborted && !attesa.aborted) {
          console.log(
            `[llama.cpp] ${budget.rifiuti} chiamate d’attrezzo oltre il tetto di ` +
            `${CHIAMATE_MASSIME}: chiudo la domanda senza attrezzi.`,
          )
          detto = await chiedi(sessione, CHIUSURA, attesa, undefined)
        }

        // L'annullo e la scadenza si guardano qui, e non si aspetta che siano
        // sollevati: `stopOnAbortSignal` fa tornare quel che era già stato
        // generato invece di far saltare tutto, ed è l'unica ragione per cui il
        // freno qui sopra può funzionare senza portarsi via la conversazione.
        if (collegamento.segnale?.aborted) {
          // Chi ha premuto «ferma» non vuole un errore: vuole che smetta.
          return ''
        }
        if (scadenza.aborted) throw scaduta(collegamento, prontoDopoMs)

        if (detto.stopReason === 'maxTokens' || detto.stopReason === 'abort') {
          // Prima si usava `prompt()`, che torna il solo testo: una risposta
          // tagliata a metà e una finita erano indistinguibili, di qui e da
          // fuori. `promptWithMeta` dice perché si è fermata, e almeno lo si
          // scrive dove chi diagnostica lo può leggere.
          console.log(`[llama.cpp] risposta interrotta (${detto.stopReason}): è a metà.`)
        }
        return detto.responseText.trim()
      } finally {
        // Il contesto se ne va sempre: sono centinaia di megabyte, e una
        // domanda annullata non deve lasciarli occupati fino alla prossima.
        await contesto.dispose().catch(() => {})
        // I pesi invece restano su — è il punto di tutto il file — ma da qui
        // in poi non sono più nostri: chi li vuole smaltire, perché si cambia
        // modello o perché lo si sta cancellando, adesso può.
        molla(presi)
      }
    } catch (guasto) {
      // Quel che si è rotto mentre si caricavano i pesi o si apriva il
      // contesto arriva qui com'è — cioè, se è un annullo, come una
      // `DOMException` che parla inglese. Vedi `scaduta`.
      if (collegamento.segnale?.aborted) return ''
      if (scadenza.aborted) throw scaduta(collegamento, prontoDopoMs)
      throw guasto
    }
  },
}

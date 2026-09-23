// Il condotto: il registro che risponde a chi non è una finestra.
//
// È un server JSON-RPC 2.0 su una *named pipe* (su Windows) o su un socket
// unix (altrove), una riga di JSON per messaggio. Non apre nessuna porta di
// rete, e non ne aprirà mai: un registro di classe che ascolta su TCP è un
// registro di classe che, la prima volta che qualcuno sbaglia una regola del
// firewall, ascolta la rete della scuola. Un condotto locale non ha quel modo
// di fallire — non attraversa la macchina.
//
// Quel che si può chiedere è quel che sta nel nucleo, e niente di più: i
// **quattro** metodi riservati — `$versione`, `$elenco`, `$schema`, `$attrezzi`
// — raccontano le procedure, ogni altro `method` è il nome di una procedura e
// passa da `chiama`, con la stessa convalida, lo stesso giornale e gli stessi
// codici d'errore del pannello. Il condotto non sa che cosa fa una procedura:
// traduce le buste.
//
// Dei quattro, tre chiedono la lettura. Per un pezzo non la chiedeva nessuno:
// bastava che il condotto fosse aperto, e una configurazione legittima come
// «scrittura sì, lettura no» — cioè «gli script mandino quel che gli dico, non
// estraggano dati» — regalava a qualunque processo l'elenco completo delle
// procedure, i loro due JSON Schema e il catalogo degli attrezzi con dentro
// come è collegato l'assistente. Raccontare che cosa c'è nel registro *è*
// leggerlo. `$versione` resta libero apposta: è quel che `registro stato`
// stampa quando una chiamata è stata rifiutata e non si capisce perché, e un
// rifiuto che non si può diagnosticare manda a cercare nel posto sbagliato.
//
// ---------------------------------------------------------------- sicurezza
//
// **Il condotto è spento.** Lo accende `registroDocenti.api.condotto`,
// predefinita `false`, e spenta non apre niente: nessun file, nessun nome
// riservato, nessun processo in ascolto. Acceso l'interruttore generale, che
// cosa si possa fare lo dicono altre due voci — `registroDocenti.api.lettura`,
// predefinita `true`, e `registroDocenti.api.scrittura`, predefinita `false` —
// che sotto un generale spento non si leggono nemmeno.
//
// Sono **due** e non una perché sono due concessioni diverse, e quella che
// serve quasi sempre è la prima: uno script che compila un foglio di presenze,
// un promemoria che guarda il calendario, una prova che legge le medie non
// hanno nessun bisogno di poter scrivere. Concedere la sola lettura lascia
// fuori tutto il danno che non si può disfare. Il `genere` dichiarato da ogni
// procedura — `lettura` o `scrittura` — è quel che rende il confine
// verificabile invece che una buona intenzione: non c'è un secondo elenco da
// tenere allineato, e una procedura nuova cade dalla parte che ha dichiarato.
//
// Il limite è del condotto e non del nucleo: i pannelli del registro passano
// da `chiama` senza toccare queste impostazioni. Un docente che concede la
// sola lettura agli script continua a segnare le assenze dal registro — sarebbe
// assurdo il contrario, e non è quello che quell'impostazione promette.
//
// **Su Windows una named pipe con ACL predefinita è raggiungibile da qualunque
// processo che gira nella stessa sessione utente.** Non c'è modo di dirlo più
// piano: acceso il condotto, ogni programma lanciato da quell'utente — uno
// script, una macro, l'aggiornamento di qualcos'altro — può chiamare le
// procedure del registro, e con la scrittura concessa *scrivere* nel registro.
// Rispetto al modello dell'applicazione non è una porta nuova: quello stesso processo
// potrebbe già oggi aprire il file `.registro` e riscriverlo, perché sta sul
// disco dell'utente e non è cifrato. Ma è una porta più comoda, e chi accende
// quell'impostazione deve sapere che cosa sta concedendo: la possibilità, per
// ogni programma che gira come lui, di segnare presenze e voti senza che
// nessuno glielo chieda. Lo stesso avvertimento sta in `docs/API.md`, e va
// tenuto uguale nei due posti.
//
// **Il condotto non allarga sé stesso.** Anche con la scrittura concessa,
// `programma.salva` e `programma.azzera` rifiutano le chiavi dei permessi del
// condotto e i percorsi dei programmi che il registro fa partire: vedi
// `chiaveIntoccabile`.
//
// Fuori da Windows il socket nasce con `chmod 0600` subito dopo `listen`: là il
// permesso del file *è* il controllo d'accesso, e senza quella riga il socket
// sarebbe aperto a chiunque abbia un account sulla macchina.
//
// **Il nome del condotto è un'impronta, non un nome utente.** Dodici caratteri
// esadecimali di uno sha256 di nome utente più cartella dei dati: due docenti
// sullo stesso computer, o due installazioni dello stesso docente, non si
// incrociano — e chi legge l'elenco delle pipe di Windows non ci trova scritto
// chi è al lavoro. Su Windows, dove `\\.\pipe\` è uno solo per tutta la
// macchina, al nome si aggiunge un segreto casuale scritto nella cartella dei
// dati dell'utente: l'impronta si indovina, il segreto no, e un altro utente
// dello stesso computer non può occupare quel nome per primo.
//
// **Quel che esce di qui non nomina nessuno.** I messaggi d'errore del
// trasporto non contengono percorsi della cartella del docente, nomi di
// persone né segreti; il guasto imprevisto torna come una riga sola con il
// numero di tracciato, e il racconto per intero resta nella console
// dell'applicazione, dove lo ha già messo il nucleo.

import { createHash, randomBytes } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { chmod, unlink } from 'node:fs/promises'
import { createServer, type Socket } from 'node:net'
import { homedir, tmpdir, userInfo } from 'node:os'
import { join } from 'node:path'
import { StringDecoder } from 'node:string_decoder'

import * as apparato from 'apparato'

import type { Archivio } from '../../data/archive.js'
import { VERSIONE_API, type Codice, type Genere } from '../contract.js'
import { catalogo } from '../tools.js'
import { registraTutte } from '../index.js'
import { chiama, descrivi, procedura, procedure } from '../core.js'
import {
  convalida, formaInBreve, oggetto, opzionale, schemaJson, testo, type Forma,
} from '../schemas.js'
import { comeCollegato } from './assistant.js'

/**
 * Una riga più lunga di così non è una chiamata, è qualcuno che spinge: la
 * connessione si chiude invece di far crescere un buffer senza fondo. Il conto
 * è in caratteri, che per una riga JSON sono i byte o meno — non è una misura,
 * è una diga.
 *
 * Vale nei due sensi, e per un pezzo è valsa in uno solo: la diga era
 * sull'ingresso e l'uscita non aveva niente, così una richiesta di poche
 * centinaia di chilobyte poteva farsi restituire centinaia di megabyte. Adesso
 * anche `scrivi` si ferma qui, e una busta che non ci sta diventa un guasto
 * invece di una scrittura che nessuno può reggere.
 */
const LIMITE_RIGA = 1024 * 1024

/**
 * Quante connessioni insieme.
 *
 * Non c'era nessun tetto: l'insieme delle prese cresceva finché il sistema
 * dava descrittori, e un processo che ne apre diecimila senza mandare niente
 * teneva diecimila socket a carico del registro. Trentadue sono larghe per
 * l'uso vero — la riga di comando ne apre una per chiamata e la chiude — e
 * strette abbastanza da non lasciar crescere niente senza fondo. La
 * trentatreesima riceve un guasto che dice che cosa è successo, e non un EOF.
 */
const MASSIMO_PRESE = 32

/**
 * Quanto si tiene aperta una presa che non dice niente.
 *
 * Cinque minuti: chi chiama davvero manda entro un secondo dall'apertura, e
 * chi tiene la connessione aperta per riusarla la tiene viva mandando
 * qualcosa. Il timer del socket si azzera a ogni byte nei due sensi, ma i
 * byte non sono le chiamate: una geocodifica che lavora dieci minuti in
 * silenzio veniva tagliata a cinque. Per questo il timer si ferma mentre la
 * presa ha qualcosa in coda, e riparte quando la coda si svuota.
 */
const INATTIVITA_MS = 5 * 60 * 1000

/**
 * Quanto si aspettano, in chiusura, le chiamate già cominciate.
 *
 * Non è generosità: una scrittura già entrata nella coda tocca l'archivio
 * comunque, e distruggere la presa senza aspettarla vuol dire che la modifica
 * entra e chi l'ha mandata non riceve niente invece di «fatto». Passati questi
 * secondi si chiude lo stesso — uno spegnimento che non finisce è peggio di
 * una risposta persa.
 */
const ATTESA_SVUOTAMENTO_MS = 5000

/**
 * Quante richieste possono aspettare il proprio turno su una connessione.
 *
 * È il tetto speculare di quello in scrittura, e senza di lui quello non
 * servirebbe a niente: fermandosi sul `'drain'`, la coda di questa connessione
 * smette di avanzare, ma le righe continuano ad arrivare e `accoda` continua ad
 * accettarle — il buffer si sposta semplicemente dall'altra parte, da quello di
 * Node a questa catena di promesse, e cresce con gli stessi zero limiti di
 * prima. Centoventotto sono larghe per l'uso vero (la riga di comando manda una
 * riga per connessione) e strette abbastanza perché un cliente che spinge senza
 * leggere riceva un no invece di far crescere la memoria del registro.
 */
const MASSIMO_IN_CODA = 128

/**
 * Quanto possono pesare, insieme, le righe che aspettano su una connessione.
 *
 * Il tetto sul numero non basta: centoventotto righe da un megabyte l'una per
 * trentadue prese fanno quattro gigabyte tenuti in memoria dal processo che
 * ha in mano l'archivio. Sedici megabyte per presa sono larghi per ogni uso vero
 * — un PDF in base64 sta sotto il megabyte di una riga — e chi li supera riceve
 * un guasto e la presa chiusa. Si conta in caratteri, come `LIMITE_RIGA`.
 */
const MASSIMO_ACCODATO = 16 * 1024 * 1024

/**
 * Il nome dell'applicazione come lo scrive Electron nel percorso di `userData`.
 *
 * Serve solo al ripiego qui sotto, e deve restare uguale al `productName` di
 * `package.json` e alla copia che ne tiene `src/cli/registro.mjs`: è così che
 * la riga di comando ritrova il condotto senza essere Electron.
 */
const NOME_APPLICAZIONE = 'Registro docenti'

// -------------------------------------------------------------- l'indirizzo

/**
 * La cartella dei dati dell'applicazione, ricavata dalle regole di Electron.
 *
 * È un ripiego: `avviaCondotto` riceve quella vera da chi ha in mano il
 * contesto dell'estensione. Esiste perché `indirizzoCondotto()` deve saper
 * rispondere anche prima che il condotto sia stato acceso — e perché la riga
 * di comando, che Electron non è, calcola l'indirizzo con queste stesse regole.
 */
function cartellaUtentePredefinita (): string {
  if (process.platform === 'win32') {
    const roaming = process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming')
    return join(roaming, NOME_APPLICAZIONE)
  }
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', NOME_APPLICAZIONE)
  }
  return join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), NOME_APPLICAZIONE)
}

/** Il nome utente, o quel che ne resta su una macchina che non lo dichiara. */
function nomeUtente (): string {
  try {
    return userInfo().username
  } catch {
    // Un container senza voce in /etc/passwd: `userInfo` lancia. L'impronta
    // resta buona lo stesso — serve a separare, non a identificare.
    return process.env.USERNAME ?? process.env.USER ?? ''
  }
}

/** La cartella vera, quando chi ha acceso il condotto ce l'ha detta. */
let cartellaUtenteVista: string | null = null

/**
 * La cartella in cui nasce il socket, fuori da Windows.
 *
 * `XDG_RUNTIME_DIR` quando c'è, e non per gusto di standard: quella cartella la
 * crea il sistema con i permessi `0700` e di proprietà dell'utente, mentre
 * `tmpdir()` è scrivibile da chiunque abbia un account sulla macchina. In
 * `/tmp` un altro utente che sappia calcolare l'impronta — e l'impronta è di un
 * nome utente e di un percorso, non di un segreto — può creare *per primo* un
 * file con quel nome: il nostro `unlink` fallisce per via dello sticky bit,
 * `listen` risponde `EADDRINUSE`, `startup.ts` cattura e prosegue, e il registro
 * parte senza condotto con una riga sola in console. Sotto `XDG_RUNTIME_DIR`
 * quella corsa non esiste, perché là dentro non entra nessun altro.
 */
function cartellaDelSocket (): string {
  const corsa = process.env.XDG_RUNTIME_DIR
  return corsa && corsa !== '' ? corsa : tmpdir()
}

/**
 * Dove ascolta il condotto.
 *
 * L'impronta è breve apposta: dodici caratteri esadecimali separano due utenti
 * e due installazioni, e non bastano a far tornare indietro il nome di chi
 * lavora — che in chiaro, nel nome di una pipe, sarebbe leggibile da tutta la
 * macchina.
 *
 * Esportata perché `tests/api/conduit.test.mjs` deve sapere dove bussare:
 * ricalcolare il nome di là vorrebbe dire due regole per la stessa cosa, e il
 * giorno in cui divergessero la prova passerebbe su un condotto che
 * l'applicazione non apre. È lo stesso motivo per cui `src/cli/registro.mjs`
 * tiene una copia del `productName` invece di inventarselo.
 */
export function indirizzoCondotto (): string {
  const cartella = cartellaUtenteVista ?? cartellaUtentePredefinita()
  const impronta = createHash('sha256')
    .update(`${nomeUtente()}\n${cartella}`)
    .digest('hex')
    .slice(0, 12)
  if (process.platform !== 'win32') {
    return join(cartellaDelSocket(), `registro-docenti-${impronta}.sock`)
  }
  const segreto = leggiSegreto(cartella)
  return `\\\\.\\pipe\\registro-docenti-${impronta}${segreto ? `-${segreto}` : ''}`
}

/**
 * Il file con il segreto del nome della pipe, dentro la cartella dei dati.
 *
 * Su Windows `\\.\pipe\` è **uno solo per tutta la macchina**: su un computer
 * condiviso — il cambio rapido di utente, un server di desktop remoti — un
 * altro utente che sappia calcolare l'impronta può creare per primo una pipe
 * con quel nome. Il registro allora non parte in ascolto (`EACCES`), e la riga
 * di comando parla con la pipe di un altro: gli manda le chiamate e crede alle
 * sue risposte. L'impronta non basta a impedirlo perché è di un nome utente e di
 * un percorso, cioè di cose che si indovinano.
 *
 * Il segreto no: sedici byte a caso, scritti la prima volta che il condotto si
 * accende in un file che sta nel profilo dell'utente — la cui ACL lo lascia
 * leggere a lui e a nessun altro utente normale — e letti anche da
 * `src/cli/registro.mjs`, che calcola il nome con la stessa regola. Fuori da
 * Windows non serve: il socket sta sotto `XDG_RUNTIME_DIR` o nasce `0600`.
 */
const FILE_SEGRETO = 'condotto.segreto'

/** La forma del segreto: quel che non la ha non si usa, si rifà. */
const FORMA_SEGRETO = /^[0-9a-f]{32}$/

/** Il segreto già scritto, o `null` se il condotto non si è mai acceso qui. */
function leggiSegreto (cartella: string): string | null {
  try {
    const letto = readFileSync(join(cartella, FILE_SEGRETO), 'utf8').trim()
    return FORMA_SEGRETO.test(letto) ? letto : null
  } catch {
    return null
  }
}

/**
 * Il segreto, scritto se non c'è ancora.
 *
 * Lo chiama solo `avviaCondotto`, e solo su Windows: un condotto spento non
 * scrive niente, nemmeno questo file. Due registri che si accendono insieme non
 * si pestano: chi arriva secondo trova il file e lo legge.
 */
function segretoDelCondotto (cartella: string): string {
  const letto = leggiSegreto(cartella)
  if (letto) return letto
  const nuovo = randomBytes(16).toString('hex')
  mkdirSync(cartella, { recursive: true })
  try {
    writeFileSync(join(cartella, FILE_SEGRETO), nuovo, { mode: 0o600, flag: 'w' })
  } catch {
    // Scriverlo non si è potuto: si parte con il nome senza segreto piuttosto
    // che senza condotto, ed è il comportamento di prima.
    return ''
  }
  return leggiSegreto(cartella) ?? nuovo
}

// ----------------------------------------------------------------- le buste

/**
 * I codici del registro tradotti in JSON-RPC.
 *
 * Tre hanno un corrispondente standard e ci vanno; gli altri quattro non ce
 * l'hanno, e inventarne uno vorrebbe dire far credere a chi chiama che un voto
 * rifiutato e un parametro sbagliato siano la stessa cosa. Quelli finiscono
 * nello spazio applicativo, `-32000`, con il codice vero dentro `data` — dove
 * il codice del registro sta **sempre**, anche quando fuori c'è un numero
 * standard: è quello, e non il numero, la cosa su cui si decide se ritentare.
 */
const CODICI_JSONRPC: Record<Codice, number> = {
  'ingresso-non-valido': -32602,
  'procedura-sconosciuta': -32601,
  interno: -32603,
  'non-trovato': -32000,
  rifiutato: -32000,
  conflitto: -32000,
  'non-disponibile': -32000,
  'non-permesso': -32000,
}

/**
 * Quel che si guarda di una richiesta in arrivo.
 *
 * Il campo `jsonrpc` non c'è, e non per dimenticanza: non viene guardato, così
 * una richiesta che si dichiara `"jsonrpc": "1.0"` — o che non lo dichiara
 * affatto — viene servita normalmente. È tolleranza voluta verso i client
 * scritti in fretta, e costa poco perché la versione non cambia il significato
 * di niente di quel che leggiamo. Ma va detto, perché il file dichiara di
 * parlare JSON-RPC 2.0 e chi lo legge dà per scontato che lo pretenda: il
 * giorno in cui una 3.0 volesse dire qualcosa di diverso, il controllo va
 * aggiunto qui e non altrove.
 */
interface Richiesta {
  id?: unknown
  method?: unknown
  params?: unknown
}

// ------------------------------------------------------------------ i permessi

/**
 * Che cosa il condotto lascia fare, per genere di procedura.
 *
 * Esportata anche se nessun altro file la nomina, per la stessa ragione di
 * `OpzioniCondotto` qui sotto: compare nella sua firma, e `npm run census`
 * guarda chi la cita e non chi la può raggiungere per inferenza.
 */
interface Permessi {
  lettura: boolean
  scrittura: boolean
}

/**
 * Lo scavalco delle prove: vedi `OpzioniCondotto.permessi`. `null` vuol dire
 * «vale quel che dicono le impostazioni», ed è il caso dell'applicazione vera.
 */
let permessiScavalcati: Permessi | null = null

/**
 * Quel che vale adesso, riletto a ogni chiamata.
 *
 * Per un pezzo questo valore si leggeva una volta sola all'accensione, con un
 * commento che mandava a un `osservaCondotto` in `startup.ts` che non è mai
 * esistito. Il risultato: un docente che spegneva
 * «registroDocenti.api.scrittura» vedeva l'interruttore spento e il condotto
 * continuava a concedere la scrittura a ogni processo della sessione fino al
 * riavvio dell'applicazione — mentre `registro stato`, che è il posto dove si
 * va a guardare quando una chiamata è stata rifiutata, confermava il permesso
 * vecchio. Un interruttore di sicurezza che non spegne niente è peggio di un
 * interruttore che non c'è, perché ci si conta.
 *
 * La coerenza che quel commento voleva davvero è *dentro* una chiamata, non
 * *fra* chiamate: `eseguiMetodo` legge i permessi una volta sola e se li tiene
 * in una costante locale per tutta la propria durata, così nessuna chiamata
 * comincia con un permesso e finisce con un altro. Fra una chiamata e l'altra
 * vale quel che le impostazioni dicono adesso, che è l'unica cosa che uno
 * spegnimento possa promettere.
 */
function permessiOra (): Permessi {
  return permessiScavalcati ?? permessiDalleImpostazioni()
}

/**
 * I permessi come li dichiarano le impostazioni.
 *
 * `condotto` è l'interruttore generale e viene prima di tutto: spento, le due
 * voci di sotto non si leggono nemmeno. È la stessa gerarchia che la pagina
 * delle impostazioni disegna — `dipendeDa` nel manifesto — ed è scritta due
 * volte apposta, perché il registro non deve dipendere dall'interfaccia per
 * sapere che cosa sta concedendo.
 */
function permessiDalleImpostazioni (): Permessi {
  const sezione = apparato.impostazioni.leggi('registroDocenti.api')
  if (!sezione.get<boolean>('condotto', false)) return { lettura: false, scrittura: false }
  return {
    lettura: sezione.get<boolean>('lettura', true),
    scrittura: sezione.get<boolean>('scrittura', false),
  }
}

/**
 * Il permesso che un genere richiede, quando il condotto non ce l'ha.
 *
 * Pura e a parte dal resto apposta: è la riga che decide chi entra, e una riga
 * così si prova. `null` vuol dire «si passa».
 */
export function permessoMancante (
  genere: Genere,
  concessi: Permessi,
): 'lettura' | 'scrittura' | null {
  if (genere === 'scrittura' && !concessi.scrittura) return 'scrittura'
  if (genere === 'lettura' && !concessi.lettura) return 'lettura'
  return null
}

/**
 * Lo stesso, per un metodo del condotto.
 *
 * Le procedure sconosciute passano di qui senza fermarsi: chi ha sbagliato il
 * nome merita di sentirsi dire che il nome non esiste, non che non ha il
 * permesso di chiamarlo — e un elenco dei nomi validi ottenuto a forza di
 * errori diversi sarebbe l'unica cosa che questo controllo regalerebbe.
 */
function permessoMancantePerMetodo (
  metodo: string,
  concessi: Permessi,
): 'lettura' | 'scrittura' | null {
  const p = procedura(metodo)
  return p ? permessoMancante(p.genere, concessi) : null
}

/**
 * Il rifiuto per mancanza di permesso, detto sempre allo stesso modo.
 *
 * Una frase sola per i due posti che la dicono — le procedure e i tre metodi
 * d'introspezione — perché chi la legge va a cercare nelle impostazioni la
 * parola che ci ha trovato dentro, e due formulazioni diverse dello stesso no
 * sono due ricerche diverse per la stessa voce.
 */
function senzaPermesso (che: 'lettura' | 'scrittura', perché: string): GuastoRpc {
  return new GuastoRpc(CODICI_JSONRPC['non-permesso'], `Il condotto non concede la ${che}.`, {
    codice: 'non-permesso' satisfies Codice,
    messaggi: [perché, `Si concede con l’impostazione «registroDocenti.api.${che}».`],
  })
}

/**
 * Le procedure che scrivono un'impostazione del programma.
 *
 * `impostazioni.salva` non c'è: scrive le impostazioni del documento d'anno, e
 * nessuna chiave `registroDocenti.*` passa di lì.
 */
const SCRIVONO_IMPOSTAZIONI = new Set(['programma.salva', 'programma.azzera'])

/**
 * Le chiavi del programma che il condotto non cambia, anche con la scrittura.
 *
 * Due famiglie, e tutte e due sono il condotto che si allarga da solo:
 *
 *   - **i permessi del condotto** (`registroDocenti.api.*`). Si rileggono a ogni
 *     chiamata — vedi `permessiOra` — e così uno script con la sola scrittura
 *     chiamava `programma.salva` sulla lettura e dalla chiamata dopo leggeva
 *     tutto. Quel che il docente ha concesso lo cambia il docente;
 *   - **i percorsi dei programmi che il registro fa partire**: i due eseguibili
 *     scelti a mano (`ocr.programma`, `dettatura.programma`), OUTLOOK.EXE, e le
 *     due cartelle in cui il registro tiene i programmi che scarica — un
 *     eseguibile che ci si trova già dentro lo usa senza riscaricarlo. Cambiarle
 *     dal condotto vorrebbe dire far eseguire al registro un programma
 *     qualunque, con dentro i dati della classe.
 *
 * Il confronto è senza maiuscole: la dogana di `valoreAccettabile` le chiavi le
 * conosce esatte, ma un cancello che dipende da un altro controllo per non
 * avere buchi è un cancello con un buco il giorno in cui l'altro cambia.
 */
const PREFISSO_PERMESSI = 'registrodocenti.api.'
const PERCORSI_ESEGUITI = new Set([
  'registrodocenti.ocr.programma',
  'registrodocenti.ocr.cartella',
  'registrodocenti.dettatura.programma',
  'registrodocenti.dettatura.cartella',
  'registrodocenti.recapiti.outlook',
])

/**
 * Il rifiuto per una chiave che il condotto non tocca, o `null` se si passa.
 *
 * Prima della convalida, come il cancello dei permessi: una chiamata che non si
 * farà non finisce nel giornale.
 */
function chiaveIntoccabile (metodo: string, params: unknown): GuastoRpc | null {
  if (!SCRIVONO_IMPOSTAZIONI.has(metodo)) return null
  const chiave = (params as { chiave?: unknown } | null | undefined)?.chiave
  if (typeof chiave !== 'string') return null
  const bassa = chiave.trim().toLowerCase()
  const perche = bassa.startsWith(PREFISSO_PERMESSI)
    ? 'I permessi del condotto non si cambiano dal condotto.'
    : PERCORSI_ESEGUITI.has(bassa)
      ? 'I programmi che il registro fa partire non si cambiano dal condotto.'
      : null
  if (!perche) return null
  return new GuastoRpc(CODICI_JSONRPC['non-permesso'], perche, {
    codice: 'non-permesso' satisfies Codice,
    messaggi: [perche, 'Si cambiano dalle impostazioni del registro, a mano.'],
    campo: 'chiave',
  })
}

/** Un errore già nella forma in cui esce dal condotto. */
class GuastoRpc extends Error {
  readonly code: number
  readonly dati: Record<string, unknown>

  constructor (code: number, messaggio: string, dati: Record<string, unknown>) {
    super(messaggio)
    this.name = 'GuastoRpc'
    this.code = code
    this.dati = dati
  }
}

function bustaEsito (id: unknown, risultato: unknown): string {
  return `${JSON.stringify({ jsonrpc: '2.0', id, result: risultato })}\n`
}

function bustaGuasto (
  id: unknown,
  code: number,
  messaggio: string,
  dati: Record<string, unknown>,
): string {
  const busta = {
    jsonrpc: '2.0',
    id: id ?? null,
    error: { code, message: messaggio, data: dati },
  }
  return `${JSON.stringify(busta)}\n`
}

// ------------------------------------------------------------------ i metodi

/**
 * La forma di ogni campo detta in una riga.
 *
 * Va oltre i due JSON Schema, e non per comodità: la riga di comando non può
 * importare `formaInBreve` — è TypeScript, e lei gira senza compilazione — e
 * riscriverlo di là vorrebbe dire due descrizioni della stessa forma che
 * divergono al primo genere nuovo.
 */
function breviDeiCampi (campi: Record<string, Forma>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(campi).map(([campo, forma]) => [campo, formaInBreve(forma)]),
  )
}

/**
 * Il ritratto di una procedura, per chi deve comporne l'ingresso da fuori.
 *
 * La base la costruisce `descrivi`, la stessa che serve `$elenco`, e non una
 * copia scritta qui: le due si erano separate senza che nessuno se ne
 * accorgesse, e `$schema` aveva smesso di dire `versione`, `azione` e
 * `collezioni` mentre le docs promettevano «lo stesso ritratto più i due JSON
 * Schema». Pesa soprattutto `versione`, che `contract.ts` chiama l'unica cosa
 * che permette a chi chiama da fuori di sapere se può ritentare: chiederla al
 * metodo che serve proprio a preparare una chiamata, e non trovarla, è il modo
 * più diretto di perderla.
 */
function ritratto (nome: string): Record<string, unknown> {
  const p = procedura(nome)
  if (!p) {
    throw new GuastoRpc(-32601, `Il registro non conosce «${nome}».`, {
      codice: 'procedura-sconosciuta' satisfies Codice,
    })
  }
  const forma = p.ingresso.forma
  return {
    ...descrivi(p),
    ingresso: schemaJson(forma),
    uscita: schemaJson(p.uscita.forma),
    breve: forma.genere === 'oggetto' ? breviDeiCampi(forma.campi) : {},
  }
}

/**
 * Che cosa `$attrezzi` accetta.
 *
 * Un nome di comando e niente altro, con un tetto che non è pignoleria: quella
 * stringa finisce una volta nel campo omonimo, una decina di volte dentro le
 * istruzioni e **una volta per ogni attrezzo** — e gli attrezzi sono centinaia.
 * Senza modello e senza `massimo`, novecentomila caratteri — che stanno comodi
 * sotto `LIMITE_RIGA`, quindi la diga dell'ingresso non li vede nemmeno
 * passare — diventavano centosessanta megabyte di risposta, altrettanti di
 * `JSON.stringify` e una `write` sola sulla presa. Dieci connessioni così
 * bastavano a far morire per esaurimento di memoria il processo che tiene
 * l'archivio, con il documento dell'anno non ancora salvato.
 */
const INGRESSO_ATTREZZI = oggetto({
  comando: opzionale(testo({
    aiuto: 'Il comando di cui si vogliono gli attrezzi',
    massimo: 64,
    modello: /^[A-Za-z0-9._-]+$/,
  })),
})

async function eseguiMetodo (
  archivio: Archivio,
  metodo: string,
  params: unknown,
): Promise<unknown> {
  // JSON-RPC 2.0 §4.2 ammette i parametri posizionali; il registro no, perché
  // una procedura del registro non ha un ordine dei campi — ne ha i nomi, e
  // l'ordine se lo inventerebbe chi chiama. Detto qui e non più giù: finendo
  // dentro `oggetto()`, l'array si prendeva un «Serve un oggetto.» che non
  // nomina `params` e lascia cercare l'oggetto mancante dentro l'ingresso
  // della procedura, dove non è.
  if (Array.isArray(params)) {
    throw new GuastoRpc(-32602, 'I parametri posizionali non si usano: «params» vuole un oggetto '
      + 'con i nomi dei campi.', {
      codice: 'ingresso-non-valido' satisfies Codice,
      campo: 'params',
    })
  }

  // Una volta sola, e poi ferma: dentro una chiamata i permessi non cambiano,
  // così quel che `$versione` racconta e quel che il cancello qui sotto decide
  // sono sempre la stessa cosa. Fra una chiamata e l'altra invece si rilegge —
  // vedi `permessiOra`.
  const concessi = permessiOra()

  if (metodo === '$versione') {
    return {
      api: VERSIONE_API,
      applicazione: apparato.versioneApplicazione(),
      // Il nome dell'anno, non il percorso del documento: dove sta la cartella
      // del docente è la prima cosa che questo trasporto non deve dire.
      documento: archivio.cartellaCorrente,
      // Che cosa si può fare, detto prima di provarci: `regdoc stato` lo
      // stampa, ed è lì che si va a guardare quando una chiamata è stata
      // rifiutata e non si capisce perché. Per questo `$versione` è l'unico dei
      // quattro metodi riservati che non chiede permessi: se per leggere la
      // diagnosi servisse il permesso che manca, la diagnosi non servirebbe.
      permessi: concessi,
    }
  }

  // Raccontare che cosa c'è nel registro è leggerlo. I tre metodi qui sotto non
  // toccano nessun dato di nessuna persona, ma consegnano l'elenco completo
  // delle procedure, i loro schemi e il catalogo degli attrezzi: chi ha la sola
  // scrittura ha chiesto apposta di non poter estrarre niente, e questa era la
  // via che restava aperta.
  if (metodo === '$elenco' || metodo === '$schema' || metodo === '$attrezzi') {
    if (!concessi.lettura) {
      throw senzaPermesso(
        'lettura',
        `«${metodo}» racconta che cosa c’è nel registro, e raccontarlo è leggerlo.`,
      )
    }
  }

  if (metodo === '$elenco') return procedure().map((p) => descrivi(p))

  if (metodo === '$attrezzi') {
    // Il catalogo vivo, non quello di `resources/tools.json`: quello su disco
    // è la copia che si legge in revisione e che serve quando il registro è
    // chiuso, ma se il registro risponde la verità è qui — ed è la sola che non
    // possa essere rimasta indietro di una modifica.
    //
    // Esce anche come l'assistente è collegato, perché chi chiama da fuori non
    // può leggere le impostazioni dell'applicazione: non gira dentro Electron.
    // È l'indirizzo di un servizio e il nome di un modello, e non esce dalla
    // macchina di chi ha già il permesso di leggere il registro — che adesso è
    // vero, perché `$attrezzi` la lettura la chiede davvero. Finché non la
    // chiedeva, questa giustificazione era falsa: bastava avere il condotto
    // aperto, e la sola scrittura basta ad aprirlo.
    const controllo = convalida(INGRESSO_ATTREZZI, params ?? {})
    if (controllo.issues) {
      const problema = controllo.issues[0]
      const campo = problema?.path?.join('.')
      throw new GuastoRpc(-32602, problema?.message ?? 'Ingresso non valido.', {
        codice: 'ingresso-non-valido' satisfies Codice,
        ...(campo ? { campo } : {}),
      })
    }
    const comando = controllo.value.comando
    return { ...catalogo(comando), assistente: comeCollegato() }
  }

  if (metodo === '$schema') {
    const chiesta = (params as { procedura?: unknown } | null | undefined)?.procedura
    if (typeof chiesta !== 'string' || chiesta === '') {
      throw new GuastoRpc(-32602, 'Serve il nome della procedura, in «procedura».', {
        codice: 'ingresso-non-valido' satisfies Codice,
        campo: 'procedura',
      })
    }
    return ritratto(chiesta)
  }

  if (metodo.startsWith('$')) {
    throw new GuastoRpc(-32601, `Il condotto non conosce «${metodo}».`, {
      codice: 'procedura-sconosciuta' satisfies Codice,
    })
  }

  // Prima della convalida e prima del giornale: una chiamata che non si può
  // fare non deve nemmeno essere composta, e un ingresso che non verrà mai
  // eseguito non ha ragione di finire nel giornale delle chiamate.
  const manca = permessoMancantePerMetodo(metodo, concessi)
  if (manca) {
    throw senzaPermesso(
      manca,
      `«${metodo}» è una procedura di ${manca}, e il condotto non la concede.`,
    )
  }

  const intoccabile = chiaveIntoccabile(metodo, params)
  if (intoccabile) throw intoccabile

  const risultato = await chiama(archivio, metodo, params ?? {}, { origine: 'condotto' })
  if (risultato.ok) return risultato

  // Il guasto imprevisto non esce di qui per intero: il messaggio di
  // un'eccezione può contenere il percorso di un file, e il percorso di un file
  // dice dove lavora il docente. Il racconto completo è già nella console
  // dell'applicazione, e il tracciato lega le due cose.
  const messaggi = risultato.codice === 'interno'
    ? [`Guasto interno del registro. Nel giornale: ${risultato.tracciato}.`]
    : risultato.messaggi

  throw new GuastoRpc(CODICI_JSONRPC[risultato.codice], messaggi.join(' '), {
    codice: risultato.codice,
    messaggi,
    ...(risultato.campo ? { campo: risultato.campo } : {}),
    tracciato: risultato.tracciato,
    // Quel che è successo prima di fallire. `modifiche` maggiore di zero con
    // `codice: 'interno'` vuol dire che la scrittura è avvenuta e la busta no:
    // chi chiama da uno script non deve ritentare alla cieca, perché trenta
    // delle scritture non sono idempotenti. Vedi `chiudi()` in `api/core.ts`.
    ...(risultato.modifiche !== undefined ? { modifiche: risultato.modifiche } : {}),
    ...(risultato.revisione !== undefined ? { revisione: risultato.revisione } : {}),
    ...(risultato.versione !== undefined ? { versione: risultato.versione } : {}),
  })
}

// ------------------------------------------------------------- la connessione

/**
 * Manda fuori una busta già fatta, se c'è ancora qualcuno che l'ascolta.
 *
 * Il tetto sull'uscita non c'era, e senza di lui `LIMITE_RIGA` era una diga
 * costruita su un lato solo del fiume: una richiesta piccola poteva farsi
 * restituire una risposta che nessuna delle due parti era in grado di reggere.
 * Una busta che non ci sta diventa un guasto interno — è un difetto nostro,
 * non di chi ha chiamato — e il guasto è corto per definizione.
 */
async function scrivi (presa: Socket, id: unknown, testo: string): Promise<void> {
  if (presa.destroyed) return
  if (testo.length > LIMITE_RIGA) {
    presa.write(bustaGuasto(id, -32603, 'La risposta supera il limite di 1 MiB.', {
      codice: 'interno' satisfies Codice,
    }))
    return
  }
  // `write` torna `false` quando il buffer di Node ha superato la sua soglia, e
  // fin qui nessuno lo guardava: il tetto in lettura c'era (`LIMITE_RIGA`), in
  // scrittura no. Un cliente che smette di leggere — uno script fermo su un
  // breakpoint, un terminale in pausa — non rallenta niente e non chiude
  // niente: il buffer cresce in memoria del processo che ospita il registro,
  // senza tetto. Con `$elenco` (176 procedure descritte) e un migliaio di righe
  // mandate in un colpo si arriva a decine di megabyte, e con una lettura grossa
  // molto più in là. Aspettando il `'drain'` la pressione torna indietro fino
  // alla coda di questa connessione, che è dove serve che arrivi.
  if (presa.write(testo)) return
  await drenata(presa)
}

/**
 * Aspetta che il buffer si sia svuotato — o che la presa se ne sia andata.
 *
 * `close` ed `error` non sono uno scrupolo: senza di loro un cliente morto con
 * il buffer pieno non manderebbe mai il `'drain'`, e questa promessa resterebbe
 * appesa dentro la coda della connessione. Lo spegnimento aspetta quelle code
 * (vedi `svuota()`, in fondo), quindi aspetterebbe un cliente morto fino al suo
 * tetto di cinque secondi, ogni volta.
 */
function drenata (presa: Socket): Promise<void> {
  return new Promise<void>((risolvi) => {
    const basta = (): void => {
      presa.off('drain', basta)
      presa.off('close', basta)
      presa.off('error', basta)
      risolvi()
    }
    presa.on('drain', basta)
    presa.on('close', basta)
    presa.on('error', basta)
  })
}

/**
 * Un `id` che si possa rimandare indietro.
 *
 * JSON-RPC 2.0 §4 dice stringa, numero o `null`, e niente altro. Un `id`
 * oggetto o array tornava indietro verbatim: chi correla le risposte per id —
 * e la riga di comando lo fa — si trova a confrontare due oggetti diversi che
 * si assomigliano, e nessuna attesa si risolve.
 */
function idAmmesso (id: unknown): boolean {
  return typeof id === 'string' || typeof id === 'number' || id === null
}

async function rispondi (
  archivio: Archivio,
  presa: Socket,
  riga: string,
  stato: StatoCondotto,
): Promise<void> {
  let richiesta: Richiesta
  try {
    // `trim` e non la riga com'è: un BOM UTF-8 in testa al primo messaggio
    // faceva fallire la *prima* chiamata e passare tutte le successive — un
    // guasto che sembra intermittente e non lo è, e che costa il pomeriggio a
    // chi lo cerca nel posto dove si rompe invece che nel posto dove comincia.
    const letto: unknown = JSON.parse(riga.trim())
    if (typeof letto !== 'object' || letto === null || Array.isArray(letto)) {
      await scrivi(presa, null, bustaGuasto(null, -32600, 'Serve un oggetto JSON-RPC.', {
        codice: 'ingresso-non-valido' satisfies Codice,
      }))
      return
    }
    richiesta = letto
  } catch {
    // Dopo un JSON rotto la connessione è desincronizzata per definizione: non
    // si sa dove finisse quella riga, quindi non si sa nemmeno se la prossima
    // è una richiesta o la coda di questa. E la busta va a un `id: null` che
    // chi correla per id scarta comunque — restando aperta, la connessione non
    // sveglierebbe nessuno nemmeno con un `close`. Si risponde e si chiude, e
    // chi aspettava si accorge di aspettare invano.
    await scrivi(presa, null, bustaGuasto(null, -32700, 'La riga non è JSON.', {
      codice: 'ingresso-non-valido' satisfies Codice,
    }))
    presa.end()
    return
  }

  // Una notifica è una richiesta **priva** del membro `id` (JSON-RPC 2.0 §4):
  // si esegue e non si risponde. `"id": null` non è una notifica — è una
  // richiesta normale con l'id `null`, a cui si deve una risposta — e qui per
  // un pezzo lo è stata: il registro eseguiva la scrittura, segnava l'assenza,
  // e non rispondeva. Chi aveva chiamato restava in attesa per sempre, perché
  // un tetto di tempo non c'è da nessuna delle due parti, interrompeva con
  // Ctrl-C convinto che non fosse successo niente — e l'assenza era segnata.
  const attende = 'id' in richiesta && richiesta.id !== undefined
  const id = attende ? richiesta.id : null

  if (attende && !idAmmesso(id)) {
    await scrivi(presa, null, bustaGuasto(null, -32600, 'L’«id» vuole una stringa, un numero o null.', {
      codice: 'ingresso-non-valido' satisfies Codice,
      campo: 'id',
    }))
    return
  }

  // In chiusura non si comincia più niente di nuovo, e lo si dice: una riga
  // arrivata mentre il condotto si smaltisce riceve un no che si legge, non il
  // silenzio di una presa distrutta a metà frase.
  if (stato.chiuso) {
    if (attende) {
      await scrivi(presa, id, bustaGuasto(id, CODICI_JSONRPC['non-disponibile'],
        'Il condotto si sta chiudendo.', {
          codice: 'non-disponibile' satisfies Codice,
          messaggi: ['Il registro si sta spegnendo e non accetta altre chiamate.'],
        }))
    }
    return
  }

  const metodo = richiesta.method

  if (typeof metodo !== 'string' || metodo === '') {
    if (attende) {
      await scrivi(presa, id, bustaGuasto(id, -32600, 'Manca il nome del metodo.', {
        codice: 'ingresso-non-valido' satisfies Codice,
        campo: 'method',
      }))
    }
    return
  }

  let esito: unknown
  try {
    esito = await eseguiMetodo(archivio, metodo, richiesta.params)
  } catch (male) {
    // Prima il racconto e poi la risposta, perché il racconto vale anche
    // quando la risposta non c'è: con il `return` davanti, un guasto imprevisto
    // su una notifica non lasciava traccia da nessuna parte — né busta, né
    // giornale, né console — e la promessa scritta in testa a questo file, che
    // «il racconto per intero resta nella console dell'applicazione», per le
    // notifiche era falsa.
    if (!(male instanceof GuastoRpc)) console.error('[condotto] guasto nel trasporto', male)
    if (!attende) return
    if (male instanceof GuastoRpc) {
      await scrivi(presa, id, bustaGuasto(id, male.code, male.message, male.dati))
      return
    }
    await scrivi(presa, id, bustaGuasto(id, -32603, 'Guasto interno del registro.', {
      codice: 'interno' satisfies Codice,
    }))
    return
  }

  if (!attende) return

  // La composizione della busta sta **fuori** dal `try` di sopra, e non è un
  // dettaglio di stile: con `bustaEsito` là dentro, un `JSON.stringify` che
  // lanciasse — un riferimento ciclico, un `BigInt`, le cose che passano dai
  // costruttori larghi `qualunque()` ed `entita()` — faceva rispondere «guasto
  // interno» per una chiamata **riuscita**. E siccome `interno` non è un
  // rifiuto, uno script scritto bene ritenta: su una delle trenta scritture
  // non idempotenti, la seconda volta non è la stessa cosa della prima.
  try {
    await scrivi(presa, id, bustaEsito(id, esito))
  } catch (male) {
    // Il solo modo di arrivare qui è che la busta non si sia potuta comporre.
    // Un messaggio suo, e non «guasto interno» come tutti gli altri: la
    // chiamata è andata a buon fine, e chi legge il rapporto deve poter
    // distinguere «non è successo» da «è successo e non te l'ho saputo dire».
    console.error('[condotto] la risposta non si è potuta serializzare', male)
    await scrivi(presa, id, bustaGuasto(id, -32603, 'La risposta non si è potuta serializzare.', {
      codice: 'interno' satisfies Codice,
      messaggi: [
        'La chiamata è stata eseguita: il suo effetto sul registro c’è.',
        'Quel che non si è potuto comporre è la busta della risposta.',
      ],
    }))
  }
}

/**
 * Quel che un condotto acceso tiene in mano.
 *
 * Le code stanno qui e non più in una chiusura dentro `servi` perché lo
 * spegnimento deve poterle aspettare: finché erano invisibili da fuori, il
 * disposer distruggeva le prese e la chiamata già in coda proseguiva lo stesso
 * — toccava l'archivio, e poi trovava la presa distrutta e non scriveva
 * niente. Il difetto che l'ordine di `spegni` voleva evitare c'era ancora,
 * rovesciato: la modifica entrava **dopo** la chiusura, e chi l'aveva mandata
 * riceveva *niente* invece di «fatto».
 */
interface StatoCondotto {
  /** Da qui in poi non si comincia più niente: si risponde e basta. */
  chiuso: boolean
  /** Una coda per presa, cioè l'ultima promessa di quella connessione. */
  code: Map<Socket, Promise<void>>
}

function servi (archivio: Archivio, presa: Socket, stato: StatoCondotto): void {
  // Un decodificatore e non `setEncoding`: i pezzi che arrivano dal condotto si
  // spezzano dove capita, e un carattere accentato tagliato a metà fra due
  // pacchetti diventerebbe un punto interrogativo dentro il nome di un campo.
  const decodificatore = new StringDecoder('utf8')
  let resto = ''

  /**
   * La riga entra in coda, e la coda è **per connessione**.
   *
   * Una richiesta per volta, nell'ordine in cui è arrivata: chi manda due righe
   * di fila si aspetta che valga la seconda. Ma la garanzia finisce qui, e il
   * commento che stava in questo punto lasciava credere il contrario: due
   * connessioni diverse che scrivono insieme sullo stesso archivio non sono
   * serializzate da niente di qui. `docs/API.md` lo dice per intero — «per
   * trasporto, non in assoluto» — ed è la versione onesta.
   *
   * Il `catch` non è un ornamento: senza, una sola promessa rifiutata
   * avvelena la coda per sempre — `then` su una promessa già rifiutata non
   * esegue più niente, e la connessione smetterebbe di rispondere *in
   * silenzio*, restando aperta. Con una scrittura di mezzo, chi manda la riga
   * dopo aspetterebbe una risposta che non arriva mai.
   */
  /** Quante righe di questa connessione aspettano il proprio turno. */
  let inCoda = 0
  /** Rifiutata una riga per lunghezza o per peso, la presa non legge più altro. */
  let rifiutata = false
  /** Quanti caratteri pesano, tutte insieme: vedi `MASSIMO_ACCODATO`. */
  let accodati = 0

  const accoda = (riga: string): void => {
    // Il tetto sulla profondità: vedi `MASSIMO_IN_CODA`. Si dice e non si
    // chiude, perché «sei troppo avanti» è una diagnosi e un EOF non lo è, e
    // chi la legge sa che deve rallentare invece di credere il registro morto.
    if (inCoda >= MASSIMO_IN_CODA) {
      void scrivi(presa, null, bustaGuasto(null, CODICI_JSONRPC['non-disponibile'],
        `Questa connessione ha già ${MASSIMO_IN_CODA} richieste in attesa.`, {
          codice: 'non-disponibile' satisfies Codice,
          messaggi: ['Si aspetta la risposta di quel che è già stato mandato, e poi si riprende.'],
        }))
      return
    }
    // Il tetto sul peso, che quello sul numero non dà: vedi `MASSIMO_ACCODATO`.
    // Qui si chiude, perché chi manda sedici megabyte senza leggere una
    // risposta non sta aspettando il proprio turno.
    if (accodati + riga.length > MASSIMO_ACCODATO) {
      rifiutata = true
      void scrivi(presa, null, bustaGuasto(null, CODICI_JSONRPC['non-disponibile'],
        'Questa connessione ha in attesa più di 16 MiB di richieste.', {
          codice: 'non-disponibile' satisfies Codice,
          messaggi: ['Si aspetta la risposta di quel che è già stato mandato, e poi si riprende.'],
        }))
      presa.end()
      return
    }
    inCoda += 1
    accodati += riga.length
    // Con una chiamata in corso il timer d'inattività si ferma: il timer del
    // socket guarda i byte, non le chiamate, e una lettura che lavora dieci
    // minuti senza scambiarne veniva tagliata a cinque — il gestore andava
    // avanti, e chi aveva chiamato leggeva «condotto spento».
    if (inCoda === 1) presa.setTimeout(0)
    const prima = stato.code.get(presa) ?? Promise.resolve()
    const dopo = prima
      .then(() => rispondi(archivio, presa, riga, stato))
      .catch((male: unknown) => {
        console.error('[condotto] guasto nella coda', male)
      })
      .finally(() => {
        inCoda -= 1
        accodati -= riga.length
        // Coda vuota: da qui in poi scade di nuovo il silenzio.
        if (inCoda === 0 && !presa.destroyed) presa.setTimeout(INATTIVITA_MS)
      })
    stato.code.set(presa, dopo)
    // Quando la coda di questa presa è arrivata in fondo e nessuno ha accodato
    // altro, la voce se ne va: la mappa segue le connessioni vive, non le
    // conta tutte da quando il registro è partito.
    void dopo.then(() => {
      if (stato.code.get(presa) === dopo) stato.code.delete(presa)
    })
  }


  /**
   * Una riga troppo lunga si rifiuta *dicendolo*.
   *
   * Prima si chiudeva la presa e basta, e chi chiamava vedeva un EOF: la riga
   * di comando, su `close`, risolve tutte le attese con `null`, e lo script
   * concludeva che il registro non risponde. Lo scenario non è teorico — un PDF
   * da 800 KB passato in base64 a `smistamento.pdf.deposita`, che le docs
   * raccomandano proprio come la via da script, supera il megabyte — e la
   * differenza fra «il registro è muto» e «quella riga era troppo lunga» è
   * tutta la differenza fra cercare per un'ora e correggere in un minuto.
   * `end` e non `destroy`, o la busta non farebbe in tempo a uscire.
   */
  const troppoLunga = (): void => {
    // Una volta sola: `end` non chiude subito in lettura, e i pezzi già in
    // volo farebbero uscire la stessa busta due o tre volte.
    if (rifiutata) return
    rifiutata = true
    void scrivi(presa, null, bustaGuasto(null, -32600, 'La riga supera il limite di 1 MiB.', {
      codice: 'ingresso-non-valido' satisfies Codice,
      messaggi: [
        'Una richiesta JSON-RPC del condotto non può superare 1 MiB per riga.',
        'Per i file grandi si passa un percorso, non il contenuto.',
      ],
    }))
    presa.end()
  }

  presa.on('data', (pezzo: Buffer) => {
    if (rifiutata) return
    resto += decodificatore.write(pezzo)
    let taglio = resto.indexOf('\n')
    while (taglio >= 0) {
      const riga = resto.slice(0, taglio)
      resto = resto.slice(taglio + 1)
      if (riga.length > LIMITE_RIGA) {
        troppoLunga()
        return
      }
      if (riga.trim() !== '') accoda(riga)
      if (rifiutata) return
      taglio = resto.indexOf('\n')
    }
    if (resto.length > LIMITE_RIGA) troppoLunga()
  })

  // Una presa che nessuno usa più non resta appesa. Il timer si azzera a ogni
  // byte nei due sensi, e `accoda` lo ferma finché c'è una chiamata in corso:
  // una chiamata lenta non viene tagliata a metà, e quel che scade è solo il
  // silenzio di una presa che non aspetta niente.
  presa.setTimeout(INATTIVITA_MS, () => presa.end())

  // Una presa che cade a metà non è un guasto del registro: è un programma che
  // ha finito. Senza questo ascoltatore, l'evento `error` di un socket fa
  // cadere il processo che ospita il registro — ma inghiottirli tutti in
  // silenzio, come si faceva, cancella anche i guasti che un guasto lo sono:
  // «un programma ha finito» sono `ECONNRESET` ed `EPIPE`, e basta.
  presa.on('error', (male: Error & { code?: string }) => {
    if (male.code === 'ECONNRESET' || male.code === 'EPIPE') return
    console.error('[condotto] guasto della presa', male.message)
  })
}

// ------------------------------------------------------------------- l'avvio

// Esportata anche se nessun altro file la nomina: compare nella firma di
// `avviaCondotto`, che e' esportata. `npm run census` la segnala come «da rendere
// interna» perche' guarda chi la cita, non chi la puo' raggiungere per
// inferenza — e toglierle l'`export` diventerebbe un errore il giorno in cui
// `tsconfig.json` accende l'emissione dei `.d.ts`.
interface OpzioniCondotto {
  /**
   * La cartella dei dati dell'applicazione — `app.getPath('userData')`, cioè
   * `contesto.globalStorageUri.fsPath`. Entra nell'impronta del nome: due
   * installazioni non si incrociano.
   */
  cartellaUtente?: string
  /**
   * Scavalca le impostazioni. Esiste per le prove, che non hanno un file di
   * impostazioni da accendere; nell'applicazione non lo passa nessuno.
   */
  permessi?: Permessi
}

/**
 * Un condotto acceso, o il niente che resta quando non lo si è acceso.
 *
 * `dispose` smette di accettare e chiude; `svuotato` è la promessa che le
 * chiamate **già cominciate** sono finite. Sono due cose e non una perché
 * `apparato.Smaltitore` butta via quel che il disposer restituisce: chi
 * spegne il registro deve poter aspettare che l'ultima scrittura entrata dal
 * condotto sia arrivata in fondo, o la scrive dopo il salvataggio finale e non
 * la scrive in nessun file.
 */
export interface Condotto extends apparato.Smaltibile {
  svuotato (): Promise<void>
}

/**
 * Se le impostazioni di adesso vogliono un condotto in ascolto.
 *
 * La legge `osservaCondotto` in `startup.ts`, e sta qui e non di là perché la
 * gerarchia «il generale prima di tutto» è già scritta due volte — nel
 * manifesto delle impostazioni e in `permessiDalleImpostazioni` — e una terza
 * copia sarebbe quella che resta indietro. Serve a distinguere il cambio che
 * richiede di riaprire la pipe da quello che non la tocca: i permessi si
 * rileggono a ogni chiamata, quindi strappare le connessioni aperte ogni volta
 * che si tocca una spunta sarebbe un prezzo pagato per niente.
 */
export function condottoDaAprire (): boolean {
  const p = permessiOra()
  return p.lettura || p.scrittura
}

/** Che si dica una volta sola: a ogni finestra aperta sarebbe rumore. */
let dettoSpento = false

/** Un condotto che non c'è: si smaltisce e non c'è niente da aspettare. */
function condottoSpento (): Condotto {
  const smaltitore = new apparato.Smaltitore(() => undefined)
  return { dispose: () => smaltitore.dispose(), svuotato: () => Promise.resolve() }
}

/**
 * Accende il condotto, se le impostazioni concedono qualcosa.
 *
 * Torna sempre qualcosa da smaltire, anche da spento: chi chiama lo registra
 * fra le altre chiusure senza dover sapere se è successo qualcosa.
 */
export async function avviaCondotto (
  archivio: Archivio,
  opzioni: OpzioniCondotto = {},
): Promise<Condotto> {
  if (opzioni.cartellaUtente) cartellaUtenteVista = opzioni.cartellaUtente

  permessiScavalcati = opzioni.permessi ?? null
  const permessi = permessiOra()
  // Niente da concedere, niente da aprire: un condotto in ascolto che rifiuta
  // ogni chiamata sarebbe un nome riservato e un processo in più in cambio di
  // nessuna capacità.
  if (!permessi.lettura && !permessi.scrittura) {
    if (!dettoSpento) {
      dettoSpento = true
      // Due silenzi diversi, e confonderli costa un pomeriggio: il generale
      // spento è il caso normale, il generale acceso con tutto negato sotto è
      // una configurazione che *sembra* aperta e non lo è. Chi ci finisce
      // dentro cerca il guasto nel condotto, e il guasto non c'è.
      console.log(
        apparato.impostazioni.leggi('registroDocenti.api').get<boolean>('condotto', false)
          ? '[condotto] acceso ma senza concessioni: «registroDocenti.api.lettura» e ' +
            '«registroDocenti.api.scrittura» sono tutte e due spente, e un condotto che ' +
            'rifiuta ogni chiamata non vale un nome riservato. Non apre niente.'
          : '[condotto] spento. Si accende con «registroDocenti.api.condotto»: da acceso, ogni ' +
            'programma che gira con questo utente può leggere i dati delle persone in ' +
            'formazione, e con «registroDocenti.api.scrittura» scrivere nel registro e far ' +
            'partire posta a nome del docente.',
      )
    }
    return condottoSpento()
  }

  registraTutte()
  // Il segreto prima del nome, perché il nome lo contiene: vedi `FILE_SEGRETO`.
  if (process.platform === 'win32') {
    segretoDelCondotto(cartellaUtenteVista ?? cartellaUtentePredefinita())
  }
  const indirizzo = indirizzoCondotto()

  // Un socket rimasto in giro da una chiusura brutale impedirebbe l'ascolto.
  // Toglierlo è sicuro: quel nome lo decide l'impronta, e non può essere di
  // qualcun altro. Su Windows non serve — le named pipe non lasciano file.
  if (process.platform !== 'win32') await unlink(indirizzo).catch(() => undefined)

  const stato: StatoCondotto = { chiuso: false, code: new Map() }
  const prese = new Set<Socket>()
  const server = createServer((presa) => {
    // Il tetto prima di tutto, e detto: senza, l'insieme cresceva finché il
    // sistema dava descrittori. Una busta e un `end`, non un `destroy`, perché
    // «sono troppe» è una diagnosi e un EOF non lo è.
    if (prese.size >= MASSIMO_PRESE) {
      presa.end(bustaGuasto(null, CODICI_JSONRPC['non-disponibile'],
        `Il condotto regge ${MASSIMO_PRESE} connessioni insieme, e sono tutte occupate.`, {
          codice: 'non-disponibile' satisfies Codice,
          messaggi: ['Si riprova quando una delle connessioni aperte si chiude.'],
        }))
      return
    }
    prese.add(presa)
    presa.on('close', () => {
      prese.delete(presa)
      stato.code.delete(presa)
    })
    servi(archivio, presa, stato)
  })

  await new Promise<void>((risolvi, rifiuta) => {
    const alGuasto = (male: Error & { code?: string }) => {
      // Un ascolto che non parte lascia comunque un server costruito: chiuderlo
      // qui evita che resti appeso al ciclo degli eventi di chi ha appena
      // ricevuto l'eccezione e non ha più niente su cui chiamare `dispose`.
      server.close()
      // `EADDRINUSE` non è «non è partito»: è «quel nome ce l'ha già qualcuno»,
      // ed è una diagnosi. Può essere una copia del registro rimasta viva —
      // normale — oppure, su unix con il socket in `/tmp`, un file che un altro
      // utente ha creato per primo a quel nome. Chi legge la console deve
      // sapere quale delle due andare a guardare, perché sono due giornate
      // diverse.
      //
      // `EACCES` è la stessa diagnosi vista da Windows: la pipe con quel nome
      // l'ha creata per prima un altro utente della macchina, e aprirla non è
      // permesso. Senza questa riga usciva l'errore nudo di `listen`, che non
      // dice di andare a guardare chi tiene quel nome.
      if (male.code === 'EADDRINUSE' || male.code === 'EACCES') {
        rifiuta(new Error(
          `il nome «${indirizzo}» è già preso: o c’è un’altra copia del registro in ascolto, ` +
          'o quel nome l’ha occupato qualcun altro. Il registro parte senza condotto.',
        ))
        return
      }
      rifiuta(male)
    }
    server.once('error', alGuasto)
    server.listen(indirizzo, () => {
      server.off('error', alGuasto)
      risolvi()
    })
  })

  // Solo il proprietario, e subito: su unix il permesso del file *è* il
  // controllo d'accesso del socket. Fra `listen` e questa riga c'è una finestra
  // di microsecondi, ed è il meglio che il sistema permetta.
  if (process.platform !== 'win32') await chmod(indirizzo, 0o600)

  // Dopo l'ascolto il guasto non è più un avvio fallito: è una presa andata
  // storta. Si racconta e non si lascia cadere il processo.
  server.on('error', (male: Error) => {
    console.error('[condotto]', male.message)
  })

  const concesso = [
    permessi.lettura ? 'lettura' : null,
    permessi.scrittura ? 'scrittura' : null,
  ].filter((voce) => voce !== null).join(' e ')
  console.log(`[condotto] in ascolto su ${indirizzo} — concessa la ${concesso}`)

  /**
   * La chiusura in due tempi.
   *
   * Prima si smette di accettare — il server e, con `stato.chiuso`, anche le
   * righe che arrivassero su una connessione già aperta, che ricevono un no
   * che si legge. Poi si aspettano le chiamate **già cominciate**: distruggere
   * le prese subito, come si faceva, non annullava niente — la `rispondi` in
   * corso proseguiva, la scrittura entrava nell'archivio, e solo alla fine
   * `scrivi` trovava la presa distrutta e non scriveva. Chi aveva chiamato
   * riceveva il nulla per una modifica che era stata fatta.
   *
   * L'attesa ha un tetto perché uno spegnimento che non finisce è peggio di
   * una risposta persa: passati quei secondi si distrugge comunque.
   */
  const svuota = async (): Promise<void> => {
    const attese = [...stato.code.values()]
    if (attese.length === 0) return
    let sveglia: NodeJS.Timeout | undefined
    const tetto = new Promise<void>((risolvi) => {
      sveglia = setTimeout(() => {
        console.error(
          `[condotto] ${attese.length} chiamate non sono finite entro ` +
          `${ATTESA_SVUOTAMENTO_MS} ms: si chiude lo stesso.`,
        )
        risolvi()
      }, ATTESA_SVUOTAMENTO_MS)
      // Un timer che tiene sveglio il processo durante lo spegnimento sarebbe
      // esattamente il contrario di quel che serve.
      sveglia.unref?.()
    })
    await Promise.race([Promise.allSettled(attese).then(() => undefined), tetto])
    if (sveglia) clearTimeout(sveglia)
  }

  let finito: Promise<void> | null = null
  const smaltitore = new apparato.Smaltitore(() => {
    stato.chiuso = true
    server.close()
    finito = svuota().then(() => {
      for (const presa of prese) presa.destroy()
      prese.clear()
      stato.code.clear()
      if (process.platform !== 'win32') void unlink(indirizzo).catch(() => undefined)
    })
  })

  return {
    dispose: () => smaltitore.dispose(),
    svuotato: () => finito ?? Promise.resolve(),
  }
}

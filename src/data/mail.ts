// Le comunicazioni: come escono dal registro, e per quale strada.
//
// Due strade, e la seconda è il ripiego della prima.
//
// La prima è la consegna a Exchange, in `exchange.ts`: il registro si collega
// a `smtp.office365.com` con il gettone di Microsoft e consegna il messaggio.
// Funziona su qualunque sistema, con il programma di posta chiuso, e non
// chiede niente a niente di installato sopra. È l'unica in cui il registro sa
// che cosa è partito e che cosa no, uno per uno.
//
// La seconda è il file `.eml`, che funziona dappertutto e senza collegare
// niente: il messaggio scritto su disco — destinatari, copia nascosta,
// allegati e firma già dentro — da aprire nel programma di posta e mandare a
// mano. È il ripiego di quando la casella non è collegata, e non fallisce mai.
//
// Il prezzo della seconda, da tenere presente: il registro non vede partire
// niente. Chi ha premuto Invia glielo dice con la spunta, e il registro gli
// crede. Con la prima quella domanda non serve più.
//
// ## Le due strade che sono cadute
//
// **Outlook classico, comandato con COM.** Gli si faceva comporre il messaggio
// nel programma installato. Voleva Windows, Outlook *classico*, e quella
// casella dentro quel profilo; il nuovo Outlook COM non lo espone, e su molte
// macchine è l'unico che c'è. Quel che restava era un OUTLOOK.EXE appeso a
// vuoto da chiudere a mano.
//
// **Graph.** Il messaggio nasceva dentro la casella sul server: bozze vere,
// rileggibili dal telefono, e copia in «Posta inviata». Era la via migliore
// sulla carta e costava cara — un modulo di trecento righe, il caricamento
// degli allegati a pezzi, e soprattutto `Mail.ReadWrite`, che è il permesso di
// leggere *tutta* la casella, chiesto da un programma che deve solo spedire.
// SMTP ne chiede uno, `SMTP.Send`, e non lascia leggere niente. Per un
// registro di classe è il baratto giusto: si perde la bozza sul server, che il
// file `.eml` fa lo stesso su questo disco.
//
// Come si scrive il file sta nel dominio, in `communications.ts`: là è codice
// puro e si prova senza un'applicazione intorno. Qui c'è solo il disco.

import * as apparato from 'apparato'

import {
  componiCasella,
  descriviCasella,
  sembraIndirizzo,
  stessoIndirizzo,
} from '../domain/mailbox.js'
import { componiEml, schiacciaNome, type MessaggioPosta } from '../domain/communications.js'
import { casella, scriviCasella, type Casella } from './mailbox.js'
import { apriConIlSistema } from './opening.js'
import { nomeFileArchivio } from './filing.js'
import {
  collegato as accountCollegato,
  conto as contoExchange,
  contoScritto,
  provaExchange,
  spedisciConExchange,
} from './exchange.js'
import {
  azzeraOauth,
  collegaConOauth,
  dimenticaOauth,
} from './oauth.js'
import type { MessaggioFallito } from '../domain/communications.js'
import { firmaPosta } from './templates.js'
import { cartellaAnno, nomeSicuro } from './paths.js'

export type { AllegatoPosta, MessaggioPosta } from '../domain/communications.js'

/**
 * L'indirizzo da cui si scrive, se qualcuno l'ha detto al registro.
 *
 * Non è una credenziale e non serve a entrare da nessuna parte: è quel che
 * finisce in «Da» — nel file `.eml`, nella busta per il server. Chi entra e chi scrive li tiene insieme la casella, ed è lei a
 * dire che con uno solo scritto l'altro gli è uguale.
 */
export function mittente (): string {
  return casella()?.mittente ?? ''
}

/**
 * Il messaggio con dentro chi lo manda.
 *
 * Una mail tutta in copia nascosta non ha nessuno nel campo «A»: aperta così,
 * la bozza si presenta senza destinatari e il tasto Invia non fa partire
 * niente. Ci si mette il proprio indirizzo, com'è d'uso per una circolare — ed
 * è quel che faceva l'invio di prima, che il mittente ce l'aveva sottomano. Se
 * nessuno l'ha detto al registro si lascia com'è: meglio una bozza da
 * completare a mano che un «A» inventato.
 */
function conMittente (messaggio: MessaggioPosta): MessaggioPosta {
  const chi = mittente()
  return {
    ...messaggio,
    da: messaggio.da ?? (chi || undefined),
    a: (messaggio.a ?? []).length > 0 ? messaggio.a : chi ? [chi] : messaggio.a,
  }
}

/**
 * Se il registro può spedire da sé, senza passare da una bozza da rileggere.
 *
 * Spenta di suo, e si accende a mano: quel che parte non si richiama, e una
 * mail a venticinque famiglie mandata per sbaglio non la si toglie più dalle
 * loro caselle. Chi la accende sa che cosa sta accendendo — e il registro
 * chiede comunque conferma, una volta per giro, prima di far partire qualcosa.
 *
 * Accenderla non basta: ci vuole anche una strada per uscire — l'account
 * collegato a Exchange, o Outlook sulla macchina. Le due cose stanno separate
 * apposta: «voglio che parta da sé» e «da qui si può» sono domande diverse, e
 * confonderle vuol dire spegnere l'invio diretto per un guasto di rete.
 */
export function invioDiretto (): boolean {
  return (
    apparato.impostazioni.leggi('registroDocenti.posta').get<boolean>('invioDiretto') ?? false
  )
}

/**
 * Se il registro può spedire da sé, adesso.
 *
 * Due condizioni e non una: l'interruttore acceso, e una casella collegata da
 * cui far partire qualcosa. Stanno separate apposta — «voglio che parta da sé»
 * e «da qui si può» sono domande diverse, e confonderle vuol dire spegnere
 * l'invio diretto per un guasto di rete.
 */
export async function puoSpedire (): Promise<boolean> {
  return invioDiretto() && (await accountCollegato())
}

/** Com'è messo il collegamento con la posta, detto in una riga. */
interface StatoPosta {
  /** Vero quando il registro potrebbe spedire adesso, senza altro da fare. */
  collegato: boolean
  /** La casella da cui partirebbero: è l'indirizzo che si vede scritto. */
  casella: string
  /** Quel che si dice a chi guarda: com'è andata, e che cosa manca. */
  testo: string
  livello: 'info' | 'avviso' | 'errore'
}

/** La coda del messaggio: che cosa succede al prossimo giro di comunicazioni. */
function codaInvio (): string {
  return invioDiretto()
    ? 'L’invio diretto è acceso: le comunicazioni partono da qui.'
    : 'L’invio diretto è spento: le comunicazioni restano bozze da rileggere.'
}

/**
 * Prova il collegamento e racconta com'è andata.
 *
 * Esiste per una domanda sola, e la domanda è giusta: «collegato a che cosa?».
 * Fin qui il registro diceva di saper spedire e non lo si poteva verificare se
 * non mandando una mail vera a qualcuno — che è il modo peggiore di scoprire
 * che la casella era quella sbagliata. Questa apre il collegamento, si
 * autentica, e non manda niente.
 *
 * Quel che non può dire, e va saputo: che il server accetti l'autenticazione
 * non vuol dire che accetti la consegna. Per quello c'è `inviaProva`, che
 * manda davvero.
 */
export async function provaCollegamento (): Promise<StatoPosta> {
  const suo = contoExchange()

  if (contoScritto() && (await accountCollegato())) {
    const esito = await provaExchange()
    if (esito.ok) {
      return {
        collegato: true,
        casella: suo.mittente,
        livello: 'info',
        testo:
          `Il server risponde: ${descriviCasella({ accesso: suo.utente, mittente: suo.mittente })} ` +
          `su ${esito.dove}. ${codaInvio()}`,
      }
    }
    // Il server non ha accettato: non si finge che vada, ma si dice anche che
    // le comunicazioni escono lo stesso — chi legge deve sapere che il
    // registro non è fermo.
    return {
      collegato: false,
      casella: '',
      livello: 'errore',
      testo:
        `${esito.errore ?? 'Il server non ha detto niente.'} ` +
        'Fino a che non si rimedia, le comunicazioni escono come file .eml.',
    }
  }

  // Un conto scritto a metà: l'indirizzo c'è, e quel che apre la casella no. È
  // il caso di chi ha compilato le impostazioni e non ha ancora collegato
  // l'account, e non è un guasto — è un passo che manca, e va detto come tale.
  const daCollegare =
    contoScritto() && !(await accountCollegato()) ? `L’account ${suo.utente} non è collegato. ` : ''

  return {
    collegato: false,
    casella: '',
    livello: 'avviso',
    testo:
      `${daCollegare}Senza casella collegata le comunicazioni escono come file .eml, che il ` +
      'registro apre nel programma di posta: a spedirle sei tu, e le spunti quando sono partite.',
  }
}

/** Come è andata la preparazione di una bozza. */
interface EsitoBozza {
  ok: boolean
  errore?: string
  /** Il file `.eml` scritto, da aprire o da mostrare nella sua cartella. */
  file?: apparato.Uri
}

/**
 * Dove finiscono le bozze: `esportazioni/docente-di-classe/<classe>/classe/`.
 *
 * Con il resto di quel che il registro stampa per quella classe, e non in una
 * cartella temporanea: una bozza non è uno scarto della macchina — è il
 * messaggio che si sta per mandare a venticinque famiglie, e chi lo rilegge
 * prima di premere Invia deve poterlo ritrovare dov'è tutto il resto. La
 * cartella `esportazioni/` è fatta apposta per questo: si può svuotare per
 * intero senza perdere niente, e si tiene fuori da Git con una riga sola.
 */
async function cartellaBozze (classe: string): Promise<apparato.Uri> {
  // Una cartella vera sul disco, e non una voce del documento: le bozze le
  // apre e le riscrive Outlook, che dentro un archivio non sa scrivere. Vale la
  // stessa regola della cassetta della posta — quel che si scambia con un altro
  // programma resta un file — e stanno accanto a lei, dentro la cartella
  // dell'anno.
  const anno = cartellaAnno()
  if (!anno) throw new Error('Nessun anno aperto: le bozze non si sanno dove mettere.')
  const cartella = apparato.Uri.joinPath(anno, 'bozze', nomeSicuro(classe) || 'classe')
  await apparato.file.createDirectory(cartella)
  return cartella
}

/**
 * Come si chiama la bozza di un messaggio: classe, di che cosa parla, di chi
 * — lo stesso nome che porterebbe un documento archiviato — e di quando.
 *
 * Serve perché le bozze di un giro stanno tutte nella stessa cartella: una per
 * allievo, e venticinque file che si chiamano tutti «richiesta.eml» non si
 * distinguono. Con il nome dentro si mettono anche in fila da soli.
 *
 * `periodo` è la parte che le distingue nel tempo, e la scrive
 * `periodoNelNome`, in `domain/dates.ts`. Senza, la richiesta di firma di
 * settembre e quella di gennaio si chiamano uguale e la seconda cancella la
 * prima: stessa classe, stesso allievo, stesso argomento — e la cartella delle
 * bozze non tiene più di un giro alla volta.
 */
export function nomeBozza (
  classe: string,
  chi: string | null,
  argomento: string,
  periodo: string | null = null,
): string {
  return nomeFileArchivio(classe, chi, argomento, periodo, '.eml')
}

/**
 * Scrive la bozza nella cartella data e torna il file.
 *
 * Non la apre: chi ne prepara una sola la apre subito, chi ne prepara
 * venticinque apre la cartella — venticinque finestre di posta aperte insieme
 * non sono una comodità, sono un guaio.
 */
async function preparaBozza (
  messaggio: MessaggioPosta,
  cartella: apparato.Uri,
  nome: string,
): Promise<EsitoBozza> {
  if (messaggio.ccn.length === 0 && (messaggio.a ?? []).length === 0) {
    return { ok: false, errore: 'Nessun destinatario.' }
  }

  // Senza firma, e apposta: il file si apre nel programma di posta, che alla
  // bozza attacca la sua. Con quella del registro dentro ne arrivavano due,
  // una sotto l'altra. La firma di `templates/_firma.html` resta per le vie
  // in cui il messaggio non passa da una finestra di posta: la consegna
  // diretta al server, e Outlook comandato dal registro.
  const completo = { ...conMittente(messaggio), firma: undefined }

  const file = apparato.Uri.joinPath(
    cartella,
    nome.toLowerCase().endsWith('.eml') ? nome : `${schiacciaNome(nome)}.eml`,
  )
  try {
    await apparato.file.writeFile(file, Buffer.from(componiEml(completo), 'utf8'))
    return { ok: true, file }
  } catch (errore) {
    return { ok: false, errore: `La bozza non si è potuta scrivere: ${(errore as Error).message}` }
  }
}

/** Come è finita una bozza: il file scritto, e se il registro l'ha già spedita. */
interface DoveLaBozza extends EsitoBozza {
  /**
   * Vero quando è già partita, e non c'è più niente da premere.
   *
   * Chi chiama la guarda per sapere se deve ancora domandare «l'hai spedita?»:
   * con l'invio diretto quella domanda non ha senso, la risposta la sa il
   * registro.
   */
  spedita: boolean
}

/**
 * Prepara una comunicazione sola e la mette davanti a chi la deve mandare — o
 * la spedisce, se il registro è stato messo in condizione di farlo.
 *
 * Con l'invio diretto acceso parte e basta: nessuna finestra, e il registro sa
 * che cosa è uscito. Senza — o se spedire non è riuscito — si ripiega sulla
 * bozza, che è quel che si sarebbe fatto comunque: meglio un messaggio da
 * mandare a mano che una comunicazione persa per strada.
 */
export async function apriBozzaSingola (
  messaggio: MessaggioPosta,
  classe: string,
  nome: string,
): Promise<DoveLaBozza> {
  if (await puoSpedire()) {
    const esito = await spedisciConExchange([conMittente(messaggio)])
    if (esito.ok) return { ok: true, spedita: true }
  }
  return await apriBozza(messaggio, classe, nome)
}

/**
 * La bozza e basta, senza mai spedire: il file `.eml` scritto e aperto nel
 * programma di posta, o — per chi l'ha scelto — la finestra di Outlook.
 *
 * È il gesto del pulsante «Apri» nell'elenco, e vale anche per una
 * comunicazione già aperta una volta: la bozza si riscrive com'è oggi e si
 * riapre. Che cosa ne è stato dopo lo dice la spunta, non una domanda.
 */
async function apriBozza (
  messaggio: MessaggioPosta,
  classe: string,
  nome: string,
): Promise<DoveLaBozza> {
  const cartella = await cartellaBozze(classe)
  const esito = await preparaBozza(messaggio, cartella, nome)
  if (!esito.ok || !esito.file) return { ...esito, spedita: false }
  if (!(await apriConIlSistema(esito.file))) {
    return {
      ok: false,
      spedita: false,
      errore: `La bozza è pronta ma non si è aperta da sola: sta in ${esito.file.fsPath}`,
      file: esito.file,
    }
  }
  return { ...esito, spedita: false }
}

/** Com'è finito un giro: dove sono i messaggi, e chi è rimasto indietro. */
interface EsitoGiro {
  ok: boolean
  /** Vero quando sono già partiti: non c'è più niente da premere. */
  spediti: boolean
  dove: string
  /**
   * Chi è rimasto fuori, per posizione nell'elenco passato.
   *
   * Con l'invio diretto è la parte che conta: chi chiama segna spediti tutti
   * gli altri, e questi no. Senza, è sempre vuoto — un file scritto o una
   * bozza salvata non falliscono uno per uno.
   */
  falliti: MessaggioFallito[]
  errore?: string
}

/**
 * Un giro di comunicazioni: spedite, se il registro può; altrimenti bozze
 * nella casella se Outlook c'è, altrimenti file `.eml`.
 *
 * Le bozze non si aprono: restano fra le bozze della casella, da mandare una
 * alla volta — anche il giorno dopo, e anche da un altro computer, perché
 * stanno sul server e non su questo disco.
 *
 * Con l'invio diretto partono tutte insieme, e quel che non parte torna
 * indietro nome per nome: un giro non è una cosa sola che riesce o fallisce,
 * sono venticinque, e diciassette famiglie avvisate restano avvisate anche se
 * la diciottesima non lo è.
 */
export async function bozzeDiGruppo (
  messaggi: Array<{ messaggio: MessaggioPosta, nome: string }>,
  classe: string,
): Promise<EsitoGiro> {
  if (await puoSpedire()) {
    const esito = await spedisciConExchange(messaggi.map((m) => conMittente(m.messaggio)))
    if (esito.ok) {
      return {
        ok: true,
        spediti: true,
        dove: 'il server della posta',
        falliti: esito.falliti,
      }
    }
    // Non è partito niente: si ripiega sulle bozze, come se l'invio diretto
    // non ci fosse. Quel che è partito davvero, se qualcosa è partito, lo dice
    // `ok` — e qui `ok` è falso.
  }

  const cartella = await cartellaBozze(classe)
  const scritte: apparato.Uri[] = []
  for (const { messaggio, nome } of messaggi) {
    const esito = await preparaBozza(messaggio, cartella, nome)
    if (!esito.ok) {
      return {
        ok: false,
        spediti: false,
        dove: cartella.fsPath,
        falliti: [],
        errore: esito.errore,
      }
    }
    if (esito.file) scritte.push(esito.file)
  }

  // Una sola bozza si apre da sé: un giro per un allievo solo è lo stesso
  // gesto della comunicazione singola, e far aprire a mano un file dentro una
  // cartella è un passaggio in più che non serve a niente.
  //
  // Da due in su no, e non è pigrizia: venticinque finestre di posta aperte
  // insieme non sono una comodità: si apre la cartella, e si mandano una alla
  // volta.
  if (scritte.length === 1) {
    if (await apriConIlSistema(scritte[0])) {
      return {
        ok: true,
        spediti: false,
        dove: 'il programma di posta',
        falliti: [],
      }
    }
  }

  await mostraCartellaBozze(cartella)
  return { ok: true, spediti: false, dove: cartella.fsPath, falliti: [] }
}

/** Mostra la cartella delle bozze, per aprirle una a una e spedirle. */
async function mostraCartellaBozze (cartella: apparato.Uri): Promise<void> {
  try {
    await apparato.comandi.esegui('apparato.mostraNellaCartella', cartella)
  } catch {
    // Non essere riusciti a mostrarla non toglie che le bozze ci siano: il
    // percorso viene detto comunque a chi ha chiesto.
  }
}

/**
 * Chiede il permesso di spedire, prima di spedire.
 *
 * L'altra domanda — «le hai spedite?» — arriva dopo e si fida di chi risponde.
 * Questa arriva prima ed è di un altro tipo: dopo non si torna indietro. Una
 * mail partita sta nella casella di chi la riceve, e nessun tasto del registro
 * la toglie da lì.
 *
 * Si domanda una volta per giro e non una per messaggio: venticinque finestre
 * di conferma si chiudono a occhi chiusi, ed è esattamente il contrario di
 * quel che una conferma serve a ottenere.
 */
export async function confermaInvio (domanda: string, dettaglio: string): Promise<boolean> {
  const manda = 'Spedisci ora'
  const scelta = await apparato.dialoghi.avvisa(
    domanda,
    { modal: true, detail: `${dettaglio}

Quel che parte non si può richiamare.` },
    manda,
  )
  return scelta === manda
}

// La domanda «l'hai spedita?» non c'è più. Il registro non può sapere da sé
// che cosa è partito dal programma di posta, e prima lo domandava con una
// finestra subito dopo aver aperto la bozza — cioè nel momento in cui nessuno
// l'ha ancora mandata. Adesso lo dice chi spedisce, quando l'ha fatto, con la
// spunta accanto alla comunicazione: `comunicazione.spunta`, `assenze.spunta`,
// e per i documenti la spunta di consegna che c'era già.

// ------------------------------------------------------------------ la mail di prova

/**
 * Manda una mail vera a un indirizzo che si sceglie, e racconta com'è andata.
 *
 * È l'unica prova che prova davvero. `provaCollegamento` bussa al server e si
 * fa dire di chi è la casella: verifica il gettone, e si ferma lì. Tutto quel
 * che viene dopo — il permesso di *spedire*, che è diverso da quello di
 * entrare; la firma che si carica o non si carica; il corpo che arriva in HTML
 * o a pezzi; il limite che Exchange mette al peso — si scopre solo mandando.
 * Fin qui lo si scopriva al primo giro, con venticinque famiglie come
 * cavie.
 *
 * Il destinatario lo si scrive ogni volta, e la casella arriva già riempita
 * con il proprio indirizzo: mandarla a sé stessi è quel che si vuole fare
 * quasi sempre, e la mail di prova che parte per sbaglio a una famiglia è
 * esattamente il danno che questa funzione esiste per evitare.
 *
 * ## Perché non guarda l'invio diretto
 *
 * `invioDiretto` dice se le comunicazioni partono da sé, ed è spento di serie
 * apposta. Qui non c'entra: chi preme «Manda una prova» ha chiesto *questo*
 * messaggio, a *questo* indirizzo, adesso. Rispettare l'interruttore vorrebbe
 * dire scrivere una bozza — e allora la prova non proverebbe più la cosa che
 * si voleva provare, cioè che il registro sa spedire.
 */
export async function inviaProva (): Promise<StatoPosta | null> {
  const suo = casella()
  if (!suo) {
    return {
      collegato: false,
      casella: '',
      livello: 'errore',
      testo: 'Nessuna casella scritta nelle impostazioni: prima «Collega la casella».',
    }
  }
  if (!(await accountCollegato())) {
    return {
      collegato: false,
      casella: '',
      livello: 'errore',
      testo:
        'La casella non è collegata: non c’è niente da cui far partire una prova. Premi ' +
        '«Collega la casella», poi riprova.',
    }
  }

  const a = await apparato.dialoghi.chiediTesto({
    title: 'Registro — manda una mail di prova',
    prompt:
      'A che indirizzo mandarla. Parte davvero, adesso, e non si può richiamare: di solito si ' +
      'manda a sé stessi.',
    value: suo.mittente,
    ignoreFocusOut: true,
    validateInput: (scritto) =>
      sembraIndirizzo(scritto) ? null : 'Ci vuole un indirizzo di posta.',
  })
  if (!a) return null

  const quando = new Date().toLocaleString('it-CH')
  const messaggio: MessaggioPosta = {
    oggetto: `Prova del registro — ${quando}`,
    corpo:
      'Questa è una mail di prova mandata dal Registro docenti.\n\n' +
      `Casella: ${descriviCasella(suo)}\n` +
      `Server: ${contoExchange().server}\n` +
      `Quando: ${quando}\n\n` +
      'Se la leggi, il registro sa spedire: la firma qui sotto è quella che le famiglie e le ' +
      'aziende vedranno in fondo a ogni comunicazione. Se manca, o se al posto del testo ci ' +
      'sono dei tag, il file templates/_firma.html va corretto.',
    a: [a.trim()],
    ccn: [],
    firma: await firmaPosta(),
  }

  const esito = await spedisciConExchange([conMittente(messaggio)])
  if (!esito.ok) {
    return {
      collegato: false,
      casella: suo.mittente,
      livello: 'errore',
      testo: `La prova non è partita. ${
        esito.falliti[0]?.errore ?? esito.errore ?? 'Non è arrivata nessuna spiegazione.'
      }`,
    }
  }

  return {
    collegato: true,
    casella: suo.mittente,
    livello: 'info',
    testo:
      `Prova spedita a ${a.trim()}: ${contoExchange().server} l’ha presa in carico. Se non ` +
      'arriva entro qualche minuto, guarda nella posta indesiderata di chi la riceve — da qui ' +
      'in poi il registro non la vede più.',
  }
}

// ------------------------------------------------------------------ collegare l'account

/** I due modi di entrare, come si presentano a chi deve sceglierne uno. */
const MODI = [
  {
    label: 'Account Microsoft, con il codice',
    description: 'da provare per primo',
    detail:
      'La pagina di Microsoft aperta da qualunque browser, anche dal telefono. Non c’è niente da ' +
      'registrare: il registro si presenta con un’applicazione pubblica di Microsoft.',
    modo: 'oauth' as const,
  },
  {
    label: 'Password per le app',
    detail:
      'Una password generata dal profilo Microsoft, valida solo per questo. Funziona senza ' +
      'registrare niente, ma il tenant può averla disattivata.',
    modo: 'password' as const,
  },
]

/**
 * Collega la casella: si sceglie come entrare, si prova, e si salva solo se il
 * server accetta.
 *
 * L'ordine conta. Salvare prima di provare vorrebbe dire tenersi in casa una
 * chiave sbagliata e scoprirlo al primo giro di comunicazioni — con
 * venticinque messaggi pronti e nessuno che parte. Qui quel che apre la
 * casella va nel portachiavi solo dopo che Exchange ha detto di sì.
 *
 * Né la password né il gettone passano dalle impostazioni e toccano il disco
 * del progetto: vanno nel portachiavi del sistema, che è l'unico posto fatto
 * per tenerli. Nelle impostazioni resta l'indirizzo, che non è un segreto.
 */
export async function collegaAccount (): Promise<StatoPosta | null> {
  const prima = casella()

  // Prima l'indirizzo da cui si scrive, che è quello che tutti conoscono; poi
  // il nome con cui si entra, già riempito con lo stesso: chi ne ha uno solo
  // preme Invio, chi ha la sigla della scuola la scrive al posto suo. Nel
  // tenant di una scuola i due sono diversi quasi sempre, e chiederne uno
  // solo voleva dire spedire dalla sigla o non riuscire a entrare.
  const scrive = await apparato.dialoghi.chiediTesto({
    title: 'Registro — collega la casella',
    prompt: 'L’indirizzo da cui si scrive, quello che le famiglie vedono: per esempio nome.cognome@edu.ti.ch',
    value: prima?.mittente ?? '',
    ignoreFocusOut: true,
    validateInput: (scritto) => (sembraIndirizzo(scritto) ? null : 'Ci vuole un indirizzo di posta.'),
  })
  if (!scrive) return null

  const entra = await apparato.dialoghi.chiediTesto({
    title: 'Registro — con che nome si entra',
    prompt:
      'Il nome con cui si entra nella casella, se è diverso dall’indirizzo: alla scuola è la ' +
      'sigla, per esempio xxx000@edu.ti.ch. Lascialo uguale all’indirizzo se non ne hai una.',
    value: prima && !stessoIndirizzo(prima.accesso, prima.mittente) ? prima.accesso : scrive.trim(),
    ignoreFocusOut: true,
    validateInput: (scritto) =>
      sembraIndirizzo(scritto) ? null : 'Ci vuole un nome di accesso nella forma di un indirizzo.',
  })
  if (!entra) return null

  const suo = componiCasella(entra, scrive)
  if (!suo) return null

  const scelto = await apparato.dialoghi.chiediScelta(MODI, {
    title: `Registro — come entrare in ${descriviCasella(suo)}`,
    placeHolder: 'Come vuoi collegare la casella?',
    ignoreFocusOut: true,
  })
  if (!scelto) return null

  // La casella va nelle impostazioni prima della prova: da lì la leggono il
  // collegamento a Microsoft — che sul dominio trova a quale organizzazione
  // bussare — e la prova sul server.
  await scriviCasella(suo)

  const esito = await collegaConMicrosoft(suo)
  if (!esito.ok) {
    return {
      collegato: false,
      casella: '',
      livello: 'errore',
      testo: `Account non collegato. ${esito.errore ?? 'Non è arrivata nessuna spiegazione.'}`,
    }
  }

  return {
    collegato: true,
    casella: suo.mittente,
    livello: 'info',
    testo:
      `Account collegato: ${descriviCasella(suo)}, consegna a ${esito.dove}. ` +
      (invioDiretto()
        ? 'L’invio diretto è acceso: le comunicazioni partono da qui.'
        : 'Per far partire le comunicazioni da sé resta da accendere ' +
          'registroDocenti.posta.invioDiretto.'),
  }
}

/**
 * Il collegamento con l'account Microsoft, e poi la prova sul server.
 *
 * Sono due cose distinte e vanno fatte tutte e due: Microsoft può dare il
 * gettone e il server rifiutarlo lo stesso — succede quando l'amministratore
 * ha spento la consegna SMTP sulla casella. Fermarsi al gettone vorrebbe dire
 * dire «collegato» a chi al primo giro non manderà niente.
 */
async function collegaConMicrosoft (
  suo: Casella,
): Promise<{ ok: boolean, dove?: string, errore?: string }> {
  const dato = await collegaConOauth(suo)
  if (!dato.ok) return { ok: false, errore: dato.errore }

  const esito = await apparato.dialoghi.conAvanzamento(
    { location: apparato.DoveAvanzamento.Notification, title: 'Registro: provo a entrare…' },
    async () => await provaExchange(),
  )
  return esito.ok ? { ok: true, dove: esito.dove } : { ok: false, errore: esito.errore }
}

/**
 * Le voci di `registroDocenti.posta` che si azzerano.
 *
 * Sono più di quelle che il manifesto dichiara oggi, ed è voluto: `server`,
 * `porta`, `autenticazione`, `clientId` e `tenant` erano impostazioni delle
 * versioni di prima e restano scritte nel file di chi le ha usate. Nessuno le
 * legge più, ma «azzera la posta» è il gesto di chi vuole il file pulito — ed è
 * l'unico posto da cui quei residui se ne vanno. Una riga in più qui costa
 * niente; lasciarli lì significa che fra un anno qualcuno apre il JSON, legge
 * `server: smtp.altrove.ch` e ci perde un pomeriggio.
 */
const VOCI_POSTA = [
  'utente',
  'mittente',
  'invioDiretto',
  // Tolte dal manifesto, ancora possibili nel file di chi viene da prima.
  'server',
  'porta',
  'autenticazione',
  'clientId',
  'tenant',
]

/**
 * Azzera la posta per intero: portachiavi, memoria e impostazioni.
 *
 * È più di scollegare. Scollegare toglie la chiave e lascia l'indirizzo, per
 * ricollegare in fretta; questo toglie anche l'indirizzo, il tenant ricordato,
 * l'ID applicazione, l'invio diretto — tutto quel che un tentativo andato
 * storto può essersi lasciato dietro. Serve quando «non funziona» e non si sa
 * più da dove venga: si torna al primo avvio e si rifà il collegamento da
 * capo, con le domande giuste.
 *
 * Le impostazioni si tolgono su tutti e tre gli ambiti, e il giro è cerimonia:
 * `environment/settings.ts` dichiara che «`AmbitoImpostazione` si accetta ma
 * non si guarda — sul desktop non ci sono tre livelli, ce n'è uno solo, e i tre
 * finiscono tutti nello stesso file», quindi la prima cancellazione basta e le
 * altre due non fanno niente. Si lasciano perché costano niente e perché il
 * giorno in cui i livelli tornassero a essere tre questa funzione sarebbe già
 * giusta. Qui c'era scritto che una voce dimenticata in `.vscode/settings.json`
 * vince su quella dell'utente: era la motivazione di un altro programma,
 * scritta con la sicurezza di chi sa, e faceva credere a chi legge che una
 * precedenza fra livelli esista.
 *
 * Quel che resta fuori portata è l'autorizzazione data al programma nel
 * profilo Microsoft: di là si revoca, e non da qui.
 */
export async function azzeraPosta (): Promise<StatoPosta> {
  await azzeraOauth()

  const impostazioni = apparato.impostazioni.leggi('registroDocenti.posta')
  const livelli = [
    apparato.AmbitoImpostazione.Global,
    apparato.AmbitoImpostazione.Workspace,
    apparato.AmbitoImpostazione.CartellaDiLavoro,
  ]
  for (const voce of VOCI_POSTA) {
    for (const livello of livelli) {
      try {
        await impostazioni.update(voce, undefined, livello)
      } catch {
        // Senza cartella aperta il livello «cartella» non esiste: non è un
        // guasto, è un posto in cui non c'era niente da togliere.
      }
    }
  }

  return {
    collegato: false,
    casella: '',
    livello: 'info',
    testo:
      'Posta azzerata: tolti il gettone dal portachiavi, quelli in memoria, i tenant ricordati ' +
      'e tutte le impostazioni registroDocenti.posta.*. Ora si riparte da zero con «Collega la ' +
      'casella di posta».',
  }
}

/**
 * Scollega la casella: il gettone sparisce dal portachiavi.
 *
 * L'indirizzo resta scritto nelle impostazioni, ed è voluto: ricollegare vuol
 * dire rifare l'accesso e basta. Quel che se ne va è la sola cosa che
 * permetteva di spedire.
 */
export async function scollegaAccount (): Promise<StatoPosta> {
  await dimenticaOauth()
  return {
    collegato: false,
    casella: '',
    livello: 'info',
    testo:
      'Account scollegato: il registro non usa più l’autorizzazione di Microsoft, che resta ' +
      'visibile nel profilo Microsoft sotto le app collegate e di là si revoca. Le ' +
      'comunicazioni tornano a uscire come file .eml.',
  }
}

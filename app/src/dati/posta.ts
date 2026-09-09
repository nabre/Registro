// Le comunicazioni: come escono dal registro, e per quale strada.
//
// Tre strade, dalla migliore alla più povera, e si prende la prima percorribile.
//
// La prima è il collegamento diretto a Exchange, in `exchange.ts`: il registro
// consegna il messaggio al server della scuola con le credenziali della
// casella, e sa che cosa è partito e che cosa no, uno per uno. Funziona su
// qualunque sistema, con Outlook chiuso, e non chiede niente a nessun
// programma installato sopra.
//
// La seconda è Outlook, in `outlook.ts`: la casella è già collegata lì, e gli
// si fa comporre il messaggio. Vale su Windows, con Outlook installato, e va
// bene anche per le bozze — che sono la cosa che il collegamento diretto non
// sa fare, perché SMTP consegna e basta.
//
// La terza è il file `.eml`, che funziona dappertutto: il messaggio scritto su
// disco — destinatari, copia nascosta, allegati e firma già dentro — da aprire
// nel programma di posta e mandare a mano.
//
// Il prezzo delle ultime due, da tenere presente: il registro non vede partire
// niente. Chi ha premuto Invia glielo dice, e il registro gli crede. Con il
// collegamento diretto quella domanda non serve più.
//
// Come si scrive il file sta nel dominio, in `comunicazioni.ts`: là è codice
// puro e si prova senza un'applicazione intorno. Qui c'è solo il disco.

import * as vscode from 'vscode'

import {
  componiCasella,
  descriviCasella,
  sembraIndirizzo,
  stessoIndirizzo,
} from '../dominio/casella.js'
import { componiEml, schiacciaNome, type MessaggioPosta } from '../dominio/comunicazioni.js'
import { casella, scriviCasella, type Casella } from './casella.js'
import { apriConIlSistema } from './apertura.js'
import { nomeFileArchivio, percorsoEsportazione } from './archiviazione.js'
import {
  collegato as accountCollegato,
  conto as contoExchange,
  contoScritto,
  dimenticaPassword,
  provaCredenziali,
  provaExchange,
  salvaPassword,
  spedisciConExchange,
  type EsitoInvio,
} from './exchange.js'
import {
  azzeraOauth,
  collegaConOauth,
  contoOauth,
  guidaRegistrazione,
  modoAccesso,
  type ModoAccesso,
} from './oauth.js'
import {
  bozzeInOutlook,
  contiDiOutlook,
  outlookPossibile,
  type MessaggioFallito,
} from './outlook.js'
import { fileAllegato } from './percorsi.js'

export type { AllegatoPosta, MessaggioPosta } from '../dominio/comunicazioni.js'

/**
 * L'indirizzo da cui si scrive, se qualcuno l'ha detto al registro.
 *
 * Non è una credenziale e non serve a entrare da nessuna parte: è quel che
 * finisce in «Da» — nel file `.eml`, nella bozza di Outlook, nella busta per
 * il server. Chi entra e chi scrive li tiene insieme la casella, ed è lei a
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
    vscode.workspace.getConfiguration('registroDocenti.posta').get<boolean>('invioDiretto') ?? false
  )
}

/** Dove nascono le bozze: come file `.eml`, o dentro Outlook classico. */
export type ViaBozze = 'file' | 'outlook'

/**
 * Come nascono le bozze, quando il registro non spedisce da sé.
 *
 * `file` è quella di serie: il registro scrive l'`.eml` e lo apre con il
 * programma che il sistema ha per quei file. Funziona dappertutto, e non ha
 * bisogno che Outlook classico sia installato, aperto, e con la casella giusta
 * — tre cose che sul computer di chi scrive non erano vere, e che si scoprono
 * con un OUTLOOK.EXE appeso a vuoto. Chi ha Outlook classico con la casella
 * dentro lo dice nelle impostazioni, e allora le bozze nascono lì.
 */
export function viaBozze (): ViaBozze {
  const scelta =
    vscode.workspace.getConfiguration('registroDocenti.posta').get<ViaBozze>('bozze') ?? 'file'
  return scelta === 'outlook' && outlookPossibile() ? 'outlook' : 'file'
}

/** Per dove esce una comunicazione che parte da sola. */
export type ViaDiretta = 'exchange' | 'outlook'

/**
 * Da che parte si esce, adesso.
 *
 * Exchange prima di Outlook, e non è una preferenza: è l'unica delle due in
 * cui il registro sa davvero che cosa è partito e che cosa no — il server
 * risponde messaggio per messaggio, mentre Outlook mette in coda e va per i
 * fatti suoi. Se l'account non è collegato si ripiega su Outlook, che almeno
 * su Windows c'è.
 */
export async function viaDiretta (): Promise<ViaDiretta | null> {
  if (await accountCollegato()) return 'exchange'
  if (viaBozze() === 'outlook') return 'outlook'
  return null
}

/** Se in questo momento il registro è in grado di spedire da sé. */
export async function puoSpedire (): Promise<boolean> {
  return invioDiretto() && (await viaDiretta()) !== null
}

/** Com'è messo il collegamento con la posta, detto in una riga. */
export interface StatoPosta {
  /** Vero quando il registro potrebbe spedire adesso, senza altro da fare. */
  collegato: boolean
  /** Per dove uscirebbe una comunicazione: il server, Outlook, o un file. */
  via: ViaDiretta | 'file'
  /** La casella da cui partirebbero: è l'indirizzo che si vede scritto. */
  casella: string
  /** Tutte quelle configurate, quando ce n'è più d'una. */
  caselle: string[]
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
 * Guarda dove si uscirebbe davvero: se l'account è collegato prova il server,
 * altrimenti domanda a Outlook. E dice quel che non torna — un `mittente`
 * scritto nelle impostazioni che fra le caselle di Outlook non c'è, una
 * password che il server non accetta più — due cose che si scoprirebbero
 * altrimenti solo al primo giro, e a giro fatto.
 */
export async function provaCollegamento (): Promise<StatoPosta> {
  const chi = mittente()
  const suo = contoExchange()

  // L'account collegato viene prima: è la strada che il registro percorrerebbe.
  if (contoScritto() && (await accountCollegato())) {
    const esito = await provaExchange()
    if (esito.ok) {
      return {
        collegato: true,
        via: 'exchange',
        casella: suo.mittente,
        caselle: [suo.mittente],
        livello: 'info',
        testo:
          `Exchange risponde: ${descriviCasella({ accesso: suo.utente, mittente: suo.mittente })} ` +
          `su ${esito.dove}, ` +
          `${comeSiEntra(modoAccesso())}. ` +
          codaInvio(),
      }
    }
    // Il server non ha accettato: non si finge che vada, ma si dice anche
    // quale strada resta — con Outlook installato le comunicazioni escono lo
    // stesso, e chi legge deve sapere che il registro non è fermo.
    return {
      collegato: false,
      via: viaBozze(),
      casella: '',
      caselle: [],
      livello: 'errore',
      testo:
        `${esito.errore ?? 'Il server non ha detto niente.'} ` +
        (viaBozze() === 'outlook'
          ? 'Fino a che non si rimedia, le comunicazioni passano da Outlook.'
          : 'Fino a che non si rimedia, le comunicazioni escono come file .eml.'),
    }
  }

  // Un conto scritto a metà: l'indirizzo c'è, la password no. È il caso di chi
  // ha compilato le impostazioni e non ha ancora collegato l'account, e non è
  // un guasto — è un passo che manca, e va detto come tale.
  const daCollegare =
    contoScritto() && !(await accountCollegato())
      ? `L’account ${suo.utente} non è collegato: manca la password. `
      : ''

  if (viaBozze() !== 'outlook') {
    return {
      collegato: false,
      via: 'file',
      casella: '',
      caselle: [],
      livello: 'avviso',
      testo:
        `${daCollegare}Senza account collegato le comunicazioni escono come file .eml, che il ` +
        'registro apre nel programma di posta: a spedirle sei tu, e le spunti quando sono partite.',
    }
  }

  const esito = await contiDiOutlook()
  if (!esito.ok) {
    return {
      collegato: false,
      via: 'file',
      casella: '',
      caselle: [],
      livello: 'errore',
      testo: `${daCollegare}${esito.errore ?? 'Outlook non ha detto niente.'}`,
    }
  }

  const caselle = esito.conti.map((conto) => conto.indirizzo)
  const suoConto = esito.conti.find((conto) => conto.indirizzo.toLowerCase() === chi.toLowerCase())
  // Senza un mittente dichiarato parte dalla prima, che è quel che farebbe
  // Outlook: si dice quale, così non è una sorpresa.
  const casella = suoConto ?? esito.conti[0]

  const pezzi = [`Outlook risponde: ${casella.indirizzo} (${casella.specie})`]
  if (esito.utente) pezzi.push(`profilo di ${esito.utente}`)
  if (caselle.length > 1) pezzi.push(`${caselle.length} caselle configurate`)

  // Un mittente che fra le caselle non c'è: la bozza si aprirebbe dal conto
  // predefinito e non da quello scritto, e chi l'ha scritto crede il contrario.
  if (chi && !suoConto) {
    return {
      collegato: true,
      via: 'outlook',
      casella: casella.indirizzo,
      caselle,
      livello: 'avviso',
      testo:
        `${daCollegare}${pezzi.join(' · ')}. Ma «${chi}», scritto in ` +
        'registroDocenti.posta.mittente, fra le caselle di Outlook non c’è: si spedirebbe da ' +
        `${casella.indirizzo}.`,
    }
  }

  return {
    collegato: true,
    via: 'outlook',
    casella: casella.indirizzo,
    caselle,
    livello: daCollegare ? 'avviso' : 'info',
    testo: `${daCollegare}${pezzi.join(' · ')}. ${codaInvio()}`,
  }
}

/** Come è andata la preparazione di una bozza. */
export interface EsitoBozza {
  ok: boolean
  errore?: string
  /** Il file `.eml` scritto, da aprire o da mostrare nella sua cartella. */
  file?: vscode.Uri
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
export async function cartellaBozze (classe: string): Promise<vscode.Uri> {
  const dentro = percorsoEsportazione(classe, null, 'segnaposto.eml')
  const file = fileAllegato(dentro)
  if (!file) throw new Error('La cartella dei dati non è impostata: le bozze non si sanno dove mettere.')
  const cartella = vscode.Uri.joinPath(file, '..')
  await vscode.workspace.fs.createDirectory(cartella)
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
 * `periodoNelNome`, in `dominio/date.ts`. Senza, la richiesta di firma di
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
export async function preparaBozza (
  messaggio: MessaggioPosta,
  cartella: vscode.Uri,
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

  const file = vscode.Uri.joinPath(
    cartella,
    nome.toLowerCase().endsWith('.eml') ? nome : `${schiacciaNome(nome)}.eml`,
  )
  try {
    await vscode.workspace.fs.writeFile(file, Buffer.from(componiEml(completo), 'utf8'))
    return { ok: true, file }
  } catch (errore) {
    return { ok: false, errore: `La bozza non si è potuta scrivere: ${(errore as Error).message}` }
  }
}

/**
 * Spedisce per la strada che c'è, e racconta com'è andata sempre nello stesso
 * modo: quanti sono partiti, e chi è rimasto indietro.
 *
 * Chi chiama non deve sapere quale delle due era: un giro è un giro, e
 * diciassette famiglie avvisate restano diciassette da qualunque parte siano
 * uscite le mail.
 */
async function spedisciDiretto (messaggi: MessaggioPosta[]): Promise<EsitoInvio> {
  if ((await viaDiretta()) === 'exchange') return await spedisciConExchange(messaggi)
  return await bozzeInOutlook(messaggi, 'spedisci')
}

/** Dove è finita una bozza: dentro la casella, o in un file sul disco. */
export interface DoveLaBozza extends EsitoBozza {
  /** Vero quando è nata dentro Outlook, nella casella Exchange. */
  inCasella: boolean
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
    const esito = await spedisciDiretto([conMittente(messaggio)])
    if (esito.ok) return { ok: true, inCasella: true, spedita: true }
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
export async function apriBozza (
  messaggio: MessaggioPosta,
  classe: string,
  nome: string,
): Promise<DoveLaBozza> {
  if (viaBozze() === 'outlook') {
    const esito = await bozzeInOutlook([conMittente(messaggio)], 'mostra')
    if (esito.ok) return { ok: true, inCasella: true, spedita: false }
    // Non è un fallimento da raccontare: è il momento in cui si cambia strada.
  }

  const cartella = await cartellaBozze(classe)
  const esito = await preparaBozza(messaggio, cartella, nome)
  if (!esito.ok || !esito.file) return { ...esito, inCasella: false, spedita: false }
  if (!(await apriConIlSistema(esito.file))) {
    return {
      ok: false,
      inCasella: false,
      spedita: false,
      errore: `La bozza è pronta ma non si è aperta da sola: sta in ${esito.file.fsPath}`,
      file: esito.file,
    }
  }
  return { ...esito, inCasella: false, spedita: false }
}

/** Com'è finito un giro: dove sono i messaggi, e chi è rimasto indietro. */
export interface EsitoGiro {
  ok: boolean
  inCasella: boolean
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
    const via = await viaDiretta()
    const esito = await spedisciDiretto(messaggi.map((m) => conMittente(m.messaggio)))
    if (esito.ok) {
      return {
        ok: true,
        inCasella: true,
        spediti: true,
        dove: via === 'exchange' ? 'il server della posta' : 'la posta in uscita di Outlook',
        falliti: esito.falliti,
      }
    }
    // Non è partito niente: si ripiega sulle bozze, come se l'invio diretto
    // non ci fosse. Quel che è partito davvero, se qualcosa è partito, lo dice
    // `ok` — e qui `ok` è falso.
  }
  if (viaBozze() === 'outlook') {
    const esito = await bozzeInOutlook(messaggi.map((m) => conMittente(m.messaggio)), 'salva')
    if (esito.ok) {
      return {
        ok: true,
        inCasella: true,
        spediti: false,
        dove: 'la cartella Bozze di Outlook',
        falliti: esito.falliti,
      }
    }
  }

  const cartella = await cartellaBozze(classe)
  const scritte: vscode.Uri[] = []
  for (const { messaggio, nome } of messaggi) {
    const esito = await preparaBozza(messaggio, cartella, nome)
    if (!esito.ok) {
      return {
        ok: false,
        inCasella: false,
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
        inCasella: false,
        spediti: false,
        dove: 'il programma di posta',
        falliti: [],
      }
    }
  }

  await mostraCartellaBozze(cartella)
  return { ok: true, inCasella: false, spediti: false, dove: cartella.fsPath, falliti: [] }
}

/** Mostra la cartella delle bozze, per aprirle una a una e spedirle. */
export async function mostraCartellaBozze (cartella: vscode.Uri): Promise<void> {
  try {
    await vscode.commands.executeCommand('revealFileInOS', cartella)
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
  const scelta = await vscode.window.showWarningMessage(
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

// ------------------------------------------------------------------ collegare l'account

/** I due modi di entrare, come si presentano a chi deve sceglierne uno. */
const MODI = [
  {
    label: 'Account Microsoft, con il codice',
    description: 'da provare per primo',
    detail:
      'La pagina di Microsoft aperta da qualunque browser, anche dal telefono. Serve un ID ' +
      'applicazione, registrato una volta sola.',
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
  const scrive = await vscode.window.showInputBox({
    title: 'Registro — collega la casella',
    prompt: 'L’indirizzo da cui si scrive, quello che le famiglie vedono: per esempio nome.cognome@edu.ti.ch',
    value: prima?.mittente ?? '',
    ignoreFocusOut: true,
    validateInput: (scritto) => (sembraIndirizzo(scritto) ? null : 'Ci vuole un indirizzo di posta.'),
  })
  if (!scrive) return null

  const entra = await vscode.window.showInputBox({
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

  const scelto = await vscode.window.showQuickPick(MODI, {
    title: `Registro — come entrare in ${descriviCasella(suo)}`,
    placeHolder: 'Come vuoi collegare la casella?',
    ignoreFocusOut: true,
  })
  if (!scelto) return null

  // La casella va nelle impostazioni prima della prova: da lì la leggono il
  // collegamento a Microsoft — che sul dominio trova a quale organizzazione
  // bussare — e la prova sul server.
  await scriviCasella(suo)
  const impostazioni = vscode.workspace.getConfiguration('registroDocenti.posta')
  await impostazioni.update('autenticazione', scelto.modo, vscode.ConfigurationTarget.Global)

  const esito =
    scelto.modo === 'oauth' ? await collegaConMicrosoft(suo) : await collegaConPassword(suo)

  if (!esito.ok) {
    return {
      collegato: false,
      via: viaBozze(),
      casella: '',
      caselle: [],
      livello: 'errore',
      testo: `Account non collegato. ${esito.errore ?? 'Non è arrivata nessuna spiegazione.'}`,
    }
  }

  return {
    collegato: true,
    via: 'exchange',
    casella: suo.mittente,
    caselle: [suo.mittente],
    livello: 'info',
    testo:
      `Account collegato: ${descriviCasella(suo)} su ${esito.dove}, ${comeSiEntra(scelto.modo)}. ` +
      (invioDiretto()
        ? 'L’invio diretto è acceso: le comunicazioni partono da qui.'
        : 'Per far partire le comunicazioni da sé resta da accendere ' +
          'registroDocenti.posta.invioDiretto.'),
  }
}

/** Come si entra, detto a parole. */
function comeSiEntra (modo: ModoAccesso): string {
  return modo === 'password' ? 'con la password' : 'con l’account Microsoft'
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
  if (!contoOauth().clientId) return { ok: false, errore: guidaRegistrazione() }

  const dato = await collegaConOauth(suo)
  if (!dato.ok) return { ok: false, errore: dato.errore }

  const esito = await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Registro: provo a entrare…' },
    async () => await provaExchange(),
  )
  return esito.ok ? { ok: true, dove: esito.dove } : { ok: false, errore: esito.errore }
}

/** Il collegamento con la password per le app: si chiede, si prova, si salva. */
async function collegaConPassword (
  suo: Casella,
): Promise<{ ok: boolean, dove?: string, errore?: string }> {
  const segreto = await vscode.window.showInputBox({
    title: `Registro — password di ${suo.accesso}`,
    prompt:
      'Con la verifica in due passaggi accesa ci vuole una «password per le app», ' +
      'generata dal proprio profilo Microsoft: quella della casella non funziona.',
    password: true,
    ignoreFocusOut: true,
    validateInput: (scritto) => (scritto.length > 0 ? null : 'Senza password non si entra.'),
  })
  if (!segreto) return { ok: false, errore: 'Collegamento annullato.' }

  const esito = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Registro: provo ${contoExchange().server}…`,
    },
    async () => await provaCredenziali(suo, segreto),
  )
  if (!esito.ok) return { ok: false, errore: esito.errore }

  await salvaPassword(segreto)
  return { ok: true, dove: esito.dove }
}

/**
 * Scollega la casella: la password sparisce dal portachiavi.
 *
 * L'indirizzo resta scritto nelle impostazioni, ed è voluto: ricollegare vuol
 * dire ridigitare la password e basta. Quel che se ne va è la sola cosa che
 * permetteva di spedire.
 */
/** Le voci di `registroDocenti.posta` che si azzerano: tutte quelle che esistono. */
const VOCI_POSTA = [
  'utente',
  'mittente',
  'server',
  'porta',
  'autenticazione',
  'clientId',
  'tenant',
  'invioDiretto',
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
 * Le impostazioni si tolgono da tutti i livelli — utente, cartella, area di
 * lavoro — perché una voce dimenticata in `.vscode/settings.json` vince su
 * quella dell'utente e nessuno la vede.
 *
 * Quel che resta fuori portata è l'autorizzazione data al programma nel
 * profilo Microsoft: di là si revoca, e non da qui.
 */
export async function azzeraPosta (): Promise<StatoPosta> {
  await dimenticaPassword()
  await azzeraOauth()

  const impostazioni = vscode.workspace.getConfiguration('registroDocenti.posta')
  const livelli = [
    vscode.ConfigurationTarget.Global,
    vscode.ConfigurationTarget.Workspace,
    vscode.ConfigurationTarget.WorkspaceFolder,
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
    via: viaBozze(),
    casella: '',
    caselle: [],
    livello: 'info',
    testo:
      'Posta azzerata: tolti la password e il gettone dal portachiavi, i gettoni in memoria, ' +
      'i tenant ricordati e tutte le impostazioni registroDocenti.posta.*. Ora si riparte da ' +
      'zero con «Collega la casella di posta».',
  }
}

export async function scollegaAccount (): Promise<StatoPosta> {
  await dimenticaPassword()
  return {
    collegato: false,
    via: viaBozze(),
    casella: '',
    caselle: [],
    livello: 'info',
    testo:
      'Account scollegato: il registro non usa più né la password né l’autorizzazione di ' +
      'Microsoft. L’autorizzazione data al programma resta visibile nel profilo Microsoft, ' +
      'sotto le app collegate, e di là si revoca. ' +
      (viaBozze() === 'outlook'
        ? 'Le comunicazioni tornano a passare da Outlook.'
        : 'Le comunicazioni tornano a uscire come file .eml.'),
  }
}

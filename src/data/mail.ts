// Le comunicazioni: come escono dal registro.
//
// Due strade: la consegna diretta a Exchange via SMTP (`exchange.ts`), l'unica
// in cui il registro sa che cosa è partito; e, come ripiego, il file `.eml` da
// aprire nel programma di posta e mandare a mano (lì lo dice la spunta).
// La composizione del file sta in `domain/communications.ts`; qui c'è il disco.

import * as apparato from 'apparato'

import { istante } from '../i18n/index.js'
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
import { cartellaAnno, nomeSicuro } from './paths.js'
import { testi } from './mail.testi.js'

export type { AllegatoPosta, MessaggioPosta } from '../domain/communications.js'

/** L'indirizzo che finisce in «Da» (non una credenziale); vuoto se non è detto. */
export function mittente (): string {
  return casella()?.mittente ?? ''
}

/**
 * Il messaggio con dentro il mittente. Se «A» è vuoto (tutto in copia nascosta)
 * ci va il proprio indirizzo, altrimenti la bozza non parte; senza mittente
 * noto si lascia com'è piuttosto che inventare un destinatario.
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
 * L'interruttore dell'invio diretto, spento di serie perché una mail partita
 * non si richiama. Da solo non basta: vedi `puoSpedire`.
 */
export function invioDiretto (): boolean {
  return (
    apparato.impostazioni.leggi('registroDocenti.posta').get<boolean>('invioDiretto') ?? false
  )
}

/**
 * Se il registro può spedire da sé adesso: interruttore acceso e casella
 * collegata. Restano separati perché un guasto di rete non deve spegnere
 * l'interruttore.
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
  return invioDiretto() ? testi().invioAcceso : testi().invioSpento
}

/**
 * Apre il collegamento e si autentica senza mandare niente. Non garantisce che
 * il server accetti la consegna: per quello c'è `inviaProva`.
 */
export async function provaCollegamento (): Promise<StatoPosta> {
  const t = testi()
  const suo = contoExchange()

  if (contoScritto() && (await accountCollegato())) {
    const esito = await provaExchange()
    if (esito.ok) {
      return {
        collegato: true,
        casella: suo.mittente,
        livello: 'info',
        testo: t.serverRisponde(
          descriviCasella({ accesso: suo.utente, mittente: suo.mittente }),
          esito.dove,
          codaInvio(),
        ),
      }
    }
    // Rifiutato: si dice anche che le comunicazioni escono lo stesso come bozze.
    return {
      collegato: false,
      casella: '',
      livello: 'errore',
      testo: `${esito.errore ?? t.serverZitto} ${t.finoARimedio}`,
    }
  }

  // Indirizzo scritto ma account non collegato: un passo che manca, non un guasto.
  const daCollegare =
    contoScritto() && !(await accountCollegato()) ? t.accountDaCollegare(suo.utente) : ''

  return {
    collegato: false,
    casella: '',
    livello: 'avviso',
    testo: `${daCollegare}${t.senzaCasella}`,
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
 * La cartella delle bozze di una classe: `<cartella dell'anno>/bozze/<classe>/`.
 * Una cartella vera e non una voce del documento, perché le apre e le riscrive
 * il programma di posta; non temporanea, perché si rileggono prima di spedire.
 */
async function cartellaBozze (classe: string): Promise<apparato.Uri> {
  const anno = cartellaAnno()
  if (!anno) throw new Error(testi().nessunAnno)
  const cartella = apparato.Uri.joinPath(anno, 'bozze', nomeSicuro(classe) || 'classe')
  await apparato.file.createDirectory(cartella)
  return cartella
}

/**
 * Il nome del file di una bozza: classe, allievo, argomento e periodo, come un
 * documento archiviato. `periodo` (da `periodoNelNome`, `domain/dates.ts`)
 * evita che il giro di gennaio sovrascriva quello di settembre.
 */
export function nomeBozza (
  classe: string,
  chi: string | null,
  argomento: string,
  periodo: string | null = null,
): string {
  return nomeFileArchivio(classe, chi, argomento, periodo, '.eml')
}

/** Scrive la bozza nella cartella data e torna il file, senza aprirla. */
async function preparaBozza (
  messaggio: MessaggioPosta,
  cartella: apparato.Uri,
  nome: string,
): Promise<EsitoBozza> {
  if (messaggio.ccn.length === 0 && (messaggio.a ?? []).length === 0) {
    return { ok: false, errore: testi().nessunDestinatario }
  }

  // Senza firma: il programma di posta attacca la sua, e sarebbero due. La firma
  // del registro serve solo alla consegna diretta al server.
  const completo = { ...conMittente(messaggio), firma: undefined }

  const file = apparato.Uri.joinPath(
    cartella,
    nome.toLowerCase().endsWith('.eml') ? nome : `${schiacciaNome(nome)}.eml`,
  )
  try {
    await apparato.file.writeFile(file, Buffer.from(componiEml(completo), 'utf8'))
    return { ok: true, file }
  } catch (errore) {
    return { ok: false, errore: testi().bozzaFallita((errore as Error).message) }
  }
}

/** Come è finita una bozza: il file scritto, e se il registro l'ha già spedita. */
interface DoveLaBozza extends EsitoBozza {
  /** Vero quando è già partita: non resta niente da spuntare. */
  spedita: boolean
  /**
   * Partita, ma con indirizzi rifiutati: chi è rimasto fuori. Non si ripiega
   * sulla bozza, perché gli altri l'avrebbero due volte.
   */
  avviso?: string
}

/**
 * Una comunicazione sola: spedita se `puoSpedire`, altrimenti (o se spedire
 * fallisce) bozza `.eml` aperta nel programma di posta.
 */
export async function apriBozzaSingola (
  messaggio: MessaggioPosta,
  classe: string,
  nome: string,
): Promise<DoveLaBozza> {
  if (await puoSpedire()) {
    const esito = await spedisciConExchange([conMittente(messaggio)])
    if (esito.ok) {
      const avviso = esito.parziali[0]?.errore
      return { ok: true, spedita: true, ...(avviso ? { avviso } : {}) }
    }
  }
  return await apriBozza(messaggio, classe, nome)
}

/** Scrive la bozza `.eml` (riscrivendola se c'è già) e la apre, senza spedire. */
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
      errore: testi().bozzaNonAperta(esito.file.fsPath),
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
  /** Chi non è partito, per posizione nell'elenco; vuoto con le bozze. */
  falliti: MessaggioFallito[]
  /**
   * Partiti ma con indirizzi rifiutati: contano come spediti (`dopoOgni` li ha
   * già segnati), qui c'è chi è rimasto fuori. Vuoto con le bozze.
   */
  parziali: MessaggioFallito[]
  errore?: string
}

/**
 * Un giro di comunicazioni: spedite se `puoSpedire`, altrimenti bozze `.eml`.
 * Spedendo, l'esito è messaggio per messaggio e `dopoOgni` riceve l'indice di
 * ognuno; con le bozze `dopoOgni` non si chiama mai.
 */
export async function bozzeDiGruppo (
  messaggi: Array<{ messaggio: MessaggioPosta, nome: string }>,
  classe: string,
  dopoOgni?: (indice: number, ok: boolean) => void,
): Promise<EsitoGiro> {
  if (await puoSpedire()) {
    const esito = await spedisciConExchange(messaggi.map((m) => conMittente(m.messaggio)), dopoOgni)
    if (esito.ok) {
      return {
        ok: true,
        spediti: true,
        dove: testi().doveServer,
        falliti: esito.falliti,
        parziali: esito.parziali,
      }
    }
    // `ok` falso: non è partito niente, si ripiega sulle bozze.
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
        parziali: [],
        errore: esito.errore,
      }
    }
    if (esito.file) scritte.push(esito.file)
  }

  // Una bozza sola si apre da sé; da due in su si apre la cartella, per non
  // aprire decine di finestre di posta insieme.
  if (scritte.length === 1) {
    if (await apriConIlSistema(scritte[0])) {
      return {
        ok: true,
        spediti: false,
        dove: testi().doveProgramma,
        falliti: [],
        parziali: [],
      }
    }
  }

  await mostraCartellaBozze(cartella)
  return { ok: true, spediti: false, dove: cartella.fsPath, falliti: [], parziali: [] }
}

/** Mostra la cartella delle bozze, per aprirle una a una e spedirle. */
async function mostraCartellaBozze (cartella: apparato.Uri): Promise<void> {
  try {
    await apparato.comandi.esegui('apparato.mostraNellaCartella', cartella)
  } catch {
    // Le bozze ci sono comunque, e il percorso si dice a chi ha chiesto.
  }
}

/**
 * Chiede conferma prima di spedire, una volta per giro e non per messaggio:
 * troppe conferme si accettano a occhi chiusi.
 */
export async function confermaInvio (domanda: string, dettaglio: string): Promise<boolean> {
  const manda = testi().spedisciOra
  const scelta = await apparato.dialoghi.avvisa(
    domanda,
    { modal: true, detail: testi().senzaRitorno(dettaglio) },
    manda,
  )
  return scelta === manda
}

// Che una bozza sia partita lo dice chi spedisce, con la spunta
// (`comunicazione.spunta`, `assenze.spunta`, la consegna dei documenti).

// ------------------------------------------------------------------ la mail di prova

/**
 * Manda una mail vera all'indirizzo scelto (proposto: il proprio) e dice com'è
 * andata: verifica il permesso di spedire, la firma e il corpo, che
 * `provaCollegamento` non vede. Ignora `invioDiretto`: la prova deve spedire.
 */
export async function inviaProva (firma: string): Promise<StatoPosta | null> {
  const t = testi()
  const suo = casella()
  if (!suo) {
    return {
      collegato: false,
      casella: '',
      livello: 'errore',
      testo: t.nessunaCasella,
    }
  }
  if (!(await accountCollegato())) {
    return {
      collegato: false,
      casella: '',
      livello: 'errore',
      testo: t.casellaNonCollegata,
    }
  }

  const a = await apparato.dialoghi.chiediTesto({
    title: t.titoloProva,
    prompt: t.domandaProva,
    value: suo.mittente,
    validateInput: (scritto) => (sembraIndirizzo(scritto) ? null : t.serveIndirizzo),
  })
  if (!a) return null

  // Con i secondi: due prove nello stesso minuto si distinguono.
  const quando = istante(new Date(), {
    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
  })
  const messaggio: MessaggioPosta = {
    oggetto: t.oggettoProva(quando),
    corpo: t.corpoProva(descriviCasella(suo), contoExchange().server, quando),
    a: [a.trim()],
    ccn: [],
    firma,
  }

  const esito = await spedisciConExchange([conMittente(messaggio)])
  if (!esito.ok) {
    return {
      collegato: false,
      casella: suo.mittente,
      livello: 'errore',
      testo: t.provaFallita(esito.falliti[0]?.errore ?? esito.errore ?? t.nessunaSpiegazione),
    }
  }

  return {
    collegato: true,
    casella: suo.mittente,
    livello: 'info',
    testo: t.provaSpedita(a.trim(), contoExchange().server),
  }
}

// ------------------------------------------------------------------ collegare l'account

/** I due modi di entrare, come si presentano a chi deve sceglierne uno. */
function modi () {
  const t = testi()
  return [
    {
      label: t.modoOauth,
      description: t.modoOauthNota,
      detail: t.modoOauthDettaglio,
      modo: 'oauth' as const,
    },
    {
      label: t.modoPassword,
      detail: t.modoPasswordDettaglio,
      modo: 'password' as const,
    },
  ]
}

/**
 * Collega la casella: si sceglie come entrare, si prova, e la chiave resta nel
 * portachiavi del sistema solo se Exchange accetta. Nelle impostazioni va solo
 * l'indirizzo, che non è un segreto.
 */
export async function collegaAccount (): Promise<StatoPosta | null> {
  const t = testi()
  const prima = casella()

  // Prima l'indirizzo da cui si scrive, poi il nome d'accesso già riempito con
  // lo stesso: nelle scuole spesso differiscono (sigla contro indirizzo).
  const scrive = await apparato.dialoghi.chiediTesto({
    title: t.titoloCollega,
    prompt: t.domandaMittente,
    value: prima?.mittente ?? '',
    validateInput: (scritto) => (sembraIndirizzo(scritto) ? null : t.serveIndirizzo),
  })
  if (!scrive) return null

  const entra = await apparato.dialoghi.chiediTesto({
    title: t.titoloAccesso,
    prompt: t.domandaAccesso,
    value: prima && !stessoIndirizzo(prima.accesso, prima.mittente) ? prima.accesso : scrive.trim(),
    validateInput: (scritto) => (sembraIndirizzo(scritto) ? null : t.serveAccesso),
  })
  if (!entra) return null

  const suo = componiCasella(entra, scrive)
  if (!suo) return null

  const scelto = await apparato.dialoghi.chiediScelta(modi(), {
    title: t.titoloModo(descriviCasella(suo)),
    placeHolder: t.domandaModo,
  })
  if (!scelto) return null

  // Scritta prima della prova: da lì la leggono il collegamento a Microsoft
  // (che dal dominio trova l'organizzazione) e la prova sul server.
  await scriviCasella(suo)

  const esito = await collegaConMicrosoft(suo)
  if (!esito.ok) {
    return {
      collegato: false,
      casella: '',
      livello: 'errore',
      testo: t.accountNonCollegato(esito.errore ?? t.nessunaSpiegazione),
    }
  }

  return {
    collegato: true,
    casella: suo.mittente,
    livello: 'info',
    testo:
      t.accountCollegato(descriviCasella(suo), esito.dove ?? '') +
      (invioDiretto() ? t.invioAcceso : t.daAccendere),
  }
}

/**
 * Accesso a Microsoft e poi prova sul server: il gettone può esserci e il
 * server rifiutarlo lo stesso (SMTP spento dall'amministratore).
 */
async function collegaConMicrosoft (
  suo: Casella,
): Promise<{ ok: boolean, dove?: string, errore?: string }> {
  const dato = await collegaConOauth(suo)
  if (!dato.ok) return { ok: false, errore: dato.errore }

  const esito = await apparato.dialoghi.conAvanzamento(
    { title: testi().provoAEntrare },
    async () => await provaExchange(),
  )
  if (esito.ok) return { ok: true, dove: esito.dove }
  // Il gettone è già nel portachiavi: se il server lo rifiuta si dimentica,
  // altrimenti `puoSpedire()` direbbe «collegato» a un account non valido.
  await dimenticaOauth()
  return { ok: false, errore: esito.errore }
}

/** Le voci di `registroDocenti.posta` che si azzerano. */
const VOCI_POSTA = [
  'utente',
  'mittente',
  'invioDiretto',
  // Non più nel manifesto ma forse ancora nei file: azzerare è l'unico modo di toglierle.
  'server',
  'porta',
  'autenticazione',
  'clientId',
  'tenant',
]

/**
 * Azzera la posta per intero: portachiavi, memoria e impostazioni, indirizzo
 * compreso (scollegare invece lo tiene). L'autorizzazione nel profilo
 * Microsoft si revoca di là.
 *
 * I tre ambiti finiscono nello stesso file (`environment/settings.ts`): il
 * giro su tutti e tre non costa niente e resta giusto se tornassero distinti.
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
        // Senza cartella aperta il livello «cartella» non esiste: niente da togliere.
      }
    }
  }

  return {
    collegato: false,
    casella: '',
    livello: 'info',
    testo: testi().postaAzzerata,
  }
}

/** Scollega la casella: toglie il gettone e tiene l'indirizzo, per ricollegare in fretta. */
export async function scollegaAccount (): Promise<StatoPosta> {
  await dimenticaOauth()
  return {
    collegato: false,
    casella: '',
    livello: 'info',
    testo: testi().accountScollegato,
  }
}

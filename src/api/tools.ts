// Il registro raccontato a un modello: che cosa si può chiedere, con che
// forma, e con quali regole.
//
// È lo stesso contratto che `core.ts` fa rispettare, scritto in JSON invece
// che in TypeScript — e non è una seconda verità, perché non lo scrive
// nessuno: esce dalle procedure, dai loro `titolo` e dai loro `Schema`, che
// sanno già raccontarsi in JSON Schema. Un attrezzo scritto a mano sarebbe la
// seconda verità, e la seconda verità è quella che resta indietro.
//
// Serve a due cose che si assomigliano e non sono la stessa:
//
//   1. **chi sta fuori dal registro.** Un modello che gira altrove, o uno
//      script, non può importare TypeScript — nemmeno la riga di comando, che
//      non si compila apposta, perché deve funzionare anche quando la
//      costruzione non è andata bene — quindi il catalogo glielo si consegna già
//      fatto, in un file che si legge con `JSON.parse`. `registro catalogo`
//      stampa lo stesso, vivo, dal condotto.
//   2. **il file che si guarda in revisione.** `resources/tools.json` sta nel
//      versionamento, e una procedura aggiunta, tolta o cambiata di forma
//      compare lì come una differenza leggibile. È il posto in cui si vede che
//      un ingresso ha perso un campo — cosa che, senza, non romperebbe niente
//      di visibile. Lo stesso motivo di `tests/api/coverage.test.mjs`, con un
//      altro mezzo.
//
// Le due cose stanno nello stesso file e **non sono lo stesso sottoinsieme**:
// il contratto da rivedere sono tutte le voci, gli attrezzi che un modello può
// ricevere sono quelle con `offribile`, e in mezzo c'è la metadata
// d'impaginazione, che a un modello non serve. Chi prende
// `resources/tools.json` da fuori senza saperlo manda a un modello il file
// intero dove ne basta un dodicesimo: per questo il catalogo porta
// `comeSiFiltra` e ogni voce dice `offribile`, invece di lasciare la regola
// scritta soltanto qui dentro.
//
// I conti non stanno scritti qui apposta. C'erano — «175 voci», «27 attrezzi» —
// ed erano sbagliati tutti e due, perché una procedura aggiunta li invecchia
// senza che niente lo dica. Chi li vuole li conta: `jq '.attrezzi | length'` e
// `jq '[.attrezzi[] | select(.offribile)] | length'` sul catalogo.
//
// Che il file non resti indietro lo tiene fermo `tests/api/tools.test.mjs`,
// che rigenera il catalogo e lo confronta con quello su disco. Per questo qui
// dentro non c'è nessuna data e nessun numero che cambi da sé: un catalogo che
// cambia a ogni generazione non si può confrontare, e una prova che non si può
// fare non protegge niente.

import type { ProceduraQualunque } from './contract.js'
import { VERSIONE_API } from './contract.js'
import { registraTutte } from './index.js'
import { procedure } from './core.js'
import { schemaJson } from './schemas.js'

/** Come si chiama la riga di comando, se nessuno dice altrimenti. */
const COMANDO = 'registro'

// -------------------------------------------------------------------- i nomi

/**
 * `corso.presenze` → `corso_presenze`.
 *
 * I punti nei nomi di funzione non sono vietati dal formato del tool calling,
 * ma una parte dei modelli li tratta come accesso a un campo e rispondono
 * `corso` con dentro `presenze`. Il punto si toglie all'andata e si rimette al
 * ritorno, in un posto solo — questo.
 */
export function nomeFunzione (nome: string): string {
  return nome.replace(/\./g, '_')
}

/**
 * `corso_presenze` → `corso.presenze`, se una procedura si chiama così. E
 * `corso.presenze` → `corso.presenze`.
 *
 * Torna `null` e non il nome tradotto quando la procedura non esiste: un
 * modello che si inventa un attrezzo deve sentirsi dire che non esiste, e
 * tradurre un nome inventato in un altro nome inventato non aiuterebbe
 * nessuno. Il confronto si fa sull'elenco vero e non rimettendo i punti a
 * indovinare, perché un nome può avere più di un punto e non si saprebbe dove.
 *
 * ------------------------------------------- perché si accetta anche il punto
 *
 * Perché **siamo noi** a insegnare al modello i nomi puntati, e poi a
 * rifiutarglieli. I rimedi che le guardie gli rimandano sono scritti con il
 * punto — «Le classi dell'anno le elenca «classi.elenco».», «si cercano per
 * nome con «persone.cerca»» — e sono scritti così apposta, perché sono le
 * stesse frasi che legge una persona davanti a un terminale. Il giro che ne
 * usciva era questo: il modello sbaglia un `classeId`, riceve «Classe non
 * trovata. Le classi dell'anno le elenca «classi.elenco».», **fa la cosa
 * giusta** e chiama `classi.elenco` — e si sente rispondere «l'attrezzo
 * «classi.elenco» non esiste. Usa soltanto quelli che ti sono stati dati». Due
 * giri bruciati su cinque, e un modello che si era ripreso rimesso a inventare.
 *
 * La tolleranza va in una direzione sola, ed è quella sicura: si accetta un
 * nome puntato **solo se è quello di una procedura vera**, mai traducendo a
 * indovinare. Il genere si ricontrolla comunque a valle, dove sta la whitelist
 * vera, quindi questa riga non apre niente che fosse chiuso: rende
 * raggiungibile un nome che il registro aveva già detto per esteso.
 */
export function daNomeFunzione (nome: string): string | null {
  registraTutte()
  const tutte = procedure()
  return tutte.find((p) => p.nome === nome)?.nome
    ?? tutte.find((p) => nomeFunzione(p.nome) === nome)?.nome
    ?? null
}

// ------------------------------------------------------- chi si può offrire

/**
 * Se una procedura si può mettere in mano al modello dell'assistente.
 *
 * **L'unica definizione della regola.** Era scritta in due posti che non
 * dicevano la stessa cosa: `offribile()` in `transports/assistant.ts` diceva
 * «lettura o `assistente: true`», la riga di comando diceva «lettura» e basta —
 * cioè `vista.apri` la vedeva la finestra e non il terminale, e nessuno dei due
 * file sapeva di contraddire l'altro. È esattamente quel che il commento di
 * `transports/assistant.ts` dice di voler evitare quando spiega perché il campo
 * lo dichiara la procedura e non un elenco scritto a parte. Adesso la regola sta
 * qui, il catalogo ne **pubblica la risposta** in `offribile`, e chi non può
 * importare TypeScript — la riga di comando — legge quella invece di rifare il
 * conto per conto suo.
 *
 * Tre condizioni, e ognuna risponde a una domanda diversa:
 *
 *   - `genere === 'lettura'`: non tocca l'archivio. È la regola.
 *   - `assistente === true`: la deroga per quel che non è una lettura e non
 *     tocca comunque l'archivio — oggi solo `vista.apri`, che cambia pagina.
 *   - `perAssistente !== false`: la deroga al contrario, per le letture che con
 *     una domanda di un docente non c'entrano niente e pesano su una finestra
 *     di contesto che non le regge. Vedi `Procedura.perAssistente`.
 */
export function offribile (
  p: { genere: string, assistente?: boolean, perAssistente?: boolean },
): boolean {
  if (p.perAssistente === false) return false
  return p.genere === 'lettura' || p.assistente === true
}

// ----------------------------------------------------------------- il catalogo

/** Una procedura come la vede chi la deve chiamare da fuori. */
interface AttrezzoCatalogo {
  /** Il nome vero, con i punti: `corso.presenze`. */
  nome: string
  /** Il nome da mettere in `tools`, senza punti: `corso_presenze`. */
  funzione: string
  genere: 'lettura' | 'scrittura'
  /** Una riga: che cosa fa, detto a chi non conosce il codice. */
  titolo: string
  idempotente: boolean
  /** Le raccolte che una scrittura può toccare. Assente per le letture. */
  collezioni?: readonly string[]
  /**
   * Il modello dell'assistente la può chiamare anche se non è una lettura.
   *
   * Compare nel catalogo — che è il file che si guarda in revisione — proprio
   * perché è una deroga: il giorno in cui una procedura la dichiarasse senza
   * averne il diritto, quella riga sarebbe una differenza rossa e verde in
   * `resources/tools.json`, e non una riga in fondo a un file di sorgente.
   */
  assistente?: boolean
  /**
   * Se si può mettere in mano al modello dell'assistente. Assente vuol dire no.
   *
   * **Derivato, non dichiarato**: è la risposta di `offribile()`, cioè
   * dell'unica funzione che la regola la sa. Sta nel catalogo perché la riga di
   * comando non può importare TypeScript — non si compila, apposta, per
   * funzionare anche quando la costruzione non è andata bene — e senza questo
   * campo si ritrovava a riscrivere la regola per conto suo, che è come le due
   * definizioni divergevano prima. Chi legge il catalogo per far parlare un
   * modello filtra su questo e su nient'altro.
   */
  offribile?: boolean
  /** Come la si invoca dalla riga di comando, con i campi obbligatori. */
  riga: string
  /** La forma dell'ingresso, in JSON Schema. */
  parametri: Record<string, unknown>
  /**
   * Come si impagina quel che torna: titolo, valori in cima, colonne.
   *
   * Nel catalogo perché il catalogo è quel che si legge in revisione — una
   * colonna sparita è una differenza rossa e verde in `resources/tools.json`
   * — e perché chi chiama da fuori la può usare per disegnare: la riga di
   * comando stampa le stesse tabelle del riquadro senza conoscere una sola
   * procedura. Assente dove non c'è niente da impaginare.
   */
  presentazione?: unknown
}

/** Tutto quel che serve per far guidare la riga di comando a un modello. */
interface Catalogo {
  /** La versione del contratto: la stessa che viaggia in ogni busta. */
  api: number
  /** Il nome del comando a cui le righe di esempio si riferiscono. */
  comando: string
  /** Che cosa il modello deve sapere prima di leggere la domanda. */
  istruzioni: string
  /**
   * Come si ricava da qui l'elenco da mandare a un modello. Una riga, nel file.
   *
   * Sta scritta dentro il catalogo e non soltanto in questo sorgente perché il
   * catalogo lo prende chi il sorgente non lo legge: `resources/tools.json`
   * è un quarto di megabyte e contiene tre cose diverse nello stesso formato —
   * le voci del contratto da rivedere, gli attrezzi che un modello può
   * ricevere, e la metadata d'impaginazione, che da sola vale un decimo del
   * file. Chi lo prende per intero e lo passa a un modello gli manda più di
   * dodici volte i caratteri che gli servono, e quello è il caso d'uso
   * dichiarato in testa a questo file. Una riga dentro il file costa quanto
   * quella riga e si legge prima di sbagliare.
   */
  comeSiFiltra: string
  attrezzi: AttrezzoCatalogo[]
}

/** La riga qui sopra, scritta una volta sola. */
const COME_SI_FILTRA =
  'Per il tool calling tieni le voci con «offribile: true» — sono le sole che un modello ' +
  'possa chiamare — e di ciascuna manda soltanto «funzione» come nome, «titolo» come ' +
  'descrizione e «parametri» come schema. «genere», «collezioni», «riga» e «presentazione» ' +
  'servono a chi rivede il contratto e a chi disegna la risposta, non al modello.'

/**
 * La riga di comando che chiama una procedura, con i soli campi obbligatori.
 *
 * Gli opzionali restano fuori apposta: una riga di esempio lunga trenta
 * opzioni insegna a copiarla, non a comporla, e i campi che si possono
 * omettere sono già scritti nello schema qui accanto.
 */
function riga (comando: string, p: ProceduraQualunque): string {
  const forma = p.ingresso.forma
  if (forma.genere !== 'oggetto' || forma.richiesti.length === 0) {
    return `${comando} chiama ${p.nome}`
  }
  const campi = forma.richiesti
    .map((campo) => `--${campo} <${forma.campi[campo]?.genere ?? 'valore'}>`)
    .join(' ')
  return `${comando} chiama ${p.nome} ${campi}`
}

/**
 * Quel che il modello sa prima di leggere la domanda.
 *
 * Le stesse tre regole dell'assistente della finestra — che cosa è, che non
 * può scrivere, che non deve inventare cifre — più quel che qui cambia: chi
 * legge la risposta sta davanti a un terminale, non a una pagina, e la riga di
 * comando che ha battuto la può ribattere. Perciò l'assistente della riga di
 * comando dice **anche il comando**: una risposta che si può verificare vale
 * più di una risposta che si deve credere.
 *
 * La terza regola è quella che conta davvero: un modello a cui si chiede una
 * media e che non ha chiamato nessun attrezzo la produce lo stesso, plausibile
 * e sbagliata, e in un registro di classe una cifra plausibile e sbagliata è il
 * guasto peggiore che ci sia — si trascrive.
 */
function istruzioni (comando: string): string {
  return [
    'Sei l’assistente della riga di comando del Registro docenti, un registro di classe.',
    'Rispondi in italiano, in modo breve e asciutto, a chi insegna.',
    '',
    'Per sapere che cosa c’è nel registro usa gli attrezzi che ti sono dati: sono le sole',
    'fonti che hai. Non conosci nessun dato di questo registro se non lo hai appena letto',
    'con un attrezzo.',
    '',
    'Regole che non si scavalcano:',
    '— Non inventare mai una cifra, un nome o una data. Se un attrezzo non te l’ha data,',
    '  di’ che non la sai e quale attrezzo servirebbe.',
    '— Un elenco vuoto vuol dire che quella ricerca non ha trovato niente, non che il',
    '  registro sia vuoto: prima di dirlo, rifai la domanda senza filtri. Quasi tutti gli',
    '  attrezzi li hanno opzionali, e senza tornano tutti.',
    '— Un elenco vuoto sotto una busta che dice di aver guardato qualcosa è colpa di un',
    '  filtro tuo, non di un registro vuoto. La regola sta nel fatto e non nei nomi dei',
    '  campi: se un qualunque conto della busta — «guardate», «inRegistro», «escluse»,',
    '  «esclusiRitirati», «esclusiArchiviate», «quante» — è maggiore di zero e le righe',
    '  sono zero, togli un filtro per volta e richiama. Due filtri sono accesi da soli e',
    '  tengono fuori delle persone — chi si è ritirato e le classi archiviate: quelli si',
    '  riaprono con «ritirati» e «archiviate» a vero, e nella risposta si dice che quelle',
    '  persone stanno lì.',
    '— «cerca» c’è su quasi tutte le letture, e serve per un nome o un pezzo di nome: non',
    '  è il modo di dire che cosa vuoi elencare. Per avere tutte le persone in formazione',
    '  chiama «persone.cerca» senza «cerca», non cercando «allievo»; e così per ogni altro',
    '  attrezzo che ha quel campo.',
    '— Riporta i numeri come te li ha dati l’attrezzo, senza rifare i conti: le quote di',
    '  assenza e di presenza hanno denominatori diversi e non si sommano fra loro.',
    '— Non puoi cambiare niente nel registro: gli attrezzi che ti sono dati sono tutti di',
    '  sola lettura. Se ti si chiede di segnare, correggere o mandare qualcosa, di’ quale',
    `  comando lo farebbe — «${comando} chiama ...» — e lascia che sia una persona a batterlo.`,
    '— Quando nomini una persona in formazione usa cognome e nome come stanno nel',
    '  registro, senza aggiungere commenti sulla sua situazione.',
    '',
    'Come si scrive una risposta con dei dati dentro:',
    '— Da tre righe in su, una tabella di testo: una riga per voce, le colonne separate',
    '  da « | », l’intestazione in cima. Chi legge sta davanti a un terminale, e una',
    '  colonna incolonnata si confronta con l’occhio.',
    '— Nella prima colonna il nome come si legge — cognome e nome, «I MEC A — Matematica» —',
    '  e mai un identificatore da solo: gli id servono a te per chiamare gli attrezzi.',
    '  Una colonna di id si mette solo se te la chiedono.',
    '— Le intestazioni dicono che cosa c’è nella colonna, denominatore compreso.',
    '',
    'Quando una risposta viene da un attrezzo, chiudi dicendo con quale comando la si',
    'rifà: chi legge sta davanti a un terminale e può ribatterla.',
  ].join('\n')
}

/**
 * Il catalogo intero, costruito dalle procedure registrate.
 *
 * Ci stanno **tutte**, letture e scritture, perché il catalogo è anche il file
 * che si legge in revisione e una scrittura che sparisce dev'essere una
 * differenza visibile. Chi lo usa per far parlare un modello tiene le voci con
 * `offribile: true` e butta il resto — e chi esegue ricontrolla comunque prima
 * di chiamare, che è il controllo vero: vedi `usaAttrezzo` in
 * `transports/assistant.ts`.
 */
export function catalogo (comando: string = COMANDO): Catalogo {
  registraTutte()
  return {
    api: VERSIONE_API,
    comando,
    istruzioni: istruzioni(comando),
    comeSiFiltra: COME_SI_FILTRA,
    attrezzi: procedure().map((p) => ({
      nome: p.nome,
      funzione: nomeFunzione(p.nome),
      genere: p.genere,
      titolo: p.titolo,
      idempotente: p.idempotente,
      ...(p.collezioni && p.collezioni.length > 0 ? { collezioni: [...p.collezioni] } : {}),
      ...(p.assistente ? { assistente: true } : {}),
      ...(offribile(p) ? { offribile: true } : {}),
      riga: riga(comando, p),
      parametri: schemaJson(p.ingresso.forma),
      ...(p.presentazione ? { presentazione: p.presentazione } : {}),
    })),
  }
}

/**
 * Il catalogo come va sul disco: due spazi di rientro e un a capo in fondo.
 *
 * Scritto qui e non da chi salva, perché il file su disco e quello che la prova
 * ricostruisce devono essere lo stesso byte per byte — altrimenti la prova
 * fallisce per un a capo e nessuno le crede più. Per la stessa ragione il file
 * è dichiarato `eol=lf` in `.gitattributes`: senza, su Windows git lo
 * riscriverebbe in CRLF al primo checkout.
 */
export function catalogoJson (comando?: string): string {
  return `${JSON.stringify(catalogo(comando), null, 2)}\n`
}

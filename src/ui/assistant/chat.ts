// La conversazione: i turni, il campo, e quel che si vede mentre si aspetta.
//
// Sta in un modulo suo perché **vive in due finestre**. Nel pannello è il
// riquadro a destra (`ui/assistant.ts`); staccata, è una finestra
// intera con il suo bundle (`ui/assistantWindow.ts`). Sono due
// ospiti diversi in tutto il resto — uno ha il registro in mano, l'altro non sa
// nemmeno che cosa sia una lezione — e l'unica cosa che hanno in comune è
// questa: un filo di turni e una casella in cui scrivere.
//
// Per poter stare in tutti e due, **questo file non conosce lo stato del
// pannello**. Non importa `stato.ts` e non chiama `aggiorna()`: chi lo ospita
// gli passa le due cose che gli servono — se l'assistente è acceso e quale
// modello risponde — e gli dice come ci si ridisegna. È la stessa inversione
// per cui `projection.ts` sta in piedi senza il codice del registro, e per la
// stessa ragione: il bundle della finestra staccata non deve portarsi dietro le
// viste che sanno modificare i dati.
//
// ------------------------------------------------------------ la conversazione
//
// Vive qui, in una variabile di modulo, e non si persiste: dentro ci sono i
// nomi delle persone in formazione, e una domanda battuta a settembre che
// riapparisse a giugno sarebbe una copia dei dati della classe in un file di
// preferenze — fuori dal documento d'anno, fuori dal salvataggio e fuori da
// ogni cancellazione.
//
// Staccando e riattaccando, però, **si porta dietro**: la si consegna
// all'ospite che se ne va e la si riprende in quello che arriva
// (`prendi`/`metti`). Passa per il main process, che la tiene per l'istante fra
// una finestra e l'altra e poi la lascia — vedi `panels/assistant.ts`. Il
// contrario sarebbe una scatola che si svuota ogni volta che la si sposta,
// cioè una scatola che non si sposta.
//
// Si porta dietro anche **la domanda a cui non è ancora arrivata risposta**, che
// è il motivo per cui si stacca più spesso di ogni altro. Quella non vive qui:
// il filo con il modello sta nell'host, e chiudere una finestra non lo ferma.
// Quel che viaggia è il conto degli eventi già visti — `prendi` lo consegna,
// `metti` lo riprende — e l'host riconsegna il resto.

import type {
  ContestoAssistente,
  GiroAssistente,
  GiroDaRiprendere,
  IdVisto,
  RisultatoAssistente,
} from '../../protocol.js'
import { pulsante, quantoMisura, statoVuoto } from '../components/base.js'
import { icona } from '../components/icons.js'
import { h, type Figlio } from '../dom.js'
import {
  conversa,
  detta,
  riprendiConversazione,
  type FiloAperto,
  type FiloAssistente,
} from '../bridge.js'
import { corpoDellaRisposta } from './answer.js'
import { risultatoLetto } from './result.js'
import { apriMicrofono, FREQUENZA, type Presa } from './voice.js'

/**
 * Come si ridisegna l'ospite.
 *
 * Lo dichiara chi ci vive dentro: il pannello ridisegna tutto il guscio, la
 * finestra staccata ridisegna sé stessa. Qui non si sa quale dei due sia, e non
 * si deve — una chiamata ad `aggiorna()` legherebbe questo file allo stato del
 * pannello, e la finestra staccata se lo porterebbe dietro tutto.
 */
let ridisegna: () => void = () => undefined

export function collegaRidisegno (fare: () => void): void {
  ridisegna = fare
}

/** Un attrezzo aperto durante un turno: la procedura, e com'è andata. */
interface AttrezzoVisto {
  nome: string
  ok: boolean
  codice?: string
  /**
   * Perché non è andata, con le parole che si leggono.
   *
   * Stava soltanto nel `title` della pastiglia rossa: su un portatile col
   * trackpad quel testo non si apre, e lo schermo che parla non lo legge. Il
   * motivo vero — «la classe non è in questo semestre» — è quel che dice se
   * rifare la domanda o cambiare pagina, e non può stare dove non si arriva.
   */
  messaggio?: string
}

export interface Turno {
  ruolo: 'utente' | 'assistente'
  testo: string
  /** Solo sui turni dell'assistente: le procedure che ha aperto per rispondere. */
  attrezzi?: AttrezzoVisto[]
  /**
   * Gli id incontrati leggendo per scrivere questo turno.
   *
   * Stanno nel turno e non in una variabile a parte per la stessa ragione dei
   * risultati: appartengono a **questa** conversazione e se ne vanno con lei.
   * Chi preme «svuota» vuole che quei nomi spariscano, e una lista tenuta
   * altrove gli sopravviverebbe senza che nulla lo dica.
   */
  visti?: IdVisto[]
  /**
   * Quel che quelle procedure hanno letto, già impaginato dal contratto.
   *
   * Non è la risposta e non passa dal modello: è la busta della lettura, divisa
   * in colonne da `api/presentation.ts`. Sta nel turno e non in una variabile
   * a parte perché appartiene a **quella** domanda — si cancella con lei, e
   * scorrendo indietro la tabella si ritrova sotto la frase che la introduce.
   */
  risultati?: RisultatoAssistente[]
  /** Il servizio non ha risposto: è un'altra cosa da «non lo so». */
  guasto?: boolean
  /**
   * Chi ha chiesto ha smesso di aspettare.
   *
   * Non è un guasto, ed era segnato come tale: un gesto **voluto** si
   * disegnava con lo stile dell'errore e si annunciava come un errore. Resta
   * comunque fuori dalla storia che si manda al modello — «Fermato.» non è una
   * battuta di nessuno.
   */
  fermato?: boolean
}

let conversazione: Turno[] = []
/** Quel che è battuto nel campo e non ancora mandato: sopravvive ai ridisegni. */
let bozza = ''
/** Un giro in volo: il campo si blocca e il pulsante diventa «Ferma». */
let inCorso = false
/**
 * Il filo del giro in volo: come si chiude, e quanto se n'è visto.
 *
 * Il conto **non si tiene più qui**. Lo tiene `bridge.ts`, che è l'unico punto
 * da cui passano tutti i messaggi del giro: contandolo di qua si contavano solo
 * quelli che il ponte riconosceva, e ogni evento scartato di là — un campo
 * mancante, un `'pezzo'` — faceva scivolare il numero. Riprendendo il giro in
 * un'altra finestra, `da` era troppo basso e le pastiglie si riscrivevano.
 */
let filo: FiloAperto | null = null

// ---------------------------------------------------------------- la voce

/**
 * A che punto è il microfono.
 *
 * Quattro stati e non un booleano: fra il «ho smesso di parlare» e l'ultima
 * parola scritta passano ancora alcuni secondi in cui il programma macina, e
 * in quei secondi il pulsante non deve né sembrare che stia ancora ascoltando
 * né tornare come se non fosse successo niente.
 *
 * `ascolta` e `trascrive` non si escludono davvero: mentre si parla i pezzi già
 * chiusi stanno **già** diventando testo. Vince `ascolta`, perché è quel che
 * chi guarda sta facendo — la trascrizione la vede da sé, nella casella che si
 * riempie.
 */
let voce: 'fermo' | 'ascolta' | 'prepara' | 'trascrive' = 'fermo'
/** La registrazione aperta, finché dura. */
let presa: Presa | null = null
/**
 * I pezzi di voce chiusi e non ancora trascritti.
 *
 * Una coda e non una raffica di chiamate parallele: whisper si prende quasi
 * tutti i processori che gli si concedono, e due trascrizioni insieme sono due
 * trascrizioni più lente di due fatte in fila. In fila, per giunta, il testo
 * esce **nell'ordine in cui è stato detto** — che con due risposte in volo non
 * sarebbe garantito.
 */
let codaVoce: Int16Array[] = []
/** Se il giro che smaltisce la coda è già in piedi. */
let macinaVoce = false
/**
 * Che cosa sta scendendo, la prima volta che si detta su questa macchina.
 *
 * `null` quasi sempre: il corredo della dettatura — il programma e il modello —
 * si scarica una volta e poi c'è. Quella volta, però, sono minuti, e senza un
 * numero che si muove chi ha premuto il microfono chiude il pannello convinto
 * che si sia piantato. Vedi `data/voiceKit.ts`.
 */
let corredo: { titolo: string, byte: number, totale: number } | null = null
/**
 * Perché la dettatura non ha prodotto niente.
 *
 * Sta sotto la casella, dove chi ha premuto sta già guardando, e non in una
 * notifica: «non ho sentito niente» non è un guasto del registro, è una cosa da
 * rifare parlando più vicino. Si spegne al prossimo tentativo.
 */
let motivoVoce = ''
/** Il prossimo disegno rimette il cursore nella casella: vedi `concludiVoce`. */
let fuocoAllaCasella = false

// --------------------------------------------------------------- il mandare

/**
 * Manda la domanda e apre il turno dell'assistente.
 *
 * Il turno dell'assistente nasce **vuoto e subito**: è lui che porta gli
 * attrezzi mentre arrivano, e crearlo solo alla fine vorrebbe dire una pagina
 * ferma per venti secondi senza niente che si muova.
 */
function manda (ambiente: Ambiente): void {
  const domanda = bozza.trim()
  if (domanda === '' || inCorso) return

  conversazione.push({ ruolo: 'utente', testo: domanda })
  const risposta: Turno = { ruolo: 'assistente', testo: '', attrezzi: [], risultati: [] }
  conversazione.push(risposta)
  bozza = ''
  inCorso = true

  // Il contesto si compone **adesso**, e parte dentro questa busta.
  //
  // Prima viaggiava per un canale suo, che è una scrittura e sta in coda,
  // mentre la domanda la coda la salta: si generava un PDF che impiega dieci
  // secondi, si cambiava corso dalla tendina, si scriveva la domanda — e il
  // modello rispondeva sul corso di prima, dichiarando con precisione la
  // classe sbagliata. Chi lo compone è l'ospite: la finestra staccata il
  // registro non ce l'ha e non lo passa, e l'host ricade su quel che il
  // pannello gli ha mandato per ultimo.
  filo = conversa(
    storiaPerIlModello(risposta),
    filoDi(risposta),
    ambiente.contesto?.(),
    idGiaVisti(),
  )

  ridisegna()
}

/**
 * Gli id che questa conversazione ha già incontrato, dal più recente.
 *
 * Si rileggono dai turni a ogni domanda invece di tenerne una copia: la copia
 * è la cosa che resta indietro quando si cancella un turno, e qui «restare
 * indietro» vorrebbe dire ricordare il nome di qualcuno che chi guarda crede
 * di aver tolto dallo schermo.
 */
function idGiaVisti (): IdVisto[] {
  const tenuti: IdVisto[] = []
  for (let i = conversazione.length - 1; i >= 0; i -= 1) {
    for (const visto of conversazione[i].visti ?? []) {
      if (!tenuti.some((gia) => gia.id === visto.id)) tenuti.push(visto)
    }
  }
  return tenuti
}

/**
 * La conversazione come la legge il modello.
 *
 * Fuori il turno appena aperto — dentro non c'è ancora niente, e un messaggio
 * dell'assistente vuoto in coda è il modo di far ricominciare da capo un
 * modello piccolo — e fuori i turni che non sono battute: un guasto del
 * servizio, un «Fermato.».
 *
 * E fuori **anche la domanda che li aveva provocati**. Toglierne uno solo
 * lasciava `[utente, utente]` di fila dopo un guasto e una seconda domanda, e i
 * template di chat di parecchi modelli locali si aspettano l'alternanza: la
 * seconda domanda tornava indietro storta, o inglobata nella prima.
 */
function storiaPerIlModello (
  aperto: Turno,
): Array<{ ruolo: 'utente' | 'assistente', testo: string }> {
  const battute: Turno[] = []
  for (const turno of conversazione) {
    if (turno === aperto) continue
    if (turno.guasto || turno.fermato) {
      // Il turno che l'ha provocato è quello subito prima, ed è di chi chiede.
      if (battute.at(-1)?.ruolo === 'utente') battute.pop()
      continue
    }
    if (turno.testo === '') continue
    battute.push(turno)
  }
  return battute.map((turno) => ({ ruolo: turno.ruolo, testo: turno.testo }))
}

/**
 * Che cosa fare di quel che torna, per il turno che si sta scrivendo.
 *
 * Una funzione e non un oggetto scritto due volte: lo stesso filo serve la
 * domanda appena partita e quella ripresa da un'altra finestra, e due copie
 * avrebbero cominciato a divergere al primo evento nuovo — nella copia
 * sbagliata, che è quella che si prova di meno.
 */
function filoDi (risposta: Turno): FiloAssistente {
  const concludi = (): void => {
    inCorso = false
    filo = null
    ridisegna()
  }
  return {
    alAttrezzo: (attrezzo) => {
      // `??=` e non un `?.push` che sparisce: con `attrezzi` indefinito la
      // pastiglia non si aggiungeva e nessuno se ne accorgeva, perché il conto
      // degli eventi avanzava lo stesso.
      risposta.attrezzi ??= []
      risposta.attrezzi.push(attrezzo)
      ridisegna()
    },
    // I dati arrivano prima della frase, e si mostrano subito: la parte lenta
    // è il modello che scrive, e restare venti secondi davanti a una rotella
    // mentre la tabella è già pronta è tempo speso per niente.
    alRisultato: (risultato) => {
      risposta.risultati ??= []
      risposta.risultati.push(risultato)
      ridisegna()
    },
    allaFine: (testo, visti) => {
      // Gli id imparati restano attaccati al turno che li ha visti: di lì
      // ripartono con la domanda dopo, e con la conversazione se ne vanno.
      if (visti && visti.length > 0) risposta.visti = visti
      // Un modello che non dice niente non deve lasciare una bolla vuota: è il
      // caso in cui ha speso tutti i giri in attrezzi e non ha concluso. Una
      // `fine` **senza** testo non arriva più fin qui: il ponte la riconosce
      // per quel che è — un guasto di trasporto — invece di travestirla da
      // frase del modello.
      risposta.testo = testo || 'Non sono riuscito a rispondere con quel che ho letto.'
      concludi()
    },
    alGuasto: (errori) => {
      risposta.testo = errori.join(' ')
      risposta.guasto = true
      concludi()
    },
  }
}

/**
 * Chiude il filo del giro in volo e azzera quel che lo riguarda.
 *
 * In un punto solo perché si sbagliava sempre nello stesso modo: `metti()`
 * rimpiazzava la conversazione senza chiudere il filo di prima, e quel filo
 * restava iscritto per sempre — quando il suo `fine` arrivava, spegneva la
 * rotella e il pulsante «Ferma» **del giro nuovo**, che da quel momento non era
 * più interrompibile e non riceveva più niente.
 */
function chiudiGiro (): void {
  filo?.smetti()
  filo = null
  inCorso = false
}

/**
 * Smette di aspettare.
 *
 * Dall'altra parte il modello va avanti — non si ferma perché nessuno guarda —
 * e il turno resta scritto com'era: dire «fermato» è più onesto che far sparire
 * la domanda come se non fosse mai partita.
 */
export function ferma (): void {
  chiudiGiro()
  const ultimo = conversazione.at(-1)
  if (ultimo && ultimo.ruolo === 'assistente' && ultimo.testo === '') {
    ultimo.testo = 'Fermato.'
    // `fermato` e non `guasto`: è un gesto voluto, e segnarlo come un errore
    // vuol dire disegnarlo in rosso e annunciarlo come un errore a chi usa lo
    // schermo che parla. Fuori dalla storia del modello resta comunque.
    ultimo.fermato = true
  }
  ridisegna()
}

export function svuota (): void {
  ferma()
  conversazione = []
  ridisegna()
}

// ------------------------------------------------------------- il dettare

/**
 * Quel che è stato detto, attaccato a quel che era già scritto.
 *
 * Non sostituisce: chi ha battuto mezza domanda e poi ha preferito dire il
 * resto si ritroverebbe la prima metà cancellata, e una casella che cancella
 * quel che c'era è una casella in cui non si detta più.
 */
function unisci (scritto: string, detto: string): string {
  return scritto.trim() === '' ? detto : `${scritto.trimEnd()} ${detto}`
}

/**
 * Butta via dei campioni appena serviti.
 *
 * Non è scrupolo di memoria — il raccoglitore se ne occuperebbe comunque — è
 * che quel vettore **è la voce di chi ha parlato del registro di una classe**:
 * dentro ci sono i cognomi che ha appena pronunciato. Azzerarlo appena il testo
 * è arrivato vuol dire che non resta appeso a una coda, a un giro chiuso o a un
 * pezzo di questo modulo che sopravvive alla finestra.
 *
 * Il gemello dall'altra parte è il `finally` di `data/whisper.ts`, che cancella
 * il WAV temporaneo anche quando la trascrizione è andata storta.
 */
function scorda (campioni: Int16Array): void {
  campioni.fill(0)
}

/** I pezzi in coda, buttati via senza trascriverli. */
function svuotaCoda (): void {
  for (const pezzo of codaVoce) scorda(pezzo)
  codaVoce = []
}

/**
 * Trascrive la coda, un pezzo per volta, finché ce n'è.
 *
 * Gira accanto al microfono aperto e non dopo: è tutto il tempo reale di questa
 * funzionalità. Ogni pezzo che torna si attacca alla bozza e si vede comparire
 * mentre si sta ancora parlando.
 *
 * Un pezzo che non torna niente **non ferma il microfono**: in mezzo a una
 * dettatura lunga capita un colpo di tosse che passa la soglia e non è una
 * parola, e spegnere tutto per quello vorrebbe dire ricominciare da capo. Il
 * motivo si mostra sotto la casella e il pezzo dopo lo cancella.
 */
async function smaltisciVoce (): Promise<void> {
  if (macinaVoce) return
  macinaVoce = true
  try {
    while (codaVoce.length > 0) {
      const pezzo = codaVoce.shift() as Int16Array
      try {
        const esito = await detta(pezzo, FREQUENZA, (avanzamento) => {
          // Il primo avanzamento è anche quel che dice che si sta scaricando:
          // non c'è un messaggio apposta per l'inizio, perché fra «comincio» e
          // «sono a un megabyte» non passa niente che valga una riga.
          if (voce !== 'ascolta') voce = avanzamento.finito ? 'trascrive' : 'prepara'
          corredo = avanzamento.finito ? null : avanzamento
          ridisegna()
        })
        corredo = null
        motivoVoce = esito.ok ? '' : esito.motivo
        if (esito.ok) {
          bozza = unisci(bozza, esito.testo)
          // Il cursore segue quel che si sta dettando, in fondo a quel che è
          // stato scritto: chi ha parlato quasi sempre rilegge, corregge un
          // cognome e manda, e trovarsi il fuoco sul pulsante del microfono
          // vuol dire prendere il mouse per fare l'ultima cosa. È anche quel
          // che tiene la casella scorsa in fondo mentre il testo cresce.
          fuocoAllaCasella = true
        }
      } catch (guasto) {
        corredo = null
        motivoVoce = guasto instanceof Error ? guasto.message : String(guasto)
      } finally {
        scorda(pezzo)
      }
      ridisegna()
    }
  } finally {
    macinaVoce = false
  }
  // La coda è finita: se il microfono era già chiuso, adesso è finito tutto.
  if (voce === 'trascrive' || voce === 'prepara') {
    voce = 'fermo'
    ridisegna()
  }
}

/** Apre il microfono. Il permesso lo chiede il sistema, la prima volta. */
async function accendiVoce (): Promise<void> {
  if (voce !== 'fermo' || inCorso) return
  motivoVoce = ''
  voce = 'ascolta'
  svuotaCoda()
  ridisegna()
  try {
    presa = await apriMicrofono({
      // Ogni pausa chiude un pezzo, e ogni pezzo parte subito: è qui che la
      // dettatura diventa in tempo reale, e non in una funzione che aspetta la
      // fine per mandare tutto insieme.
      alPezzo: (campioni) => {
        codaVoce.push(campioni)
        void smaltisciVoce()
      },
      // Il tetto scatta da sé dopo dieci minuti: la presa si è già chiusa, e
      // qui resta da smettere di dire «ti ascolto» invece di lasciare un
      // pulsante «Ferma» acceso su un microfono che non ascolta più.
      alTetto: () => {
        presa = null
        if (voce === 'ascolta') voce = codaVoce.length > 0 || macinaVoce ? 'trascrive' : 'fermo'
        ridisegna()
      },
    })
  } catch (guasto) {
    presa = null
    voce = 'fermo'
    motivoVoce = guasto instanceof Error ? guasto.message : String(guasto)
  }
  ridisegna()
}

/**
 * Chiude il microfono e aspetta che l'ultimo pezzo diventi testo.
 *
 * La frase **non parte da sola**, ed è la decisione che conta di più in questo
 * file: una trascrizione sbagliata su un cognome — e sui cognomi si sbaglia —
 * diventerebbe una domanda che nessuno ha fatto, con dentro il nome di
 * qualcun altro. Si scrive nella casella, si rilegge, si manda.
 *
 * Quasi tutto quel che si è detto è già nella casella quando si preme: qui
 * resta l'ultima frase, quella fra l'ultima pausa e il pulsante.
 */
async function concludiVoce (): Promise<void> {
  const aperta = presa
  if (!aperta || voce !== 'ascolta') return
  presa = null
  voce = 'trascrive'
  ridisegna()
  // `ferma` consegna l'ultimo pezzo prima di staccare il microfono: quando
  // questa riga è passata, in coda c'è tutto quel che è stato detto.
  await aperta.ferma()
  if (codaVoce.length === 0 && !macinaVoce) {
    voce = 'fermo'
    // Anche senza un'ultima frase il cursore torna dove si scrive: chi ha
    // premuto «Ferma» sta per rileggere quel che ha dettato.
    fuocoAllaCasella = true
    ridisegna()
    return
  }
  await smaltisciVoce()
}

/**
 * Chiude il microfono e butta via quel che non è ancora diventato testo.
 *
 * Quel che è **già** nella casella ci resta: è testo in una casella di testo,
 * chi l'ha dettato lo vede e lo cancella come cancellerebbe quel che ha
 * battuto. Toglierlo da qui vorrebbe dire una casella che si svuota da sola,
 * e si porterebbe via anche le parole battute a mano prima di premere.
 */
function annullaVoce (): void {
  if (voce !== 'ascolta') return
  presa?.annulla()
  presa = null
  svuotaCoda()
  // Quel che è già in volo verso whisper torna e si attacca lo stesso: è una
  // frase che è stata detta davvero, e non c'è modo di richiamare indietro un
  // processo che sta già macinando. Il pezzo successivo non parte, perché la
  // coda è vuota.
  voce = macinaVoce ? 'trascrive' : 'fermo'
  motivoVoce = ''
  ridisegna()
}

// ---------------------------------------------------------------- il disegno

/**
 * Una procedura aperta, con il suo nome vero.
 *
 * Il nome non si abbellisce: `corso.presenze` è come si chiama nel contratto,
 * è quel che finisce nel giornale, ed è la parola con cui se ne parla altrove
 * — nella riga di comando, in `docs/API.md`. Tradurlo in una frase renderebbe
 * più difficile, non più facile, capire che cosa è stato letto.
 */
function attrezzo (visto: AttrezzoVisto): Figlio {
  return h(
    'span',
    {
      class: ['assistente__attrezzo', !visto.ok && 'assistente__attrezzo--no'],
      attr: {
        title: visto.ok
          ? `Letto: ${visto.nome}`
          : `Non riuscito: ${visto.nome}${visto.codice ? ` (${visto.codice})` : ''}`,
      },
    },
    icona(visto.ok ? 'spunta' : 'avviso'),
    h('code', null, visto.nome),
  )
}

/**
 * Perché una lettura non è andata, scritto sotto le pastiglie.
 *
 * Il motivo c'era già — l'host lo compone per rimandarlo al modello — e alla
 * pagina arrivava solo il codice: la frase finiva nel `title` della pastiglia,
 * cioè in un posto che col trackpad non si apre e che lo schermo che parla non
 * legge. Solo l'ultima fallita: quando il modello insiste sullo stesso attrezzo
 * il motivo è sempre quello, e ripeterlo tre volte è rumore sopra la risposta.
 */
function motivoAttrezzo (attrezzi: readonly AttrezzoVisto[]): Figlio {
  const caduto = [...attrezzi].reverse().find((visto) => !visto.ok && visto.messaggio)
  if (!caduto?.messaggio) return null
  return h(
    'p',
    { class: 'assistente__attrezzo-motivo' },
    icona('avviso', 'icona--minuta'),
    caduto.messaggio,
  )
}

/** La rotella dell'attesa, con accanto quel che si sta facendo. */
function attesa (turno: Turno): Figlio {
  const quanti = turno.attrezzi?.length ?? 0
  return h(
    'p',
    { class: 'assistente__attesa', attr: { role: 'status', 'aria-live': 'polite' } },
    h('span', { class: 'assistente__rotella' }),
    quanti === 0 ? 'Sto pensando…' : 'Sto leggendo il registro…',
  )
}

/**
 * Il testo di un turno.
 *
 * Quel che scrive chi chiede resta **una riga di testo**: è già come l'ha
 * battuta, e riconoscerci dentro dei segni vorrebbe dire far sparire un
 * asterisco dalla domanda di chi lo ha scritto apposta.
 *
 * Quel che risponde il modello passa da `corpoDellaRisposta`: sei persone con
 * le loro assenze scritte in colonna si scorrono con il dito, e la differenza
 * fra «4» e «14» si vede contando le cifre. In tabella si leggono.
 *
 * Continua a non interpretarsi **niente**: non si costruisce HTML da una
 * stringa del modello, si costruiscono nodi di testo dentro nodi che decide
 * questo codice. `answer.ts` dice come.
 */
function corpo (turno: Turno): Figlio {
  if (turno.ruolo === 'utente' || turno.guasto || turno.fermato) {
    return h(
      'p',
      {
        class: 'assistente__testo assistente__testo--battuto',
        // Un guasto si annuncia. `attesa()` dice «Sto pensando…» con un
        // `aria-live`, e poi non diceva più niente: chi usa lo schermo che
        // parla restava sulla rotella per sempre, senza sapere che il giro era
        // già finito male. Il turno fermato no — l'ha fermato chi ascolta, e
        // non c'è niente da annunciargli.
        ...(turno.guasto ? { attr: { role: 'alert' } } : {}),
      },
      turno.testo,
    )
  }
  return h('div', { class: 'assistente__testo' }, ...corpoDellaRisposta(turno.testo))
}

function bolla (turno: Turno, ultimo: boolean): Figlio {
  const attrezzi = turno.attrezzi ?? []
  return h(
    'div',
    {
      class: [
        'assistente__turno',
        `assistente__turno--${turno.ruolo}`,
        turno.guasto && 'assistente__turno--guasto',
        turno.fermato && 'assistente__turno--fermato',
      ],
    },
    attrezzi.length > 0
      ? h('div', { class: 'assistente__attrezzi' }, ...attrezzi.map((visto) => attrezzo(visto)))
      : null,
    motivoAttrezzo(attrezzi),
    turno.testo !== ''
      ? corpo(turno)
      : ultimo && inCorso
        ? attesa(turno)
        : null,
    // I dati sotto la frase che li introduce: il modello dice che cosa ha
    // guardato e che cosa se ne ricava, il registro mostra le righe. Restano
    // anche quando la risposta non è arrivata — un giro fermato, un modello che
    // si è perso — perché quel che si è letto si è letto.
    ...(turno.risultati ?? []).map((risultato) => risultatoLetto(risultato)),
  )
}

/**
 * Il campo della domanda.
 *
 * Non passa da `campo()`: quello vive dentro un modulo, con etichetta e
 * griglia, e qui il campo *è* la pagina. Invio manda, Maiusc+Invio va a capo —
 * che è come si comporta ogni altra casella di conversazione, e chi scrive non
 * deve impararlo.
 */
function scrittoio (ambiente: Ambiente): Figlio {
  const casella = h('textarea', {
    class: 'assistente__campo',
    attr: {
      rows: 3,
      placeholder: 'Che cosa vuoi sapere del registro?',
      'aria-label': 'La domanda per l’assistente',
    },
    // `ridisegna` qui rifà tutto il guscio, e lo chiama chiunque: ogni pagina
    // letta da un OCR, il filo dell'attesa che si accende e si spegne, un
    // avanzamento che arriva dall'host. Il campo si ricrea, e senza questa
    // chiave `ricordaFuoco` non ha modo di ritrovarlo: la bozza tornava al suo
    // posto — `casella.value = bozza`, qui sotto — ma il cursore usciva a metà
    // parola, e la parola dopo finiva da un'altra parte.
    dataset: { fuoco: 'assistente-domanda' },
    disabled: inCorso,
  })
  casella.value = bozza
  if (fuocoAllaCasella) {
    fuocoAllaCasella = false
    // Dopo che l'ospite ha attaccato il nodo: prima non c'è niente da mettere
    // a fuoco, e `ricordaFuoco` lo riporterebbe comunque dov'era.
    queueMicrotask(() => {
      casella.focus()
      casella.setSelectionRange(casella.value.length, casella.value.length)
    })
  }
  casella.addEventListener('input', () => {
    // Nessun ridisegno a ogni tasto: la bozza si tiene qui e torna nel campo al
    // prossimo giro, che arriva dagli attrezzi e non dalla tastiera.
    bozza = casella.value
  })
  casella.addEventListener('keydown', (evento) => {
    // Esc mentre il microfono è aperto: si smette senza scrivere niente. È la
    // via d'uscita di chi ha premuto per sbaglio, o di chi si è accorto che
    // stava per dire il nome di un allievo a voce alta in sala docenti.
    if (evento.key === 'Escape' && voce === 'ascolta') {
      evento.preventDefault()
      annullaVoce()
      return
    }
    if (evento.key !== 'Enter' || evento.shiftKey) return
    evento.preventDefault()
    bozza = casella.value
    manda(ambiente)
  })

  return h(
    'form',
    {
      class: 'assistente__scrittoio',
      onSubmit: (evento: Event) => {
        evento.preventDefault()
        manda(ambiente)
      },
    },
    casella,
    h(
      'div',
      { class: 'assistente__gesti' },
      nota(),
      microfono(ambiente),
      inCorso
        ? pulsante({ testo: 'Ferma', simbolo: 'pausa', variante: 'sottile', al: () => ferma() })
        : pulsante({ testo: 'Chiedi', simbolo: 'destra', tipo: 'submit' }),
    ),
  )
}

/**
 * La riga sotto la casella: come si usa, oppure perché la dettatura non ha
 * scritto niente.
 *
 * Una riga sola e non due: sono la stessa informazione in momenti diversi — che
 * cosa sta succedendo qui sotto — e tenerle insieme evita che lo scrittoio
 * cresca di una riga proprio mentre chi guarda sta leggendo.
 */
function nota (): Figlio {
  // Lo scarico per primo, e anche mentre il microfono è aperto: è l'unica cosa
  // che si misuri in minuti, e chi sta parlando davanti a una casella che non
  // si riempie deve poter leggere perché.
  //
  // Il numero e non una percentuale: «120 MB di 547 MB» dice quanto manca in un
  // modo che si può confrontare con la propria linea, mentre «22%» dice
  // soltanto che si è a un quinto di qualcosa di cui non si sa la misura.
  if (corredo) {
    return h(
      'span',
      { class: 'assistente__nota', attr: { role: 'status', 'aria-live': 'polite' } },
      `Per dettare mi manca ${corredo.titolo}: lo sto scaricando, ` +
      `${quantoMisura(corredo.byte)} di ${quantoMisura(corredo.totale)}. ` +
      'Si fa una volta sola.',
    )
  }
  if (voce === 'ascolta') {
    // Un pezzo andato storto non spegne il microfono, e la riga lo dice: chi
    // legge «manca il modello» mentre sta ancora parlando deve sapere che sta
    // parlando per niente, e chi legge «non ho sentito» deve sapere che invece
    // può continuare.
    return motivoVoce !== ''
      ? h(
          'span',
          { class: 'assistente__nota assistente__nota--guasto', attr: { role: 'status' } },
          `${motivoVoce} Continuo ad ascoltarti.`,
        )
      : h(
          'span',
          { class: 'assistente__nota', attr: { role: 'status', 'aria-live': 'polite' } },
          'Ti ascolto: quel che dici compare qui sotto a mano a mano. ' +
        'Premi «Ferma» quando hai finito, Esc per lasciar perdere.',
        )
  }
  if (motivoVoce !== '') {
    return h(
      'span',
      { class: 'assistente__nota assistente__nota--guasto', attr: { role: 'status' } },
      motivoVoce,
    )
  }
  if (voce === 'trascrive' || voce === 'prepara') {
    return h(
      'span',
      { class: 'assistente__nota', attr: { role: 'status', 'aria-live': 'polite' } },
      'Sto scrivendo quel che hai detto…',
    )
  }
  // «Non lo cambia» resta la promessa, e «apre le pagine» è la sola cosa in più
  // che sa fare: chi vede il registro spostarsi da solo su un'altra pagina deve
  // averlo letto prima qui, altrimenti la prima volta sembra un guasto.
  return h(
    'span',
    { class: 'assistente__nota' },
    'Legge il registro e ne apre le pagine; non lo cambia. Invio manda, Maiusc+Invio va a capo.',
  )
}

/**
 * Il microfono, quando la dettatura è accesa.
 *
 * Spenta non compare: un pulsante che ogni volta spiega di non essere
 * configurato è un pulsante che si impara a saltare con gli occhi, e la
 * dettatura vuole un programma e un modello che non si installano per sbaglio.
 * Dove si accende lo dice la pagina delle impostazioni, sotto «Assistente».
 */
function microfono (ambiente: Ambiente): Figlio {
  if (!ambiente.dettatura) return null
  if (voce === 'prepara') {
    return pulsante({
      titolo: 'Sto scaricando quel che serve per dettare',
      simbolo: 'microfono',
      variante: 'sottile',
      disabilitato: true,
    })
  }
  if (voce === 'trascrive') {
    return pulsante({
      titolo: 'Sto scrivendo quel che hai detto',
      simbolo: 'microfono',
      variante: 'sottile',
      disabilitato: true,
    })
  }
  if (voce === 'ascolta') {
    return pulsante({
      testo: 'Ferma',
      titolo: 'Smetti di ascoltare e scrivi quel che ho sentito',
      simbolo: 'microfono',
      variante: 'sottile',
      classe: 'assistente__microfono--acceso',
      al: () => void concludiVoce(),
    })
  }
  return pulsante({
    titolo: 'Detta la domanda a voce',
    simbolo: 'microfono',
    variante: 'fantasma',
    disabilitato: inCorso,
    al: () => void accendiVoce(),
  })
}

// ---------------------------------------------------- quel che l'ospite chiede

/** Se c'è qualcosa da dimenticare: la testata ci accende il cestino. */
export function conversazioneInCorso (): boolean {
  return conversazione.length > 0
}

/**
 * La conversazione, per consegnarla all'ospite che la riceve.
 *
 * Si prende **e si lascia**: chi la prende sta per chiudere, e una copia
 * rimasta indietro sarebbe una seconda cronologia con i nomi della classe
 * dentro, viva in una finestra che nessuno guarda più.
 */
export interface Bagaglio {
  storia: Turno[]
  /**
   * La domanda a metà, che viaggia con la conversazione.
   *
   * Si stacca quasi sempre mentre si sta scrivendo — è lì che il riquadro sta
   * stretto — e lasciarla indietro vuol dire ribatterla nella finestra nuova:
   * lo stesso difetto per cui viaggia la conversazione, un campo più in là.
   */
  bozza: string
  /**
   * La domanda a cui non è ancora arrivata risposta, se ce n'era una.
   *
   * È il caso per cui si stacca più spesso di ogni altro — la risposta tarda e
   * il riquadro sta stretto — ed era l'unico in cui spostarsi costava la
   * domanda: il filo si chiudeva, il turno diventava «Fermato.» e si ribatteva
   * tutto. Il giro però non vive qui, vive nell'host che sta parlando con il
   * modello: quel che viaggia è quanti eventi se ne sono già visti, e chi
   * arriva riprende da lì.
   */
  giro: GiroAssistente | null
}

export function prendi (): Bagaglio {
  const storia = conversazione
  const scritto = bozza
  const giro = inCorso && filo
    ? { visti: filo.visti(), busta: filo.id }
    : null
  conversazione = []
  bozza = ''
  // **Il filo resta aperto**, e non è una dimenticanza.
  //
  // Fra il clic su «Stacca» e il momento in cui l'host prende in carico
  // l'azione passa la coda delle scritture — dietro un generatore di PDF, dieci
  // secondi. Smettendo di ascoltare subito, un `fine` arrivato in quei secondi
  // veniva scartato dal ponte, l'host buttava via il giro, e quando l'azione
  // finalmente usciva dalla coda non c'era più niente da sospendere: la
  // finestra nuova si apriva con una bolla dell'assistente **vuota**, le
  // pastiglie sopra e nessuna spiegazione.
  //
  // Chi ha consegnato chiude il filo quando l'host ha confermato (`abbandona`),
  // o se lo riprende se ha rifiutato (`rimetti`). `inCorso` resta vero perché è
  // vero: una domanda è ancora in volo.
  // Il microfono non viaggia: la finestra che consegna la conversazione sta per
  // chiudersi, e una traccia audio aperta in una pagina che se ne va è una spia
  // rossa accesa senza nessuno davanti.
  presa?.annulla()
  presa = null
  // E nemmeno viaggiano i pezzi non ancora trascritti: sono la voce di chi ha
  // parlato, e una finestra che si chiude non è il posto dove lasciarli. Vedi
  // `scorda`.
  svuotaCoda()
  corredo = null
  voce = 'fermo'
  motivoVoce = ''
  return { storia, bozza: scritto, giro }
}

/**
 * La conversazione arrivata dall'ospite di prima, con la sua mezza domanda.
 *
 * E con la domanda che stava ancora aspettando, quando ce n'era una: `giro` la
 * riapre viva — la rotella che gira, gli attrezzi che continuano a passare, la
 * risposta quando arriva — invece di consegnare la cronologia di qualcosa che
 * è stato interrotto. Vedi `riprendi` qui sotto.
 */
export function metti (
  storia: readonly Turno[],
  scritto = '',
  giro?: GiroDaRiprendere,
): void {
  // Prima di tutto il resto: il giro che c'era qui dentro si chiude.
  //
  // Senza questa riga il riquadro che aveva una domanda in volo — due
  // conversazioni insieme sono un caso previsto — restava iscritto al vecchio
  // filo per sempre, e quando quel `fine` arrivava spegneva la rotella e
  // riportava «Ferma» a «Chiedi» **per il giro nuovo**, che intanto stava
  // ancora rispondendo e non era più interrompibile. Senza `giro`, il difetto
  // era l'opposto e peggiore: `inCorso` restava acceso su una conversazione
  // cancellata, e «Sto pensando…» girava all'infinito sopra una casella
  // disabilitata.
  chiudiGiro()
  conversazione = storia.map((turno) => ({ ...turno }))
  bozza = scritto
  if (giro) riprendi(giro)
  else ridisegna()
}

/**
 * La conversazione consegnata torna qui: l'host non l'ha presa in carico.
 *
 * Non passa da `metti`, e la differenza è tutta nel filo: qui il giro in volo è
 * **ancora il nostro** — `prendi` lo ha lasciato aperto apposta — e chiuderlo
 * per riaprirlo vorrebbe dire perdere gli eventi arrivati nel frattempo, che
 * sono esattamente quelli per cui si stava aspettando.
 */
export function rimetti (bagaglio: Bagaglio): void {
  // **Gli stessi turni**, non una copia: `metti` copia perché quel che riceve
  // arriva da un'altra finestra, qui i turni sono i nostri e il filo ancora
  // aperto sta scrivendo dentro *quegli* oggetti. Copiandoli, la risposta
  // arrivata durante la consegna finiva in una copia che nessuno guarda più, e
  // il riquadro si riapriva con la bolla vuota — cioè il difetto di partenza,
  // spostato di una riga.
  conversazione = bagaglio.storia
  bozza = bagaglio.bozza
  ridisegna()
}

/**
 * L'host ha preso in carico la conversazione consegnata: qui non serve più.
 *
 * Il filo era rimasto aperto fra la consegna e la conferma (vedi `prendi`);
 * adesso il giro lo ascolta l'altra finestra, e restare iscritti vorrebbe dire
 * due pagine che si scrivono addosso la stessa risposta.
 */
export function abbandona (): void {
  chiudiGiro()
  ridisegna()
}

/**
 * Riprende il filo di una domanda partita da un'altra finestra.
 *
 * Il turno da riempire è **l'ultimo**, e non uno nuovo: l'ha aperto `manda()`
 * prima dello spostamento e viaggia nella conversazione con dentro gli attrezzi
 * già passati e le tabelle già lette. Aprirne un altro vorrebbe dire due bolle
 * per una domanda sola, la prima delle quali resterebbe vuota per sempre.
 *
 * Se per qualunque ragione l'ultimo turno non è dell'assistente — una
 * conversazione arrivata da una versione che non sapeva ancora di questo campo
 * — se ne apre uno: meglio una bolla in più che una risposta scritta sopra la
 * domanda di chi ha chiesto.
 */
function riprendi (giro: GiroDaRiprendere): void {
  // Anche qui: il filo di prima si chiude prima di aprirne un altro. Chiamata
  // da `metti` è già chiuso, ma questa funzione è quella che *apre*, e un
  // giorno la chiamerà qualcun altro — due iscrizioni vive sullo stesso turno
  // sono la stessa risposta scritta due volte.
  chiudiGiro()
  let risposta = conversazione.at(-1)
  if (!risposta || risposta.ruolo !== 'assistente') {
    risposta = { ruolo: 'assistente', testo: '', attrezzi: [], risultati: [] }
    conversazione.push(risposta)
  }
  risposta.attrezzi ??= []
  risposta.risultati ??= []
  inCorso = true
  filo = riprendiConversazione(giro.id, giro.visti, filoDi(risposta))
  ridisegna()
}

/** Quel che l'ospite sa e questo file no: se è acceso, e chi risponde. */
export interface Ambiente {
  acceso: boolean
  modello: string
  /**
   * Se il microfono si può accendere.
   *
   * Arriva da fuori come `acceso` e per la stessa ragione: è un'impostazione,
   * e questo file non legge impostazioni — il riquadro le ha nello stato del
   * pannello, la finestra staccata le riceve in un messaggio.
   */
  dettatura?: boolean
  /**
   * Come si arriva alle impostazioni, quando l'assistente è spento.
   *
   * Senza, il pulsante non compare: nella finestra staccata non c'è una pagina
   * Impostazioni in cui andare, e un pulsante che non porta da nessuna parte è
   * peggio di nessun pulsante.
   */
  alleImpostazioni?: () => void
  /**
   * Dove si sta guardando, composto **nell'istante in cui si preme Invio**.
   *
   * Lo dichiara l'ospite come `acceso` e `modello`, e per la stessa ragione:
   * questo file il registro non ce l'ha. Chi non lo passa — la finestra
   * staccata — manda la domanda senza, e l'host ricade su quel che il pannello
   * gli aveva mandato per ultimo, che è il solo contesto che quella finestra
   * possa avere.
   *
   * Si chiede qui e non si riceve come valore perché una veduta composta al
   * ridisegno è una veduta di prima: fra il ridisegno e l'Invio si cambia
   * corso dalla tendina, ed è proprio quel cambio che la domanda deve portare.
   */
  contesto?: () => ContestoAssistente | null
}

/** Il corpo dell'assistente: il filo, oppure il motivo per cui non c'è. */
export function corpoAssistente (ambiente: Ambiente): Figlio {
  if (!ambiente.acceso) {
    return h(
      'div',
      { class: 'assistente' },
      statoVuoto({
        simbolo: 'informazione',
        titolo: 'L’assistente è spento',
        // Niente più «serve Ollama in esecuzione»: quel servizio non c'è più, e
        // la riga mandava a installare un programma che il registro non usa. Il
        // modello adesso è un file `.gguf` sul disco, e la pagina delle
        // impostazioni lo sa scaricare da sé. Vedi `data/llm.ts`.
        testo:
          'Si accende nelle impostazioni del programma, sotto «Assistente». Serve un modello ' +
          'scaricato sulla macchina che sappia chiamare gli strumenti — da 7 miliardi di ' +
          'parametri in su — e lo si sceglie da lì. Niente esce dal computer.',
        azione: ambiente.alleImpostazioni
          ? pulsante({
              testo: 'Apri le impostazioni',
              simbolo: 'impostazioni',
              al: ambiente.alleImpostazioni,
            })
          : null,
      }),
    )
  }

  return h(
    'div',
    { class: 'assistente' },
    conversazione.length === 0
      ? statoVuoto({
          simbolo: 'bot',
          titolo: 'Chiedi qualcosa del registro',
          testo:
            'Per esempio: «che corsi ho quest’anno?», «quante ore ha perso la 4a in ' +
            'matematica dal 1° settembre?». Sotto ogni risposta stanno le procedure che ' +
            'ha aperto per scriverla: se non ce n’è nessuna, non ha letto niente.',
        })
      : h(
          'div',
          {
            class: 'assistente__filo',
            // Resta dov'era quando l'ospite si ridisegna: il filo non cambia, e
            // riportarlo in cima farebbe perdere il segno a chi stava
            // rileggendo una risposta. Vedi `ricordaScorrimenti` in `dom.ts`.
            //
            // `segueFondo` è la seconda metà della stessa regola. Una risposta
            // arriva a pezzi — il turno vuoto, ogni attrezzo, ogni risultato,
            // la frase finale — e ogni pezzo è un ridisegno. Rimettere il filo
            // allo stesso pixel mentre cresce vuol dire guardare il fondo
            // allontanarsi: si legge una riga e le tre dopo spuntano sotto il
            // bordo. Chi era in fondo ci resta; chi è risalito a rileggere non
            // viene tirato giù a forza.
            dataset: { scorrimento: 'assistente', segueFondo: '' },
          },
          ...conversazione.map((turno, indice) =>
            bolla(turno, indice === conversazione.length - 1),
          ),
        ),
    scrittoio(ambiente),
  )
}

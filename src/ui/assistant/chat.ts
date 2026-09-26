// La conversazione: i turni, il campo, e quel che si vede mentre si aspetta.
// Vive in due finestre — il riquadro del pannello (`ui/assistant.ts`) e la
// finestra staccata (`ui/assistantWindow.ts`) — quindi non conosce lo stato del
// pannello: chi la ospita passa acceso, modello e come ridisegnare, e il bundle
// staccato non si porta dietro le viste che modificano i dati.
//
// La conversazione sta in una variabile di modulo e non si persiste: contiene
// nomi di persone, che non devono finire in un file di preferenze. Staccando
// e riattaccando si porta dietro (`prendi`/`metti`, via `panels/assistant.ts`),
// insieme al conto degli eventi della domanda in volo, il cui filo vive
// nell'host e continua anche mentre la finestra si sposta.

import type {
  ContestoAssistente,
  GiroAssistente,
  GiroDaRiprendere,
  IdVisto,
  RisultatoAssistente,
} from '../../protocol.js'
import { pulsante, statoVuoto } from '../components/base.js'
import { suggerimento } from '../components/hint.js'
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
import { testi } from './chat.testi.js'

/**
 * Come si ridisegna l'ospite: il pannello rifà il guscio, la finestra staccata
 * sé stessa. Chiamare `aggiorna()` legherebbe questo file allo stato del pannello.
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
   * Perché non è andata, con parole leggibili: il `title` non si apre col
   * trackpad né lo legge il lettore di schermo.
   */
  messaggio?: string
}

interface Turno {
  ruolo: 'utente' | 'assistente'
  testo: string
  /** Solo sui turni dell'assistente: le procedure che ha aperto per rispondere. */
  attrezzi?: AttrezzoVisto[]
  /**
   * Gli id incontrati leggendo per scrivere questo turno: stanno nel turno, così
   * «svuota» li porta via con lui.
   */
  visti?: IdVisto[]
  /**
   * Quel che le procedure hanno letto, già in colonne (`api/presentation.ts`):
   * non passa dal modello e sta sotto la frase che lo introduce.
   */
  risultati?: RisultatoAssistente[]
  /**
   * Il motore ha finito le letture concesse: la risposta è scritta con quel che
   * c'era, e sotto lo si dice. Non viaggia con i turni staccando: la forma di
   * `assistente.stacca` non ce l'ha.
   */
  esaurito?: boolean
  /** Il servizio non ha risposto: è un'altra cosa da «non lo so». */
  guasto?: boolean
  /**
   * Chi ha chiesto ha smesso di aspettare: non è un guasto e non si disegna
   * come tale, ma resta fuori dalla storia mandata al modello.
   */
  fermato?: boolean
}

let conversazione: Turno[] = []
/** Quel che è battuto nel campo e non ancora mandato: sopravvive ai ridisegni. */
let bozza = ''
/** Un giro in volo: il campo si blocca e il pulsante diventa «Ferma». */
let inCorso = false
/**
 * Il filo del giro in volo. Il conto degli eventi lo tiene `bridge.ts`, dove
 * passano tutti i messaggi, compresi quelli che non si disegnano.
 */
let filo: FiloAperto | null = null

// ---------------------------------------------------------------- la voce

/**
 * A che punto è il microfono. Tre stati: fra la fine del parlato e l'ultima
 * parola scritta il programma macina ancora. Mentre si parla i pezzi chiusi
 * vengono già trascritti, ma vince `ascolta`.
 */
let voce: 'fermo' | 'ascolta' | 'trascrive' = 'fermo'
/** La registrazione aperta, finché dura. */
let presa: Presa | null = null
/**
 * I pezzi di voce chiusi e non ancora trascritti, in coda: Whisper (in
 * voicebox) prende quasi tutti i processori, e in fila il testo esce
 * nell'ordine in cui è stato detto.
 */
let codaVoce: Int16Array[] = []
/** Se il giro che smaltisce la coda è già in piedi. */
let macinaVoce = false
/**
 * Perché la dettatura non ha prodotto niente: sotto la casella e non in una
 * notifica, perché è da rifare, non un guasto. Si spegne al tentativo dopo.
 */
let motivoVoce = ''
/** Il prossimo disegno rimette il cursore nella casella: vedi `concludiVoce`. */
let fuocoAllaCasella = false

// --------------------------------------------------------------- il mandare

/**
 * Manda la domanda e apre subito il turno dell'assistente, vuoto: porta gli
 * attrezzi mentre arrivano.
 */
function manda (ambiente: Ambiente): void {
  const domanda = bozza.trim()
  if (domanda === '' || inCorso) return

  conversazione.push({ ruolo: 'utente', testo: domanda })
  const risposta: Turno = { ruolo: 'assistente', testo: '', attrezzi: [], risultati: [] }
  conversazione.push(risposta)
  bozza = ''
  inCorso = true

  // Il contesto si compone adesso e parte dentro questa busta, così la domanda
  // non lo scavalca in coda. Lo compone l'ospite; la finestra staccata non lo
  // passa, e l'host usa l'ultimo mandato dal pannello.
  filo = conversa(
    storiaPerIlModello(risposta),
    filoDi(risposta),
    ambiente.contesto?.(),
    idGiaVisti(),
  )

  ridisegna()
}

/**
 * Gli id già incontrati, dal più recente. Si rileggono dai turni a ogni
 * domanda: una copia sopravvivrebbe ai turni cancellati.
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
 * La conversazione come la legge il modello: senza il turno appena aperto
 * (vuoto, farebbe ricominciare un modello piccolo), senza guasti e «Fermato.»,
 * e senza la domanda che li aveva provocati, perché i template di chat
 * vogliono l'alternanza utente/assistente.
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
 * Che cosa fare di quel che torna, per il turno che si sta scrivendo. Lo stesso
 * filo serve la domanda appena partita e quella ripresa da un'altra finestra.
 */
function filoDi (risposta: Turno): FiloAssistente {
  const concludi = (): void => {
    inCorso = false
    filo = null
    ridisegna()
  }
  return {
    alAttrezzo: (attrezzo) => {
      // `??=`: con `attrezzi` indefinito un `?.push` perderebbe la pastiglia in silenzio.
      risposta.attrezzi ??= []
      risposta.attrezzi.push(attrezzo)
      ridisegna()
    },
    // I dati arrivano prima della frase e si mostrano subito: la parte lenta è il
    // modello che scrive.
    alRisultato: (risultato) => {
      risposta.risultati ??= []
      risposta.risultati.push(risultato)
      ridisegna()
    },
    // Il tetto delle letture: la nota compare subito, mentre il modello scrive.
    alLimite: () => {
      risposta.esaurito = true
      ridisegna()
    },
    allaFine: (testo, visti, esaurito) => {
      if (esaurito) risposta.esaurito = true
      // Gli id imparati restano sul turno: ripartono con la domanda dopo.
      if (visti && visti.length > 0) risposta.visti = visti
      // Nessuna bolla vuota se il modello ha speso tutti i giri in attrezzi. Una
      // `fine` senza testo non arriva qui: il ponte la tratta come guasto.
      risposta.testo = testo || testi().nonRisposto
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
 * Chiude il filo del giro in volo e azzera quel che lo riguarda. In un punto
 * solo: un filo rimasto iscritto spegnerebbe, alla sua `fine`, la rotella e
 * «Ferma» del giro nuovo.
 */
function chiudiGiro (): void {
  filo?.smetti()
  filo = null
  inCorso = false
}

/**
 * Smette di aspettare e lo dice all'host, che ferma davvero il giro: niente
 * più attrezzi (né cambi di pagina) e la domanda esce dalla coda del motore
 * (`panels/conversation.ts`). Il turno resta scritto come «fermato».
 */
export function ferma (): void {
  filo?.ferma()
  chiudiGiro()
  const ultimo = conversazione.at(-1)
  if (ultimo && ultimo.ruolo === 'assistente' && ultimo.testo === '') {
    ultimo.testo = testi().fermato
    // `fermato`, non `guasto`: è voluto, non va disegnato né annunciato come errore.
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
 * Quel che è stato detto, attaccato a quel che era già scritto: sostituire
 * cancellerebbe la mezza domanda battuta a mano.
 */
function unisci (scritto: string, detto: string): string {
  return scritto.trim() === '' ? detto : `${scritto.trimEnd()} ${detto}`
}

/**
 * Azzera dei campioni appena serviti: contengono la voce, cioè i cognomi
 * appena pronunciati, e non devono restare appesi da nessuna parte. Il gemello
 * è il `finally` di `data/voicebox.ts`, che azzera il WAV in memoria.
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
 * Trascrive la coda un pezzo per volta, mentre il microfono è ancora aperto:
 * ogni pezzo si attacca alla bozza mentre si parla. Un pezzo senza testo (un
 * colpo di tosse) non ferma il microfono: il motivo va sotto la casella.
 */
async function smaltisciVoce (): Promise<void> {
  if (macinaVoce) return
  macinaVoce = true
  try {
    while (codaVoce.length > 0) {
      const pezzo = codaVoce.shift() as Int16Array
      try {
        const esito = await detta(pezzo, FREQUENZA)
        motivoVoce = esito.ok ? '' : esito.motivo
        if (esito.ok) {
          bozza = unisci(bozza, esito.testo)
          // Il cursore segue la dettatura in fondo al testo: chi ha parlato rilegge,
          // corregge e manda, senza prendere il mouse.
          fuocoAllaCasella = true
        }
      } catch (guasto) {
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
  if (voce === 'trascrive') {
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
      // Ogni pausa chiude un pezzo, che parte subito: è il tempo reale della dettatura.
      alPezzo: (campioni) => {
        codaVoce.push(campioni)
        void smaltisciVoce()
      },
      // Il tetto dei dieci minuti ha già chiuso la presa: qui si smette di dire «ti ascolto».
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
 * Chiude il microfono e aspetta che l'ultimo pezzo diventi testo. La frase non
 * parte da sola: una trascrizione sbagliata su un cognome diventerebbe una
 * domanda che nessuno ha fatto. Si rilegge e si manda.
 */
async function concludiVoce (): Promise<void> {
  const aperta = presa
  if (!aperta || voce !== 'ascolta') return
  presa = null
  voce = 'trascrive'
  ridisegna()
  // `ferma` consegna l'ultimo pezzo prima di staccare il microfono.
  await aperta.ferma()
  if (codaVoce.length === 0 && !macinaVoce) {
    voce = 'fermo'
    // Anche senza un'ultima frase il cursore torna nella casella, per rileggere.
    fuocoAllaCasella = true
    ridisegna()
    return
  }
  await smaltisciVoce()
}

/**
 * Chiude il microfono e butta quel che non è ancora testo. Quel che è già
 * nella casella resta: è testo come quello battuto.
 */
function annullaVoce (): void {
  if (voce !== 'ascolta') return
  presa?.annulla()
  presa = null
  svuotaCoda()
  // Il pezzo già in volo verso voicebox torna e si attacca lo stesso (non si può
  // richiamare); il successivo non parte, perché la coda è vuota.
  voce = macinaVoce ? 'trascrive' : 'fermo'
  motivoVoce = ''
  ridisegna()
}

// ---------------------------------------------------------------- il disegno

/**
 * Una procedura aperta, col suo nome vero (`corso.presenze`): è quello del
 * contratto, del giornale e di `docs/API.md`.
 */
function attrezzo (visto: AttrezzoVisto): Figlio {
  return h(
    'span',
    {
      class: ['assistente__attrezzo', !visto.ok && 'assistente__attrezzo--no'],
      attr: {
        title: visto.ok
          ? testi().letto(visto.nome)
          : testi().nonRiuscito(visto.nome, visto.codice),
      },
    },
    icona(visto.ok ? 'spunta' : 'avviso'),
    h('code', null, visto.nome),
  )
}

/**
 * Perché una lettura non è andata, scritto sotto le pastiglie. Solo l'ultima
 * fallita: se il modello insiste sullo stesso attrezzo il motivo è quello.
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

/**
 * Il motore ha finito le letture concesse, detto sotto le pastiglie: la
 * risposta arriva ma con parte delle letture, e conviene rifare la domanda più
 * stretta. Non è un guasto.
 */
function notaEsaurito (): Figlio {
  return h(
    'p',
    { class: 'assistente__attrezzo-motivo' },
    icona('avviso', 'icona--minuta'),
    testi().esaurito,
  )
}

/** La rotella dell'attesa, con accanto quel che si sta facendo. */
function attesa (turno: Turno): Figlio {
  const quanti = turno.attrezzi?.length ?? 0
  return h(
    'p',
    { class: 'assistente__attesa', attr: { role: 'status', 'aria-live': 'polite' } },
    h('span', { class: 'assistente__rotella' }),
    quanti === 0 ? testi().pensando : testi().leggendo,
  )
}

/**
 * Il testo di un turno. Quel che scrive chi chiede resta una riga di testo
 * (un asterisco resta un asterisco); la risposta passa da `corpoDellaRisposta`
 * per le tabelle. Non si costruisce mai HTML da una stringa del modello: solo
 * nodi di testo in nodi decisi qui (`answer.ts`).
 */
function corpo (turno: Turno): Figlio {
  if (turno.ruolo === 'utente' || turno.guasto || turno.fermato) {
    return h(
      'p',
      {
        class: 'assistente__testo assistente__testo--battuto',
        // Un guasto si annuncia (`role="alert"`), perché l'attesa detta con
        // `aria-live` non lo direbbe. Il turno fermato no: l'ha fermato chi ascolta.
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
    turno.esaurito ? notaEsaurito() : null,
    turno.testo !== ''
      ? corpo(turno)
      : ultimo && inCorso
        ? attesa(turno)
        : null,
    // I dati sotto la frase che li introduce; restano anche senza risposta,
    // perché quel che si è letto si è letto.
    ...(turno.risultati ?? []).map((risultato) => risultatoLetto(risultato)),
  )
}

/**
 * Il campo della domanda. Non passa da `campo()`, fatto per i moduli: qui il
 * campo è la pagina. Invio manda, Maiusc+Invio va a capo.
 */
function scrittoio (ambiente: Ambiente): Figlio {
  const casella = h('textarea', {
    class: 'assistente__campo',
    attr: {
      rows: 3,
      placeholder: testi().segnaposto,
      'aria-label': testi().etichettaCampo,
    },
    // Il campo si ricrea a ogni ridisegno del guscio (OCR, filo di lavoro, host):
    // la chiave di fuoco permette a `ricordaFuoco` di rimettere il cursore dov'era.
    dataset: { fuoco: 'assistente-domanda' },
    disabled: inCorso,
  })
  casella.value = bozza
  if (fuocoAllaCasella) {
    fuocoAllaCasella = false
    // Dopo che l'ospite ha attaccato il nodo.
    queueMicrotask(() => {
      casella.focus()
      casella.setSelectionRange(casella.value.length, casella.value.length)
    })
  }
  casella.addEventListener('input', () => {
    // Nessun ridisegno a ogni tasto: la bozza si tiene qui e torna nel campo al
    // giro dopo.
    bozza = casella.value
  })
  casella.addEventListener('keydown', (evento) => {
    // Esc a microfono aperto: si smette senza scrivere niente (premuto per
    // sbaglio, o un nome detto a voce alta).
    if (evento.key === 'Escape' && voce === 'ascolta') {
      evento.preventDefault()
      // Ferma la salita: nel riquadro lo stesso Esc lo chiuderebbe.
      evento.stopPropagation()
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
        ? pulsante({
            testo: testi().ferma,
            simbolo: 'pausa',
            variante: 'sottile',
            al: () => ferma(),
          })
        : pulsante({ testo: testi().chiedi, simbolo: 'destra', tipo: 'submit' }),
    ),
  )
}

/**
 * La riga sotto la casella: come si usa, oppure lo stato della dettatura. Una
 * riga sola, così lo scrittoio non cresce mentre si legge.
 */
function nota (): Figlio {
  if (voce === 'ascolta') {
    // Un pezzo andato storto non spegne il microfono, e la riga dice se conviene
    // continuare a parlare.
    return motivoVoce !== ''
      ? h(
          'span',
          { class: 'assistente__nota assistente__nota--guasto', attr: { role: 'status' } },
          testi().continuoAdAscoltare(motivoVoce),
        )
      : h(
          'span',
          { class: 'assistente__nota', attr: { role: 'status', 'aria-live': 'polite' } },
          testi().tiAscolto,
        )
  }
  if (motivoVoce !== '') {
    return h(
      'span',
      { class: 'assistente__nota assistente__nota--guasto', attr: { role: 'status' } },
      motivoVoce,
    )
  }
  if (voce === 'trascrive') {
    return h(
      'span',
      { class: 'assistente__nota', attr: { role: 'status', 'aria-live': 'polite' } },
      testi().staScrivendo,
    )
  }
  // «Non lo cambia» resta scritto, e dice anche che apre le pagine: il registro
  // che si sposta da solo non deve sembrare un guasto. Dietro la «i» solo i
  // tasti. Il contenitore (`flex: 1`) tiene microfono e «Chiedi» a destra.
  return h(
    'span',
    { class: 'assistente__nota' },
    testi().nonLoCambia,
    suggerimento(testi().tasti, { etichetta: testi().comeSiChiede }),
  )
}

/**
 * Il microfono, quando la dettatura è accesa; spenta non compare. Si accende
 * dalle impostazioni, sotto «Assistente».
 */
function microfono (ambiente: Ambiente): Figlio {
  if (!ambiente.dettatura) return null
  if (voce === 'trascrive') {
    return pulsante({
      titolo: testi().staScrivendoTitolo,
      simbolo: 'microfono',
      variante: 'sottile',
      disabilitato: true,
    })
  }
  if (voce === 'ascolta') {
    return pulsante({
      testo: testi().ferma,
      titolo: testi().smettiDiAscoltare,
      simbolo: 'microfono',
      variante: 'sottile',
      classe: 'assistente__microfono--acceso',
      al: () => void concludiVoce(),
    })
  }
  return pulsante({
    titolo: testi().detta,
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
 * La conversazione, per consegnarla all'ospite che la riceve. Si prende e si
 * lascia qui vuota: chi la consegna sta per chiudere.
 */
interface Bagaglio {
  storia: Turno[]
  /** La domanda a metà: si stacca quasi sempre mentre si scrive. */
  bozza: string
  /**
   * La domanda ancora senza risposta, se c'è. Il giro vive nell'host: viaggia
   * quanti eventi se ne sono visti, e chi arriva riprende da lì.
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
  // Il filo resta aperto: fra «Stacca» e la presa in carico dell'host passa la
  // coda delle scritture (anche dieci secondi), e un `fine` arrivato intanto
  // andrebbe perso. Lo chiude `abbandona` a conferma, o lo riprende `rimetti` a
  // rifiuto; `inCorso` resta vero.
  // Il microfono non viaggia: la finestra che consegna sta per chiudersi.
  presa?.annulla()
  presa = null
  // Nemmeno i pezzi non trascritti: sono voce (vedi `scorda`).
  svuotaCoda()
  voce = 'fermo'
  motivoVoce = ''
  return { storia, bozza: scritto, giro }
}

/**
 * La conversazione arrivata dall'ospite di prima, con la mezza domanda e, se
 * c'era, la domanda in attesa: `giro` la riapre viva (vedi `riprendi`).
 */
export function metti (
  storia: readonly Turno[],
  scritto = '',
  giro?: GiroDaRiprendere,
): void {
  // Prima di tutto si chiude il giro che c'era qui: un filo vecchio iscritto
  // spegnerebbe rotella e «Ferma» del giro nuovo, e senza `giro` lascerebbe
  // `inCorso` acceso su una conversazione cancellata.
  chiudiGiro()
  conversazione = storia.map((turno) => ({ ...turno }))
  bozza = scritto
  if (giro) riprendi(giro)
  else ridisegna()
}

/**
 * La conversazione consegnata torna qui perché l'host l'ha rifiutata. Non
 * passa da `metti`: il giro in volo è ancora nostro, e chiuderlo perderebbe
 * gli eventi arrivati nel frattempo.
 */
export function rimetti (bagaglio: Bagaglio): void {
  // Gli stessi turni, non una copia: il filo aperto sta scrivendo dentro quegli
  // oggetti.
  conversazione = bagaglio.storia
  bozza = bagaglio.bozza
  ridisegna()
}

/**
 * L'host ha preso in carico la conversazione consegnata: il filo tenuto aperto
 * da `prendi` si chiude, ora lo ascolta l'altra finestra.
 */
export function abbandona (): void {
  chiudiGiro()
  ridisegna()
}

/**
 * Riprende il filo di una domanda partita da un'altra finestra, sull'ultimo
 * turno (aperto da `manda()` e arrivato con attrezzi e tabelle). Se l'ultimo
 * turno non è dell'assistente se ne apre uno, per non scrivere sopra la domanda.
 */
function riprendi (giro: GiroDaRiprendere): void {
  // Il filo di prima si chiude prima di aprirne un altro: due iscrizioni sullo
  // stesso turno scriverebbero due volte.
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
interface Ambiente {
  acceso: boolean
  modello: string
  /**
   * Se il microfono si può accendere: un'impostazione, che questo file non legge
   * (il riquadro ce l'ha nello stato, la finestra staccata la riceve).
   */
  dettatura?: boolean
  /**
   * Come si arriva alle impostazioni ad assistente spento. Senza, il pulsante
   * non compare (la finestra staccata non ha dove portare).
   */
  alleImpostazioni?: () => void
  /**
   * Dove si sta guardando, composto quando si preme Invio: fra il ridisegno e
   * l'Invio si può cambiare corso. Chi non lo passa (la finestra staccata) manda
   * la domanda senza, e l'host usa l'ultimo contesto del pannello.
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
        titolo: testi().spento,
        // Il modello è un file `.gguf` che le impostazioni sanno scaricare (`data/llm.ts`).
        testo: testi().spentoTesto,
        azione: ambiente.alleImpostazioni
          ? pulsante({
              testo: testi().apriImpostazioni,
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
          titolo: testi().vuoto,
          // Gli esempi restano in vista: sono l'invito a cominciare, e spariscono alla
          // prima domanda.
          testo: testi().vuotoTesto,
        })
      : h(
          'div',
          {
            class: 'assistente__filo',
            // Lo scorrimento resta al ridisegno (`ricordaScorrimenti` in `dom.ts`), e
            // `segueFondo` tiene in fondo chi era in fondo mentre la risposta arriva a
            // pezzi; chi è risalito a rileggere resta dov'è.
            dataset: { scorrimento: 'assistente', segueFondo: '' },
          },
          ...conversazione.map((turno, indice) =>
            bolla(turno, indice === conversazione.length - 1),
          ),
        ),
    scrittoio(ambiente),
  )
}

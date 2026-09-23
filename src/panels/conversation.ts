// Una domanda all'assistente, e quel che torna indietro mentre si risponde.
//
// Sta a parte dai due pannelli perché li riguarda tutti e due allo stesso modo:
// il riquadro dentro il registro e la finestra staccata mandano la stessa busta
// e aspettano gli stessi eventi, e la differenza fra loro — dove si disegnano —
// non arriva fin qui. Scritto in un pannello e copiato nell'altro sarebbero due
// traduzioni della stessa conversazione, e la seconda resterebbe indietro al
// primo evento nuovo.
//
// **Non c'è nessuna coda e nessuna serializzazione**, ed è voluto: due
// conversazioni avviate insieme leggono lo stesso registro in memoria e non si
// disturbano, perché nessuna delle due scrive. Che non possano scrivere non lo
// garantisce questo file: lo garantisce `api/transports/assistant.ts`, che
// ricontrolla il genere di ogni procedura prima di chiamarla.
//
// ------------------------------------------------------- il giro che si sposta
//
// Un giro vive qui e non nella pagina che l'ha chiesto: il modello sta
// rispondendo a questo processo, e una finestra che si chiude non lo ferma. Fin
// qui però quel che tornava non trovava più nessuno — staccare o riattaccare a
// metà di una domanda voleva dire buttarla via e ribatterla — e siccome si
// stacca **proprio** quando la risposta tarda, il giro perduto era sempre il
// più lungo.
//
// Adesso il giro si mette da parte. Chi consegna la conversazione dice **quale
// giro** e quanti eventi ne ha già ricevuti; il giro smette di scrivere verso
// la finestra che se ne va e tiene in mano quel che arriva; la finestra che
// prende la conversazione manda una `SeguiConversazione` e si sente
// riconsegnare **dal punto in cui l'altra si era fermata** — non dall'inizio,
// che vorrebbe dire attrezzi e tabelle scritti due volte sotto la stessa
// risposta.
//
// «Quale» conta, e non è una raffinatezza: si indovinava — il più recente — e
// due conversazioni vive insieme sono un caso previsto. La finestra che
// riattaccava sospendeva il giro del riquadro, quello smetteva di ricevere per
// sempre, e la finestra si riprendeva un conto di eventi contato su un filo che
// non era il suo.
//
// **Un giro sospeso ha una scadenza.** Dentro ci sono le tabelle lette dal
// registro, cioè i nomi di una classe: se nessuno lo riprende — la finestra non
// si apre, l'assistente si spegne — dopo un minuto si butta, come la
// conversazione in volo di `panels/assistant.ts` e per la stessa ragione.

import { conversa } from '../api/transports/assistant.js'
import type { Archivio } from '../data/archive.js'
import type { Conversazione, MessaggioAssistente } from '../protocol.js'

/** Un evento del giro senza il suo destinatario: l'`id` lo mette chi ascolta. */
type EventoGiro = Omit<MessaggioAssistente, 'tipo' | 'id'>

/**
 * Da quale pagina viene un giro.
 *
 * Non è un ornamento: senza, `sospendiGiroInCorso` sceglieva «il più recente» e
 * poteva mettere da parte il giro della pagina sbagliata. Il riquadro e la
 * finestra staccata chiedono insieme — è un caso previsto, non un caso limite —
 * e la finestra che riattacca sospendeva il giro del riquadro: quello smetteva
 * di ricevere per sempre, con la rotella accesa e nessun `fine`.
 */
export type OrigineGiro = 'riquadro' | 'finestra'

interface Giro {
  /** L'id della busta con cui chi ascolta adesso riconosce questo filo. */
  id: number
  /** Da dove è partita la domanda: serve a sapere di chi è il giro. */
  origine: OrigineGiro
  /** Dove scrivere, o `null` mentre il giro sta cambiando finestra. */
  invia: ((messaggio: MessaggioAssistente) => void) | null
  /**
   * Tutti gli eventi emessi, nell'ordine.
   *
   * Interi e non solo gli arretrati: chi riprende dice da quale è rimasto
   * indietro, e quel numero lo conta la pagina che ha consegnato — non questo
   * file, che non sa quanti ne siano arrivati davvero prima che si staccasse.
   */
  eventi: EventoGiro[]
  /** La risposta è arrivata: resta da parte solo finché qualcuno la prende. */
  finito: boolean
  scadenza: ReturnType<typeof setTimeout> | null
}

/**
 * I giri vivi, per numero.
 *
 * Una mappa e non una variabile sola benché ne resti quasi sempre uno: due
 * finestre possono averne ciascuna uno — in una il riquadro, nell'altra la
 * conversazione staccata — e un giro che ne scacciasse un altro perderebbe
 * proprio quel che questo file esiste per non perdere.
 */
const giri = new Map<number, Giro>()
let contatore = 0

/**
 * Quanto si tiene un giro che nessuno è venuto a riprendere.
 *
 * Un minuto: lo spostamento fra una finestra e l'altra dura il tempo di aprirla
 * — meno di un secondo — e quel che avanza è margine per una macchina lenta.
 * Oltre, quel che resta in mano non è più un trasferimento in corso: è una
 * copia delle tabelle di una classe in un processo che non le sta mostrando a
 * nessuno.
 */
const SCADENZA_SOSPESO = 60_000

/**
 * Quanto si tiene un giro **finito mentre qualcuno ascoltava ancora**.
 *
 * Fin qui si buttava subito, e sembrava giusto: consegnato, non c'è più niente
 * da tenere. Ma fra il clic su «Stacca» e il momento in cui l'azione esce dalla
 * coda delle scritture passa del tempo — dietro un generatore di PDF, dieci
 * secondi — e in quel tempo la pagina ha già smesso di disegnare. Il `fine`
 * partiva verso un webview che non lo ascoltava più, il giro si buttava, e
 * quando l'azione arrivava non c'era più niente da sospendere: la finestra
 * nuova si apriva con una bolla vuota e nessuna spiegazione.
 *
 * Trenta secondi sono il costo di questo margine, e il costo è reale: dentro un
 * giro ci sono le tabelle lette dal registro. Meno del minuto del giro sospeso
 * — lì lo spostamento è già cominciato e qualcuno sta arrivando a prenderlo —
 * e comunque un tetto, non una vita intera.
 */
const SCADENZA_CONSEGNATO = 30_000

function scarta (chiave: number): void {
  const giro = giri.get(chiave)
  if (giro?.scadenza) clearTimeout(giro.scadenza)
  giri.delete(chiave)
}

/**
 * Dopo quanto un giro che nessuno è venuto a riprendere si butta da sé.
 *
 * Il timer non tiene in piedi niente: se il programma sta chiudendo non c'è più
 * nessuna finestra che possa venirselo a prendere, e un minuto d'attesa sarebbe
 * un minuto in cui la chiusura non finisce.
 */
function programmaScadenza (chiave: number, quanto: number): void {
  const giro = giri.get(chiave)
  if (!giro) return
  if (giro.scadenza) clearTimeout(giro.scadenza)
  const scadenza = setTimeout(() => scarta(chiave), quanto)
  ;(scadenza as { unref?: () => void }).unref?.()
  giro.scadenza = scadenza
}

/**
 * Manda un evento a chi ascolta, e se lo segna.
 *
 * Se lo segna **sempre**, anche quando c'è qualcuno che ascolta: fra il momento
 * in cui una pagina smette di ascoltare e quello in cui l'host lo viene a
 * sapere passano dei millisecondi, e in quei millisecondi può arrivare un
 * attrezzo. È il numero degli eventi visti — che conta la pagina — a dire poi
 * quali riconsegnare.
 */
function emetti (chiave: number, evento: EventoGiro): void {
  const giro = giri.get(chiave)
  if (!giro) {
    // Scartato mentre il modello parlava ancora: è scaduto senza che nessuno
    // venisse a riprenderlo. Non è un caso normale, e in silenzio diventava una
    // risposta svanita senza che nessuno lo sapesse — nemmeno il giornale.
    console.error('[assistente] evento per un giro che non c’è più', evento.evento)
    return
  }
  giro.eventi.push(evento)
  giro.invia?.({ tipo: 'assistente', id: giro.id, ...evento })
}

/** Quale giro mettere da parte: lo dice chi consegna, non lo indovina questo file. */
export interface QualeGiro {
  /** La pagina che sta consegnando la conversazione. */
  origine?: OrigineGiro
  /** L'id della busta con cui quella pagina aveva chiesto: `GiroAssistente.busta`. */
  busta?: number
  /**
   * Anche un giro già finito.
   *
   * Lo chiede solo chi consegna **dichiarando** di avere una domanda in volo:
   * vuol dire che la pagina non aveva ancora visto la fine quando ha
   * consegnato, e il giro va riconsegnato anche se nel frattempo è arrivata.
   * `riprendiGiro` sa già cosa farne — riconsegna e poi scarta.
   */
  ancheFinito?: boolean
}

/**
 * Mette da parte il giro ancora in volo, per la finestra che sta per prenderlo.
 *
 * Torna il numero con cui riprenderlo, o `null` se non c'era niente da mettere
 * da parte — che è il caso normale: si stacca quasi sempre fra una domanda e
 * l'altra.
 *
 * **Quale giro lo dice chi consegna.** Prima si cercava «il più recente», e il
 * commento ammetteva che questo file non sa da quale pagina venga una busta:
 * con due conversazioni insieme — caso previsto, non caso limite — la finestra
 * che riattaccava poteva sospendere il giro del riquadro. Quello smetteva di
 * ricevere per sempre e, riprendendo, si vedeva riconsegnare eventi contati su
 * un altro filo: attrezzi e tabelle di una conversazione sotto la risposta di
 * un'altra.
 *
 * Senza `quale` resta il comportamento di prima: lo usano le prove, e una
 * pagina che non manda ancora l'id della busta ricade almeno sulla sua origine.
 */
export function sospendiGiroInCorso (quale: QualeGiro = {}): number | null {
  const candidati = [...giri.entries()]
    .filter(([, giro]) => giro.invia !== null)
    .filter(([, giro]) => quale.ancheFinito === true || !giro.finito)
    .filter(([, giro]) => quale.origine === undefined || giro.origine === quale.origine)

  // Per id della busta quando la pagina lo dice, per «il più recente di quella
  // pagina» quando non lo dice: è il ripiego, e sbaglia una finestra in meno.
  const scelto = candidati.find(([, giro]) => quale.busta !== undefined && giro.id === quale.busta)
    ?? candidati.at(-1)
  if (!scelto) return null

  const [chiave, giro] = scelto
  giro.invia = null
  programmaScadenza(chiave, SCADENZA_SOSPESO)
  return chiave
}

/**
 * Riattacca un giro sospeso alla finestra che è arrivata.
 *
 * `da` è quanti eventi la finestra di prima aveva già ricevuto: da lì in poi si
 * riconsegna tutto in un colpo, nell'ordine in cui è successo, e chi ascolta li
 * legge come se fosse sempre stato lì.
 *
 * `false` quando quel giro non c'è più — è scaduto, o l'host è stato riavviato:
 * chi chiama lo dice a chi aspetta, invece di lasciare una rotella che gira per
 * sempre.
 */
export function riprendiGiro (
  chiave: number,
  id: number,
  da: number,
  invia: (messaggio: MessaggioAssistente) => void,
): boolean {
  const giro = giri.get(chiave)
  if (!giro) return false
  if (giro.scadenza) {
    clearTimeout(giro.scadenza)
    giro.scadenza = null
  }
  giro.id = id
  giro.invia = invia
  for (const evento of giro.eventi.slice(Math.max(0, da))) {
    invia({ tipo: 'assistente', id, ...evento })
  }
  // Finito mentre nessuno guardava: adesso che è stato consegnato non c'è più
  // niente da tenere, e quel che c'era dentro sono le tabelle di una classe.
  if (giro.finito) scarta(chiave)
  return true
}

/**
 * Porta una domanda all'assistente e rimanda indietro quel che succede.
 *
 * L'`id` sulla busta è quel che permette a chi ha chiesto di tenere separati
 * due fili — e di buttare via quel che torna da un filo che nel frattempo ha
 * cancellato.
 *
 * I guasti del *motore* — l'assistente spento, il file `.gguf` mai scaricato,
 * l'attesa scaduta — tornano come `'guasto'` e non come una risposta del
 * modello: sono cose a cui chi guarda deve poter rimediare, e confonderle con
 * «non lo so» lascerebbe a cercare la colpa nella domanda.
 */
export async function rispondiConversazione (
  archivio: Archivio,
  conversazione: Conversazione,
  invia: (messaggio: MessaggioAssistente) => void,
  /**
   * Da quale pagina viene la domanda.
   *
   * Il riquadro è il caso normale ed è il valore d'ipotesi: chi lo porta è
   * `panels/panel.ts`, che di finestre staccate non ne ha. La finestra
   * dell'assistente lo dichiara, ed è quel che permette poi di sospendere
   * **il suo** giro e non quello dell'altra pagina.
   */
  origine: OrigineGiro = 'riquadro',
): Promise<void> {
  const storia = conversazione.storia.map((turno) => ({
    // I due ruoli del protocollo sono già quelli delle battute — `utente` e
    // `assistente` — e la traduzione nei nomi che un servizio si aspetta la fa
    // il motore, in `data/llamaCpp.ts`. Qui non si traduce: si dichiara il tipo.
    ruolo: turno.ruolo,
    testo: turno.testo,
  }))

  contatore += 1
  const chiave = contatore
  giri.set(chiave, {
    id: conversazione.id,
    origine,
    invia,
    eventi: [],
    finito: false,
    scadenza: null,
  })

  try {
    const esito = await conversa(archivio, {
      storia,
      // Dove si sta guardando, se la busta lo porta.
      //
      // Viaggia **con la domanda** e non per il canale di prima: quello è una
      // scrittura e sta in coda, mentre la domanda la coda la salta, e il
      // modello rispondeva sulla pagina di un minuto fa dichiarando con
      // precisione la classe sbagliata. Si passa solo quando c'è: la finestra
      // staccata il registro non ce l'ha e non lo compone, e allora vale quel
      // che il pannello ha mandato per ultimo.
      ...(conversazione.contesto !== undefined ? { contesto: conversazione.contesto } : {}),
      // Quel che la conversazione ha già imparato: lo tiene la pagina, nei
      // suoi turni, e lo rimanda a ogni domanda. Vedi `IdVisto`.
      ...(conversazione.visti ? { visti: conversazione.visti } : {}),
      al: (evento) => {
        if (evento.genere === 'attrezzo') {
          emetti(chiave, { evento: 'attrezzo', attrezzo: evento.attrezzo })
          return
        }
        // Quel che l'attrezzo ha letto, già impaginato: parte appena è pronto e
        // non con la risposta, perché la parte lenta è il modello che scrive e
        // i dati sono pronti da venti secondi. Chi ha chiesto li legge intanto.
        if (evento.genere === 'risultato') {
          emetti(chiave, { evento: 'risultato', risultato: evento.risultato })
          return
        }
        // `'testo'` arriva anche lui, ed è la stessa frase che fra un istante
        // esce come `fine`: si lascia passare apposta, e non perché nessuno
        // l'abbia notata. Rimandarla anche di qui vorrebbe dire la risposta
        // scritta due volte nella stessa bolla. Tutto il resto è un genere che
        // questo file non conosce, e lo dice invece di ingoiarlo.
        if (evento.genere !== 'testo') {
          console.error('[assistente] evento di genere sconosciuto', evento)
        }
      },
    })
    emetti(chiave, {
      evento: 'fine',
      testo: esito.testo,
      ...(esito.visti.length > 0 ? { visti: esito.visti } : {}),
    })
  } catch (guasto) {
    // Il messaggio per esteso resta in console con il resto dei guasti del
    // registro; a chi ha chiesto va la riga che si può leggere. Non si passa da
    // una notifica: una conversazione andata storta si dice dentro la
    // conversazione, dove chi ha scritto sta guardando.
    const testo = guasto instanceof Error ? guasto.message : String(guasto)
    console.error('[assistente]', guasto)
    emetti(chiave, { evento: 'guasto', errori: [testo] })
  }

  const giro = giri.get(chiave)
  if (!giro) {
    // Scaduto mentre il modello rispondeva: la risposta c'è e non ha più un
    // destinatario. Detto qui, perché in silenzio è una domanda svanita.
    console.error('[assistente] il giro è scaduto prima della risposta')
    return
  }
  giro.finito = true
  // Consegnato a qualcuno che stava ascoltando: resta ancora un momento, e poi
  // si butta da sé.
  //
  // Buttarlo subito sembrava giusto — chi ascoltava ha avuto tutto — ma «chi
  // ascoltava» è una cosa che questo file crede, non una cosa che sa: la pagina
  // può aver smesso un istante fa per consegnare la conversazione, e l'azione
  // che lo dice è ancora in coda dietro le scritture. Era il modo in cui la
  // finestra nuova si apriva con la bolla vuota. Sospeso, invece, resta finché
  // la finestra nuova non lo viene a prendere — o finché non scade.
  if (giro.invia) programmaScadenza(chiave, SCADENZA_CONSEGNATO)
}

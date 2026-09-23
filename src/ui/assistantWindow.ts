// L'assistente staccato: una finestra sola, con dentro una conversazione.
//
// È un'applicazione a sé, come lo schermo per la classe, e per la stessa
// ragione: il codice del registro non entra. Quello sa modificare i dati, e qui
// non c'è niente da modificare — si scrive una domanda, si legge una risposta,
// e le procedure che il modello apre sono tutte di sola lettura. Da qui si
// arriva a `bridge.ts`, a `dom.ts` e al modulo della conversazione, e basta.
//
// **Non riceve il `Registro`.** Di tutto il documento d'anno questa finestra
// sa due fatti — se l'assistente è acceso e quale modello risponde — e li
// riceve in un messaggio di sei righe. Vuol dire, fra l'altro, che una finestra
// dell'assistente lasciata aperta su una scrivania non ha addosso i voti e le
// assenze di nessuno: quel che passa di lì è quel che si è chiesto e quel che è
// stato risposto.
//
// Il giro è corto: si dice all'host che si è pronti, si riceve lo stato — con
// dentro la conversazione che il riquadro ha appena consegnato — e da lì in poi
// ogni messaggio o interazione passa da `disegna`.

import './styles-assistant.css'

import {
  collegaRidisegno,
  conversazioneInCorso,
  corpoAssistente,
  metti,
  prendi,
  svuota,
} from './assistant/chat.js'
import { pulsante } from './components/base.js'
import { icona } from './components/icons.js'
import {
  h,
  rimpiazza,
  ricordaFuoco,
  ricordaScorrimenti,
  ripristinaFuoco,
  ripristinaScorrimenti,
  type Figlio,
} from './dom.js'
import { ascolta, manda } from './bridge.js'

const radice = document.getElementById('radice')

/** Le due cose che questa finestra sa del registro. Fino al primo messaggio, niente. */
let acceso = false
let modello = ''
/** Se il microfono si può accendere: lo dice l'host, come tutto il resto. */
let dettatura = false

/** Evita di ridisegnare tre volte quando arrivano tre messaggi di fila. */
let disegnoProgrammato = false

function disegna (): void {
  if (!radice || disegnoProgrammato) return
  disegnoProgrammato = true
  requestAnimationFrame(() => {
    disegnoProgrammato = false
    // Le due cose che un ridisegno rovina e che non stanno da nessuna parte:
    // dov'era il cursore, e dov'era arrivato l'occhio.
    const fuoco = ricordaFuoco()
    const scorrimenti = ricordaScorrimenti()
    rimpiazza(radice, finestra())
    ripristinaFuoco(fuoco)
    ripristinaScorrimenti(scorrimenti)
  })
}

/**
 * Torna nel riquadro del registro, portandosi la conversazione.
 *
 * `prendi()` la consegna **e la lascia qui vuota**: questa finestra sta per
 * chiudersi, e una copia rimasta indietro sarebbe una seconda cronologia con i
 * nomi della classe dentro, viva in una pagina che nessuno guarda più.
 */
function riattacca (): void {
  const { storia, bozza, giro } = prendi()
  // `giro` quando il modello sta ancora rispondendo: il filo vive nell'host e
  // non in questa pagina, e basta dire da dove riprenderlo perché il riquadro
  // lo ritrovi vivo invece di una domanda interrotta a metà.
  manda({ riattacca: storia, bozza, ...(giro ? { giro } : {}) })
}

function testata (): Figlio {
  return h(
    'header',
    { class: 'riquadro-assistente__testa' },
    h(
      'div',
      { class: 'riquadro-assistente__nome' },
      icona('bot', 'icona--minuta'),
      h('strong', null, 'Assistente'),
    ),
    h(
      'span',
      { class: 'riquadro-assistente__nota' },
      // «Non scrive» e non «sola lettura», come nel riquadro: l'assistente
      // **apre le pagine** del registro, e `vista.apri` funziona anche da
      // questa finestra. La riga di prima prometteva la sola lettura e diceva
      // il falso la prima volta che il registro si spostava da solo. Quel che
      // la riga deve garantire è l'altra metà, ed è quella vera: non tocca i
      // dati.
      acceso ? `${modello} · non scrive` : 'spento',
    ),
    conversazioneInCorso()
      ? pulsante({
          titolo: 'Dimentica la conversazione',
          simbolo: 'cestino',
          variante: 'fantasma',
          al: () => svuota(),
        })
      : null,
    // «Riattacca» e non «Chiudi»: chiudere la finestra dalla sua crocetta
    // lascerebbe la conversazione qui dentro e la porterebbe via con la
    // pagina. Questo pulsante la riporta nel registro, che è quel che chi
    // l'ha staccata vuole quasi sempre fare dopo.
    pulsante({
      testo: 'Riattacca',
      titolo: 'Riporta l’assistente nel riquadro del registro',
      simbolo: 'sinistra',
      variante: 'sottile',
      al: () => riattacca(),
    }),
  )
}

function finestra (): Figlio {
  return h(
    'div',
    { class: 'riquadro-assistente riquadro-assistente--sola' },
    testata(),
    corpoAssistente({ acceso, modello, dettatura }),
  )
}

collegaRidisegno(disegna)

ascolta((messaggio) => {
  if (messaggio.tipo !== 'assistente.stato') return
  acceso = messaggio.acceso
  modello = messaggio.modello
  dettatura = messaggio.dettatura
  // La conversazione che il riquadro ha consegnato: arriva una volta sola, nel
  // primo messaggio dopo lo spostamento. `metti` ridisegna da sé.
  //
  // Una prova sola per tutti e tre i campi, com'è nel riquadro. Erano due rami,
  // e il secondo — la mezza domanda senza conversazione, chi stacca **prima**
  // di aver chiesto — si perdeva `giro` per strada: oggi quella combinazione
  // non si raggiunge, e si sarebbe aperta da sé alla prima variante, con una
  // rotella che gira su un filo che nessuno ha ripreso.
  if (messaggio.storia || messaggio.bozza || messaggio.giro) {
    metti(messaggio.storia ?? [], messaggio.bozza ?? '', messaggio.giro)
  } else disegna()
})

// «Sono in piedi»: l'host risponde con lo stato. Si dice qui e non dall'host di
// sua iniziativa perché prima di questa riga la pagina non ha ancora installato
// l'ascoltatore qui sopra, e il messaggio andrebbe a vuoto.
manda({ pronto: true })
disegna()

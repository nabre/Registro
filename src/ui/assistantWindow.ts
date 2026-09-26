// L'assistente staccato: una finestra con dentro una conversazione. È
// un'applicazione a sé: il codice del registro non entra (solo `bridge.ts`,
// `dom.ts` e la conversazione). Non riceve il `Registro`: sa solo se
// l'assistente è acceso e quale modello risponde, così una finestra lasciata
// aperta non porta addosso i dati di nessuno.

// Per prima: la lingua della pagina, prima che qualunque altro modulo si carichi.
import '../i18n/page.js'
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
import { testi } from './assistant.testi.js'

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
    // Fuoco e scorrimento non stanno da nessuna parte: si salvano e si rimettono.
    const fuoco = ricordaFuoco()
    const scorrimenti = ricordaScorrimenti()
    rimpiazza(radice, finestra())
    ripristinaFuoco(fuoco)
    ripristinaScorrimenti(scorrimenti)
  })
}

/**
 * Torna nel riquadro del registro con la conversazione. `prendi()` la lascia
 * qui vuota: la finestra sta per chiudersi.
 */
function riattacca (): void {
  const { storia, bozza, giro } = prendi()
  // `giro` se il modello sta ancora rispondendo: il filo vive nell'host, e il
  // riquadro lo riprende da lì.
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
      h('strong', null, testi().assistente),
    ),
    h(
      'span',
      { class: 'riquadro-assistente__nota' },
      // «Non scrive» e non «sola lettura», come nel riquadro: apre le pagine
      // (`vista.apri`) ma non tocca i dati.
      acceso ? testi().nonScrive(modello) : testi().spento,
    ),
    conversazioneInCorso()
      ? pulsante({
          titolo: testi().dimentica,
          simbolo: 'cestino',
          variante: 'fantasma',
          al: () => svuota(),
        })
      : null,
    // «Riattacca» e non «Chiudi»: la crocetta porterebbe via la conversazione con
    // la pagina, questo la riporta nel registro.
    pulsante({
      testo: testi().riattacca,
      titolo: testi().riattaccaTitolo,
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
  // La conversazione consegnata dal riquadro, nel primo messaggio dopo lo
  // spostamento; una prova sola per i tre campi, come nel riquadro. `metti`
  // ridisegna da sé.
  if (messaggio.storia || messaggio.bozza || messaggio.giro) {
    metti(messaggio.storia ?? [], messaggio.bozza ?? '', messaggio.giro)
  } else disegna()
})

// «Sono in piedi», detto da qui: prima di questa riga l'ascoltatore non c'è, e
// un messaggio dell'host andrebbe a vuoto.
manda({ pronto: true })
disegna()

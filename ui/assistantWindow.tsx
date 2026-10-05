// L'assistente staccato: una finestra con dentro una conversazione. È
// un'applicazione a sé: il codice del registro non entra (solo `bridge.ts`,
// `focus.ts` e la conversazione). Non riceve il `Registro`: sa solo se
// l'assistente è acceso e quale modello risponde, così una finestra lasciata
// aperta non porta addosso i dati di nessuno. Il disegno è di React (ADR-56),
// con una radice sua disegnata come quella del pannello (`main.tsx`).

// Per prima: la lingua della pagina, prima che qualunque altro modulo si carichi.
import '#core/i18n/page.js'
import './styles-assistant.css'

import { Component, type ReactElement, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import {
  collegaRidisegno,
  conversazioneInCorso,
  corpoAssistente,
  metti,
  prendi,
  svuota,
} from './assistant/chat.js'
import { Pulsante } from './components/base.js'
import { Icona } from './components/icons.js'
import {
  ricordaFuoco,
  ricordaScorrimenti,
  ripristinaFuoco,
  ripristinaScorrimenti,
} from './focus.js'
import { ascolta, manda } from './bridge.js'
import { testi } from './assistant.testi.js'

const radice = document.getElementById('radice')
const radiceReact = radice ? createRoot(radice) : null

/** Le due cose che questa finestra sa del registro. Fino al primo messaggio, niente. */
let acceso = false
let modello = ''
/** Se il microfono si può accendere: lo dice l'host, come tutto il resto. */
let dettatura = false

/** Evita di ridisegnare tre volte quando arrivano tre messaggi di fila. */
let disegnoProgrammato = false

/** Quel che il disegno nuovo deve ritrovare: fuoco e scorrimenti del disegno di prima. */
interface Foto {
  fuoco: ReturnType<typeof ricordaFuoco>
  scorrimenti: ReturnType<typeof ricordaScorrimenti>
}

/**
 * Fuoco e scorrimento non stanno da nessuna parte: si fotografano a disegno
 * fatto e prima che tocchi il documento, e si rimettono dopo (vedi `main.tsx`).
 * Il filo è lo stesso nodo da un disegno all'altro: lo scorrimento e il fondo
 * restano.
 */
class Fotografo extends Component<{ children: ReactNode }> {
  override getSnapshotBeforeUpdate (): Foto {
    return { fuoco: ricordaFuoco(), scorrimenti: ricordaScorrimenti() }
  }

  override componentDidUpdate (_prima: unknown, _statoPrima: unknown, foto: Foto): void {
    ripristinaFuoco(foto.fuoco)
    ripristinaScorrimenti(foto.scorrimenti)
  }

  override render (): ReactNode {
    return this.props.children
  }
}

function disegna (): void {
  if (!radiceReact || disegnoProgrammato) return
  disegnoProgrammato = true
  requestAnimationFrame(() => {
    disegnoProgrammato = false
    // Tutto e subito, come nel pannello.
    flushSync(() => radiceReact.render(<Fotografo><Finestra /></Fotografo>))
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

function testata (): ReactElement {
  return (
    <header className="riquadro-assistente__testa">
      <div className="riquadro-assistente__nome">
        <Icona nome="bot" classe="icona--minuta" />
        <strong>{testi().assistente}</strong>
      </div>
      <span className="riquadro-assistente__nota">
        {/* «Non scrive» e non «sola lettura», come nel riquadro: apre le pagine
            (`vista.apri`) ma non tocca i dati. */}
        {acceso ? testi().nonScrive(modello) : testi().spento}
      </span>
      {conversazioneInCorso()
        ? <Pulsante titolo={testi().dimentica} simbolo="cestino" variante="fantasma" al={() => svuota()} />
        : null}
      {/* «Riattacca» e non «Chiudi»: la crocetta porterebbe via la conversazione con
          la pagina, questo la riporta nel registro. */}
      <Pulsante
        testo={testi().riattacca}
        titolo={testi().riattaccaTitolo}
        simbolo="sinistra"
        variante="sottile"
        al={() => riattacca()}
      />
    </header>
  )
}

function Finestra (): ReactElement {
  return (
    <div className="riquadro-assistente riquadro-assistente--sola">
      {testata()}
      {corpoAssistente({ acceso, modello, dettatura })}
    </div>
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

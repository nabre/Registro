// Avvisi passeggeri in basso a destra, che se ne vanno da soli. Gli errori
// restano finché non li si scaccia: un salvataggio fallito non deve sparire
// mentre si guarda altrove. La pila vive fuori dal ridisegno, in una radice di
// React sua (ADR-56): `notifica` si chiama da una parte vecchia o da una nuova.

import type { ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import { parole } from '#core/dominio/words.testi.js'
import { classi } from '#ui/classNames.js'
import { Icona } from './icons.js'

type LivelloNotifica = 'info' | 'successo' | 'avviso' | 'errore'

const DURATE: Record<LivelloNotifica, number> = {
  info: 3200,
  successo: 2400,
  avviso: 5000,
  errore: 0,
}

const SIMBOLI = {
  info: 'informazione',
  successo: 'spunta',
  avviso: 'avviso',
  errore: 'avviso',
} as const

/** Quanto dura l'uscita prima di togliere la notifica (l'animazione di `notifica--in-uscita`). */
const USCITA = 180

/** Un gesto accanto al testo, prima della crocetta: lo si fa e la notifica se ne va. */
interface AzioneNotifica {
  testo: string
  aiuto?: string
  al: () => unknown
}

interface OpzioniNotifica {
  azione?: AzioneNotifica
  /** Quanto resta, al posto di quel che vuole il livello; 0 = finché la si scaccia. */
  durata?: number
}

/** Una notifica in pila. */
interface Voce {
  id: number
  testo: string
  livello: LivelloNotifica
  azione?: AzioneNotifica
  /** Quante volte è arrivato lo stesso errore. */
  volte: number
  /** Se ne sta andando: resta il tempo dell'animazione. */
  uscita: boolean
  congeda: () => void
}

/** Le notifiche in vista, dalla più vecchia: l'ordine della pila. */
let voci: Voce[] = []
let contatore = 0
let radice: Root | null = null

/**
 * Quanti errori restano in vista al massimo: un host che non risponde ne
 * produce uno a tentativo. Oltre, se ne va il più vecchio.
 */
const TETTO_ERRORI = 4

/**
 * Gli errori in vista, per testo, dal più vecchio: lo stesso errore ripetuto
 * non si impila, torna in fondo con il conto («×3»).
 */
const erroriInVista = new Map<string, Voce>()

/** Ridisegna la pila; il contenitore nasce alla prima notifica. */
function disegna (): void {
  if (!radice) {
    const contenitore = document.createElement('div')
    contenitore.className = 'pila-notifiche'
    contenitore.setAttribute('role', 'log')
    contenitore.setAttribute('aria-live', 'polite')
    document.body.appendChild(contenitore)
    radice = createRoot(contenitore)
  }
  radice.render(<Pila voci={voci} />)
}

function Pila ({ voci }: { voci: readonly Voce[] }): ReactElement {
  return <>{voci.map((voce) => <Notifica key={voce.id} voce={voce} />)}</>
}

function Notifica ({ voce }: { voce: Voce }): ReactElement {
  const { azione } = voce
  return (
    <div
      className={classi('notifica', `notifica--${voce.livello}`, voce.uscita && 'notifica--in-uscita')} // testo-fisso: classe CSS
      // Un errore interrompe il lettore di schermo; un «salvato» aspetta la pausa.
      role={voce.livello === 'errore' ? 'alert' : 'status'}
      aria-live={voce.livello === 'errore' ? 'assertive' : 'polite'}
    >
      <Icona nome={SIMBOLI[voce.livello]} />
      <span className="notifica__testo">
        {voce.testo}
        {voce.volte > 1 ? <>{' '}<span className="notifica__volte">{`×${voce.volte}`}</span></> : null}
      </span>
      {azione
        ? (
            <button
              className="pulsante pulsante--sottile notifica__azione"
              type="button"
              title={azione.aiuto}
              onClick={() => {
                voce.congeda()
                void azione.al()
              }}
            >
              {azione.testo}
            </button>
          )
        : null}
      <button className="notifica__chiudi" type="button" aria-label={parole().chiudi} onClick={voce.congeda}>
        <Icona nome="chiudi" />
      </button>
    </div>
  )
}

export function notifica (
  testo: string,
  livello: LivelloNotifica = 'info',
  opzioni: OpzioniNotifica = {},
): void {
  const gia = livello === 'errore' ? erroriInVista.get(testo) : undefined
  if (gia) {
    // In fondo alla pila, e in fondo all'elenco: è di nuovo il più recente.
    const ripetuto = { ...gia, volte: gia.volte + 1 }
    erroriInVista.delete(testo)
    erroriInVista.set(testo, ripetuto)
    voci = [...voci.filter((voce) => voce.id !== gia.id), ripetuto]
    disegna()
    return
  }

  contatore += 1
  const id = contatore
  let via = false
  const congeda = () => {
    if (via) return
    via = true
    if (erroriInVista.get(testo)?.id === id) erroriInVista.delete(testo)
    voci = voci.map((voce) => voce.id === id ? { ...voce, uscita: true } : voce)
    disegna()
    setTimeout(() => {
      voci = voci.filter((voce) => voce.id !== id)
      disegna()
    }, USCITA)
  }
  const voce: Voce = {
    id, testo, livello, azione: opzioni.azione, volte: 1, uscita: false, congeda,
  }

  voci = [...voci, voce]
  if (livello === 'errore') {
    erroriInVista.set(testo, voce)
    for (const [, vecchio] of erroriInVista) {
      if (erroriInVista.size <= TETTO_ERRORI) break
      vecchio.congeda()
    }
  }
  disegna()
  const durata = opzioni.durata ?? DURATE[livello]
  if (durata > 0) setTimeout(congeda, durata)
}

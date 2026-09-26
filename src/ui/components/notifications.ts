// Avvisi passeggeri in basso a destra, che se ne vanno da soli. Gli errori
// restano finché non li si scaccia: un salvataggio fallito non deve sparire
// mentre si guarda altrove.

import { h } from '../dom.js'
import { icona } from './icons.js'
import { parole } from '../../domain/words.testi.js'

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

let contenitore: HTMLElement | null = null

/**
 * Quanti errori restano in vista al massimo: un host che non risponde ne
 * produce uno a tentativo. Oltre, se ne va il più vecchio.
 */
const TETTO_ERRORI = 4

/**
 * Gli errori in vista, per testo, dal più vecchio: lo stesso errore ripetuto
 * non si impila, torna in fondo con il conto («×3»).
 */
const erroriInVista = new Map<string, { voce: HTMLElement, volte: number, congeda: () => void }>()

function pila (): HTMLElement {
  if (!contenitore) {
    contenitore = h('div', { class: 'pila-notifiche', attr: { role: 'log', 'aria-live': 'polite' } })
    document.body.appendChild(contenitore)
  }
  return contenitore
}

export function notifica (testo: string, livello: LivelloNotifica = 'info'): void {
  const gia = livello === 'errore' ? erroriInVista.get(testo) : undefined
  if (gia) {
    gia.volte += 1
    let volte = gia.voce.querySelector('.notifica__volte')
    if (!volte) {
      volte = h('span', { class: 'notifica__volte' })
      gia.voce.querySelector('.notifica__testo')?.append(' ', volte)
    }
    volte.textContent = `×${gia.volte}`
    // In fondo alla pila, e in fondo all'elenco: è di nuovo il più recente.
    erroriInVista.delete(testo)
    erroriInVista.set(testo, gia)
    pila().appendChild(gia.voce)
    return
  }

  const voce = h(
    'div',
    {
      class: ['notifica', `notifica--${livello}`], // testo-fisso: classe CSS
      // Un errore interrompe il lettore di schermo; un «salvato» aspetta la pausa.
      attr: {
        role: livello === 'errore' ? 'alert' : 'status',
        'aria-live': livello === 'errore' ? 'assertive' : 'polite',
      },
    },
    icona(SIMBOLI[livello]),
    h('span', { class: 'notifica__testo' }, testo),
    h(
      'button',
      { class: 'notifica__chiudi', type: 'button', attr: { 'aria-label': parole().chiudi } },
      icona('chiudi'),
    ),
  )

  const congeda = () => {
    if (erroriInVista.get(testo)?.voce === voce) erroriInVista.delete(testo)
    voce.classList.add('notifica--in-uscita')
    setTimeout(() => voce.remove(), 180)
  }
  voce.querySelector('.notifica__chiudi')?.addEventListener('click', congeda)

  pila().appendChild(voce)
  if (livello === 'errore') {
    erroriInVista.set(testo, { voce, volte: 1, congeda })
    for (const [, vecchio] of erroriInVista) {
      if (erroriInVista.size <= TETTO_ERRORI) break
      vecchio.congeda()
    }
  }
  const durata = DURATE[livello]
  if (durata > 0) setTimeout(congeda, durata)
}

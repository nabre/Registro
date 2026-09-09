// Avvisi passeggeri in basso a destra.
//
// Le notifiche di sistema interrompono e vanno chiuse a mano: per un «voto
// salvato» sono di troppo. Qui l'avviso compare accanto a dove è successa la
// cosa e se ne va da solo. Gli errori invece restano finché non li si scaccia:
// un salvataggio non riuscito non deve sparire mentre si guarda altrove.

import { h } from '../dom.js'
import { icona } from './icone.js'

export type LivelloNotifica = 'info' | 'successo' | 'avviso' | 'errore'

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

function pila (): HTMLElement {
  if (!contenitore) {
    contenitore = h('div', { class: 'pila-notifiche', attr: { role: 'log', 'aria-live': 'polite' } })
    document.body.appendChild(contenitore)
  }
  return contenitore
}

export function notifica (testo: string, livello: LivelloNotifica = 'info'): void {
  const voce = h(
    'div',
    {
      class: ['notifica', `notifica--${livello}`],
      // Un errore non aspetta la prossima pausa nel parlato di chi legge lo
      // schermo — la pila attorno resta «polite» — ma un «salvato» va detto
      // senza interrompere quel che si stava facendo.
      attr: {
        role: livello === 'errore' ? 'alert' : 'status',
        'aria-live': livello === 'errore' ? 'assertive' : 'polite',
      },
    },
    icona(SIMBOLI[livello]),
    h('span', { class: 'notifica__testo' }, testo),
    h(
      'button',
      { class: 'notifica__chiudi', type: 'button', attr: { 'aria-label': 'Chiudi' } },
      icona('chiudi'),
    ),
  )

  const congeda = () => {
    voce.classList.add('notifica--in-uscita')
    setTimeout(() => voce.remove(), 180)
  }
  voce.querySelector('.notifica__chiudi')?.addEventListener('click', congeda)

  pila().appendChild(voce)
  const durata = DURATE[livello]
  if (durata > 0) setTimeout(congeda, durata)
}

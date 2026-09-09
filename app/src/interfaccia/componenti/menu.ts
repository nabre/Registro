// Il menu del tasto destro.
//
// Nel calendario un blocco è piccolo e le cose da farci sopra sono otto: aprire,
// modificare, segnare svolta, annullare, duplicare, esportare, eliminare.
// Metterle tutte dentro il blocco è impossibile, e costringere ad aprire la
// lezione per ognuna è il giro lungo — quel che si vuole, guardando la
// settimana, è agire lì dove si sta guardando.
//
// Il menu vive fuori dal ciclo di ridisegno, come le finestre modali: nasce al
// clic, sta dove l'ha chiamato il puntatore e se ne va al primo gesto che non
// lo riguarda. Un aggiornamento dello stato che arriva mentre è aperto non lo
// tocca — e comunque quasi tutte le sue voci lo chiudono per prime.

import { h, type Figlio } from '../dom.js'
import { icona, type NomeIcona } from './icone.js'

export interface VoceMenu {
  testo: string
  simbolo?: NomeIcona
  al: () => void
  /** Rossa: è quella da cui non si torna indietro. */
  pericolo?: boolean
  disabilitato?: boolean
}

/** Una riga di menu, o la linea che separa due gruppi di righe. */
export type ElementoMenu = VoceMenu | 'separatore'

/** Quanto stare lontani dal bordo della finestra quando il menu ci sbatte contro. */
const MARGINE = 8

let apertoOra: (() => void) | null = null

/**
 * Apre il menu dove sta il puntatore.
 *
 * Le voci ricevono già il loro gesto: il menu non sa che cosa fanno, si chiude
 * e le lascia lavorare. Chiudere prima di eseguire non è un dettaglio — una
 * voce che apre una finestra di conferma lascerebbe altrimenti due strati
 * sovrapposti, e il secondo ruberebbe il tasto Escape al primo.
 */
export function menuContestuale (evento: MouseEvent, elementi: ElementoMenu[]): void {
  evento.preventDefault()
  evento.stopPropagation()
  apertoOra?.()

  const voci = elementi.filter((e): e is VoceMenu => e !== 'separatore')
  if (voci.length === 0) return

  const menu = h('div', { class: 'menu', attr: { role: 'menu' } })

  let chiuso = false
  const chiudi = () => {
    if (chiuso) return
    chiuso = true
    apertoOra = null
    menu.remove()
    document.removeEventListener('pointerdown', allaPressione, true)
    document.removeEventListener('keydown', allaTastiera, true)
    window.removeEventListener('resize', chiudi)
    window.removeEventListener('blur', chiudi)
    document.removeEventListener('scroll', chiudi, true)
  }

  const allaPressione = (e: PointerEvent) => {
    if (!menu.contains(e.target as Node | null)) chiudi()
  }
  const allaTastiera = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return
    e.stopPropagation()
    e.preventDefault()
    chiudi()
  }

  for (const elemento of elementi) {
    if (elemento === 'separatore') {
      // Un separatore in cima o in fondo non separa niente: si salta, così chi
      // costruisce il menu può metterli senza contare le voci che ha escluso.
      if (menu.lastElementChild && !menu.lastElementChild.classList.contains('menu__linea')) {
        menu.appendChild(h('div', { class: 'menu__linea' }))
      }
      continue
    }

    menu.appendChild(
      h(
        'button',
        {
          class: ['menu__voce', elemento.pericolo && 'menu__voce--pericolo'],
          type: 'button',
          disabled: Boolean(elemento.disabilitato),
          attr: { role: 'menuitem' },
          onclick: () => {
            chiudi()
            elemento.al()
          },
        },
        elemento.simbolo ? icona(elemento.simbolo) : h('span', { class: 'menu__vuoto' }),
        h('span', null, elemento.testo as Figlio),
      ),
    )
  }

  // L'ultima riga non separa più niente da niente.
  if (menu.lastElementChild?.classList.contains('menu__linea')) menu.lastElementChild.remove()

  document.body.appendChild(menu)

  // Prima si misura, poi si sposta: contro il bordo destro il menu si apre a
  // sinistra del puntatore, contro quello basso verso l'alto — che è quel che
  // fa ogni menu di sistema, e nessuno se ne accorge finché non manca.
  const larghezza = menu.offsetWidth
  const altezza = menu.offsetHeight
  const x = Math.min(evento.clientX, window.innerWidth - larghezza - MARGINE)
  const y = Math.min(evento.clientY, window.innerHeight - altezza - MARGINE)
  menu.style.left = `${Math.max(MARGINE, x)}px`
  menu.style.top = `${Math.max(MARGINE, y)}px`

  menu.querySelector<HTMLButtonElement>('.menu__voce:not([disabled])')?.focus()

  apertoOra = chiudi
  document.addEventListener('pointerdown', allaPressione, true)
  document.addEventListener('keydown', allaTastiera, true)
  window.addEventListener('resize', chiudi)
  window.addEventListener('blur', chiudi)
  // In cattura: il calendario scorre dentro un suo contenitore, non nella
  // pagina, e un menu che resta appeso all'aria mentre il contenuto scivola via
  // è peggio di nessun menu.
  document.addEventListener('scroll', chiudi, true)
}

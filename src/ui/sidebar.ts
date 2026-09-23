// Navigazione persistente sul desktop, apribile a richiesta nelle finestre strette.
import { assistenteAperto } from './assistant.js'
import { h, type Figlio } from './dom.js'
import { icona } from './components/icons.js'
import { gruppiDiPagine, vaiA } from './pages.js'
import { aggiorna, stato } from './state.js'

const stretta = window.matchMedia('(max-width: 64em)')
stretta.addEventListener('change', () => aggiorna({}))

/**
 * Quando la navigazione la tiene stretta il telaio, e non chi lavora.
 *
 * Su finestra stretta con l'assistente aperto le colonne sono già due — la
 * striscia delle icone e il lavoro — e il riquadro copre il resto: sta scritto
 * in `styles/assistant.css`, ed è la scelta giusta perché tre colonne su uno
 * schermo così non lascerebbero al calendario una settimana intera.
 *
 * Qui quella scelta diventa una sola: in quello stato la navigazione **è**
 * minimizzata, e il gesto per espanderla non ha dove espanderla. Senza questa
 * riga premerlo toglieva la classe `sidebar--compatta` senza allargare la
 * colonna, e i titoli delle pagine finivano tagliati dentro tre rem e mezzo.
 *
 * Quel che si era scelto prima non si perde: `sidebarDesktop` e `sidebarMobile`
 * restano come sono, e la navigazione torna aperta appena il riquadro si chiude
 * o la finestra si allarga.
 */
function sidebarCostretta (): boolean {
  return stretta.matches && assistenteAperto()
}

export function sidebarAperta (): boolean {
  if (sidebarCostretta()) return false
  return stretta.matches ? stato.sidebarMobile : stato.sidebarDesktop
}

function imposta (aperta: boolean, restituisciFuoco = false): void {
  aggiorna(stretta.matches ? { sidebarMobile: aperta } : { sidebarDesktop: aperta })
  if (restituisciFuoco) requestAnimationFrame(() => {
    document.querySelector<HTMLElement>('[data-fuoco="apri-navigazione"]')?.focus()
  })
}

export function interruttoreSidebar (): Figlio {
  // Come l'interruttore delle azioni in `barraComandi`: c'è solo se c'è
  // qualcosa da aprire o da chiudere. Dove la navigazione sta minimizzata per
  // forza, un pulsante che promette di espanderla è una promessa falsa.
  if (sidebarCostretta()) return null
  return h('button', {
    type: 'button', class: 'barra-comandi__tendina',
    dataset: { fuoco: 'apri-navigazione' },
    attr: {
      'aria-label': sidebarAperta() ? 'Riduci navigazione' : 'Espandi navigazione',
      title: sidebarAperta() ? 'Riduci navigazione' : 'Espandi navigazione',
      'aria-expanded': String(sidebarAperta()), 'aria-controls': 'navigazione-laterale',
    },
    onclick: () => imposta(!sidebarAperta()),
  }, icona('sidebar'))
}

export function sidebar (): HTMLElement {
  return h('aside', {
    id: 'navigazione-laterale', class: ['sidebar', !sidebarAperta() && 'sidebar--compatta'],
    // Resta nello stesso punto quando la vista si ridisegna: la navigazione non
    // cambia, e riportarla in cima farebbe perdere il segno a chi la stava
    // scorrendo. Vedi `ricordaScorrimenti` in `dom.ts`.
    dataset: { scorrimento: 'sidebar' },
    onkeydown: (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.preventDefault()
        imposta(false, true)
      }
    },
  },
  h('div', { class: 'sidebar__marchio' }, icona('libro'),
    h('div', null, h('strong', null, 'Registro'), h('small', null, 'Spazio docente'))),
  h('nav', { class: 'sidebar__pagine', attr: { 'aria-label': 'Navigazione principale' } },
    ...gruppiDiPagine().map((gruppo) => h('section', { class: 'sidebar__gruppo' },
      h('h2', { class: 'sidebar__titolo' }, gruppo.nome),
      ...gruppo.pagine.map((pagina) => h('button', {
        type: 'button', class: 'sidebar__pagina', dataset: { fuoco: pagina.id },
        attr: {
          'aria-label': pagina.titolo,
          'aria-current': pagina.attiva() ? 'page' : null,
          'aria-disabled': String(Boolean(pagina.impedimento?.())),
          title: [pagina.titolo, pagina.impedimento?.() ?? pagina.aiuto].filter(Boolean).join(' — '),
        },
        onclick: () => {
          vaiA(pagina)
          if (stretta.matches && sidebarAperta() && !pagina.impedimento?.()) imposta(false, true)
        },
        // Il conto in coda, quando c'è qualcosa da contare. Zero non si scrive:
        // una pastiglia vuota va letta per scoprire che non dice niente.
      }, icona(pagina.simbolo, 'icona--minuta'), h('span', null, pagina.titolo),
      (pagina.conto?.() ?? 0) > 0
        ? h('span', { class: 'sidebar__conto' }, String(pagina.conto?.()))
        : null)),
    )),
  ),
  )
}

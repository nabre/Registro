// Navigazione persistente sul desktop, apribile a richiesta nelle finestre strette.
import { assistenteAperto } from './assistant.js'
import { h, type Figlio } from './dom.js'
import { icona } from './components/icons.js'
import { gruppiDiPagine, vaiA, type Pagina } from './pages.js'
import { aggiorna, stato } from './state.js'
import { testi } from './sidebar.testi.js'

const stretta = window.matchMedia('(max-width: 64em)')
stretta.addEventListener('change', () => aggiorna({}))

/**
 * Se la navigazione è ridotta per forza: su finestra stretta con l'assistente
 * aperto (`styles/assistant.css`) non c'è spazio per allargarla. Le scelte
 * `sidebarDesktop`/`sidebarMobile` restano, e tornano quando c'è posto.
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

function interruttoreSidebar (): Figlio {
  // C'è solo se c'è qualcosa da aprire o chiudere. Il nome resta «Navigazione»
  // in tutti e due gli stati e lo stato lo dice `aria-expanded`; il gesto lo
  // dicono il suggerimento e l'icona.
  if (sidebarCostretta()) return null
  const aperta = sidebarAperta()
  const t = testi()
  return h('button', {
    type: 'button', class: ['barra-comandi__tendina', 'sidebar__interruttore'],
    dataset: { fuoco: 'apri-navigazione' },
    attr: {
      'aria-label': t.navigazione,
      title: aperta ? t.riduci : t.espandi,
      'aria-expanded': String(aperta), 'aria-controls': 'navigazione-laterale',
    },
    onclick: () => imposta(!sidebarAperta()),
    // Ridotta, il pulsante porta il quaderno del registro in cima alla striscia
    // delle icone; aperta, la freccia per ridurla.
  }, icona(aperta ? 'sidebarRiduci' : 'libro', aperta ? '' : 'sidebar__segno'))
}

/**
 * Il suggerimento di una voce: il nome, perché non si può o a che cosa serve,
 * e in coda la scorciatoia come in `commandBar.ts`. Il numero è la posizione
 * fra le voci visibili, la regola di Ctrl+1…9 in `shortcuts.ts`.
 */
function suggerimentoDi (pagina: Pagina): string {
  const posto = gruppiDiPagine().flatMap((gruppo) => gruppo.pagine).indexOf(pagina)
  const tasto = posto >= 0 && posto < 9 ? `(${testi().scorciatoia(posto + 1)})` : null
  const spiegazione = [pagina.impedimento?.() ?? pagina.aiuto, tasto].filter(Boolean).join(' ')
  return spiegazione ? `${pagina.titolo} — ${spiegazione}` : pagina.titolo
}

export function sidebar (): HTMLElement {
  const t = testi()
  return h('aside', {
    id: 'navigazione-laterale', class: ['sidebar', !sidebarAperta() && 'sidebar--compatta'],
    // Lo scorrimento resta al ridisegno (`ricordaScorrimenti` in `dom.ts`).
    dataset: { scorrimento: 'sidebar' },
    onkeydown: (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.preventDefault()
        imposta(false, true)
      }
    },
  },
  // L'intestazione resta ferma in cima e porta l'interruttore: lo si cerca sulla navigazione.
  h('div', { class: 'sidebar__marchio' }, icona('libro', 'sidebar__logo'),
    h('div', null, h('strong', null, t.registro), h('small', null, t.spazioDocente)),
    interruttoreSidebar()),
  h('nav', { class: 'sidebar__pagine', attr: { 'aria-label': t.principale } },
    // La classe del gruppo manda «sistema» (Impostazioni, Guida) in fondo alla
    // colonna (`sidebar.css`).
    ...gruppiDiPagine().map((gruppo) => h('section', { class: ['sidebar__gruppo', `sidebar__gruppo--${gruppo.gruppo}`] },
      // Il titolo lungo («Registro — DIC4a · Matematica») dice di quale corso sono
      // le pagine; se non ci sta si accorcia, intero nel suggerimento.
      h('h2', { class: 'sidebar__titolo', attr: { title: gruppo.titolo } }, gruppo.titolo),
      ...gruppo.pagine.map((pagina) => h('button', {
        type: 'button', class: 'sidebar__pagina', dataset: { fuoco: pagina.id },
        attr: {
          'aria-label': pagina.titolo,
          'aria-current': pagina.attiva() ? 'page' : null,
          'aria-disabled': String(Boolean(pagina.impedimento?.())),
          title: suggerimentoDi(pagina),
        },
        onclick: () => {
          vaiA(pagina)
          if (stretta.matches && sidebarAperta() && !pagina.impedimento?.()) imposta(false, true)
        },
        // Il conto in coda, solo se maggiore di zero.
      }, icona(pagina.simbolo, 'icona--minuta'), h('span', null, pagina.titolo),
      (pagina.conto?.() ?? 0) > 0
        ? h('span', { class: 'sidebar__conto' }, String(pagina.conto?.()))
        : null)),
    )),
  ),
  )
}

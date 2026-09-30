// Navigazione persistente sul desktop, apribile a richiesta nelle finestre strette.
import { assistenteAperto } from './assistant.js'
import { h, type Figlio } from './dom.js'
import { icona } from './components/icons.js'
import { alternaMenuSotto, type ElementoMenu } from './components/menu.js'
import { classeDelFascicolo, corsoDelContesto, scegliClasseDelFascicolo, scegliCorso } from './context.js'
import { gruppiDiPagine, vaiA, type GruppoDiPagine, type Pagina } from './pages.js'
import {
  aggiorna,
  classiDiCuiSonoDocente,
  corsiDellAnnoAperto,
  nomeClasse,
  nomeMateria,
  ridisegna,
  stato,
  vai,
} from './state.js'
import type { Posto } from './place.js'
import { testi } from './sidebar.testi.js'

const stretta = window.matchMedia('(max-width: 64em)')
// La larghezza della finestra non sta nello stato: cambiandola si ridisegna a mano.
stretta.addEventListener('change', () => ridisegna())

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

/**
 * Il titolo di un gruppo che sceglie di che cosa sono le pagine (il corso del
 * Registro, la classe del docente di classe): una tendina del programma, non
 * un `select`, con la voce in uso spuntata.
 */
function titoloCheSceglie (
  righe: string[],
  azione: string,
  fuoco: string,
  voci: () => ElementoMenu[],
): HTMLElement {
  return h(
    'button',
    {
      type: 'button',
      class: 'sidebar__titolo-scelta',
      dataset: { fuoco },
      attr: { 'aria-haspopup': 'menu', 'aria-label': `${azione}: ${righe.join(' · ')}` },
      onclick: (evento: MouseEvent) => {
        alternaMenuSotto(evento.currentTarget as HTMLElement, voci())
      },
    },
    h('span', { class: 'sidebar__titolo-righe' },
      ...righe.map((riga) => h('span', { class: 'sidebar__titolo-riga' }, riga))),
    icona('giu', 'sidebar__titolo-freccia'),
  )
}

/**
 * Le classi con il fascicolo: quelle di cui si è docente di classe. Da una
 * pagina del gruppo la pagina resta e mostra la classe nuova; da fuori si apre
 * la prima pagina del gruppo, già sulla classe: `scegliClasseDelFascicolo`
 * appenderebbe la classe a una pagina che non è sua.
 */
function vociDelleClassi (gruppo: GruppoDiPagine): ElementoMenu[] {
  const attuale = classeDelFascicolo()?.id
  return classiDiCuiSonoDocente().map((classe) => ({
    testo: classe.nome,
    simbolo: 'classi' as const,
    accesa: classe.id === attuale,
    al: () => {
      if (gruppo.attivo) {
        scegliClasseDelFascicolo(classe.id)
        return
      }
      entraNelGruppo(gruppo, { tipo: 'classe', id: classe.id },
        { classeId: classe.id, filtroClasseId: classe.id })
    },
  }))
}

/**
 * Apre la prima pagina del gruppo sul soggetto scelto, contesto compreso: un
 * passo solo, una voce sola nella storia.
 */
function entraNelGruppo (
  gruppo: GruppoDiPagine,
  soggetto: NonNullable<Posto['soggetto']>,
  contesto: NonNullable<Parameters<typeof vai>[1]>['contesto'],
): void {
  const pagina = gruppo.pagine[0]
  if (!pagina) return
  vai({ pagina: pagina.id, soggetto }, { contesto })
  chiudiSidebarMobile()
}

/**
 * I corsi dell'anno per il menu del titolo: un titoletto per classe, le
 * materie sotto. Da una pagina del Registro `scegliCorso` la sposta sul corso;
 * da fuori si apre la prima pagina del Registro sul corso scelto (restando
 * dov'è, una pagina di classe tornerebbe alle Classi).
 */
function vociDeiCorsi (gruppo: GruppoDiPagine): ElementoMenu[] {
  const attuale = corsoDelContesto()?.id
  const perClasse = new Map<string, ElementoMenu[]>()
  for (const corso of corsiDellAnnoAperto()) {
    const classe = nomeClasse(corso.classeId)
    const voci = perClasse.get(classe) ?? []
    voci.push({
      testo: nomeMateria(corso.materiaId) || corso.titolo,
      simbolo: 'libro',
      accesa: corso.id === attuale,
      al: () => {
        if (gruppo.attivo) {
          scegliCorso(corso.id)
          return
        }
        entraNelGruppo(gruppo, { tipo: 'corso', id: corso.id },
          { corsoId: corso.id, filtroClasseId: corso.classeId, classeId: corso.classeId })
      },
    })
    perClasse.set(classe, voci)
  }
  return [...perClasse].flatMap(([classe, voci]) => [{ titolo: classe }, ...voci])
}

/** Chiude il cassetto stretto senza cambiare la scelta della sidebar desktop. */
export function chiudiSidebarMobile (restituisciFuoco = true): boolean {
  if (!stretta.matches || !stato.sidebarMobile) return false
  imposta(false, restituisciFuoco)
  return true
}

/** Velo del cassetto: separato dalla navigazione, così copre anche la pagina. */
export function sfondoSidebar (): Figlio {
  if (!stretta.matches || !sidebarAperta()) return null
  return h('div', {
    class: 'sidebar__sfondo',
    attr: { 'aria-hidden': 'true' },
    onclick: () => chiudiSidebarMobile(),
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
    dataset: { scorrimento: 'sidebar', telaio: 'sidebar' },
    onkeydown: (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.preventDefault()
        chiudiSidebarMobile()
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
      // Il titolo lungo («Registro — DIC4a», a capo «Matematica») dice di quale
      // corso sono le pagine; una riga che non ci sta si accorcia, intera nel suggerimento.
      h('h2', { class: 'sidebar__titolo', attr: { title: gruppo.titolo } },
        gruppo.gruppo === 'registro' && corsiDellAnnoAperto().length > 1
          // testo-fisso: chiave di fuoco
          ? titoloCheSceglie(gruppo.righe, testi().cambiaCorso, 'sidebar-corso', () => vociDeiCorsi(gruppo))
          : gruppo.gruppo === 'classe' && classiDiCuiSonoDocente().length > 1
            // testo-fisso: chiave di fuoco
            ? titoloCheSceglie(gruppo.righe, testi().cambiaClasse, 'sidebar-classe', () => vociDelleClassi(gruppo))
            : gruppo.righe.map((riga) => h('span', { class: 'sidebar__titolo-riga' }, riga))),
      ...gruppo.pagine.map((pagina) => {
        const conto = pagina.conto?.() ?? 0
        return h('button', {
          type: 'button', class: 'sidebar__pagina', dataset: { fuoco: pagina.id },
          attr: {
            'aria-label': pagina.titolo,
            'aria-current': pagina.attiva() ? 'page' : null,
            'aria-disabled': String(Boolean(pagina.impedimento?.())),
            title: suggerimentoDi(pagina),
          },
          onclick: () => {
            vaiA(pagina)
            if (!pagina.impedimento?.()) chiudiSidebarMobile()
          },
          // Il conto in coda, solo se maggiore di zero.
        }, icona(pagina.simbolo, 'icona--minuta'), h('span', null, pagina.titolo),
        conto > 0
          ? h('span', { class: 'sidebar__conto' }, String(conto))
          : null)
      }),
    )),
  ),
  )
}

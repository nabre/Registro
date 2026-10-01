// La scelta di progetto e fase per un'attività del piano: un pulsante a forma
// di pastiglia che dice la scelta di adesso («Nessun progetto», o «Giornale ›
// Fase 2»), e al clic un elenco dei progetti del corso con le loro fasi. Un
// progetto con una fase sola si sceglie direttamente. Con più di sei voci
// compare la ricerca; frecce, Invio ed Esc come in ogni elenco. Vive fuori dal
// ridisegno, come i menu: nasce al clic e se ne va al primo gesto fuori.

import { formattaData } from '#core/dominio/dates.js'
import { Uno } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import type { FaseProgetto, Progetto } from '#core/dominio/models.js'
import {
  faseDellAttivita,
  periodoDellaFase,
  progettiDelCorso,
  type Periodo,
} from '#core/dominio/projects.js'
import { minuscolo } from '#core/i18n/index.js'
import { h, rifocalizza } from '#ui/pannello/dom.js'
import { stato } from '#ui/pannello/state.js'
import { dentroIBordi } from './hint.js'
import { icona } from './icons.js'
import { testi } from './projectPhasePicker.testi.js'

/** Quel che l'attività dice: di quale progetto, in quale fase. */
export interface ProgettoEFase {
  progettoId: string | null
  faseProgettoId: string | null
}

interface OpzioniScelta {
  corsoId: string | null
  valore: ProgettoEFase
  al: (scelta: ProgettoEFase) => void
  /** Crea una fase nuova nel progetto e torna la scelta che la nomina. */
  nuovaFase?: (progetto: Progetto) => void
  /** Apre la finestra di un progetto nuovo. */
  nuovoProgetto?: () => void
}

/** La fase in cui cade davvero un'attività: la sua, se il progetto ce l'ha, se no la prima. */
function faseEffettiva (
  progetto: Progetto,
  faseId: string | null | undefined,
): FaseProgetto | null {
  return faseDellAttivita(progetto, { progettoId: progetto.id, faseProgettoId: faseId })
}

/** La scelta detta in una riga: «Giornale › Fase 2», o solo il progetto se ha una fase sola. */
export function sceltaDetta (valore: ProgettoEFase): string | null {
  if (!valore.progettoId) return null
  const progetto = stato.registro.progetti.find((p) => p.id === valore.progettoId)
  if (!progetto) return null
  const fase = faseEffettiva(progetto, valore.faseProgettoId)
  return progetto.fasi.length > 1 && fase ? `${progetto.titolo} › ${fase.titolo}` : progetto.titolo
}

/** Per ogni fase: quante attività dei piani ci cadono, e il periodo delle loro ore. */
interface ContoDellaFase {
  attivita: number
  periodo: Periodo | null
}

function contiDelleFasi (progetto: Progetto): Map<string, ContoDellaFase> {
  const tappe = stato.registro.piani.flatMap((p) => p.attivita)
  return new Map(progetto.fasi.map((fase) => [fase.id, {
    attivita: tappe.filter((a) => faseDellAttivita(progetto, a)?.id === fase.id).length,
    periodo: periodoDellaFase(stato.registro, progetto, fase.id),
  }]))
}

/** Una riga dell'elenco: una scelta, un titolo di gruppo, o un gesto in coda. */
type Riga =
  | { tipo: 'gruppo', testo: string }
  | { tipo: 'scelta', testo: string, descrizione?: string, valore: ProgettoEFase, rientro: boolean, cerca: string }
  | { tipo: 'gesto', testo: string, al: () => void }

function righe (opzioni: OpzioniScelta): Riga[] {
  const t = testi()
  const progetti = opzioni.corsoId ? progettiDelCorso(stato.registro, opzioni.corsoId) : []
  const elenco: Riga[] = [{
    tipo: 'scelta',
    testo: t.nessunProgetto,
    valore: { progettoId: null, faseProgettoId: null },
    rientro: false,
    cerca: '',
  }]
  const descrizione = (conto: ContoDellaFase | undefined): string => {
    if (!conto) return ''
    const { periodo } = conto
    const quando = periodo
      ? periodo.inizio === periodo.fine
        ? formattaData(periodo.inizio)
        : `${formattaData(periodo.inizio)}–${formattaData(periodo.fine)}`
      : ''
    return [quando, t.attivita(conto.attivita)].filter(Boolean).join(' · ')
  }
  for (const progetto of progetti) {
    const conti = contiDelleFasi(progetto)
    if (progetto.fasi.length <= 1) {
      const fase = progetto.fasi[0] ?? null
      elenco.push({
        tipo: 'scelta',
        testo: progetto.titolo,
        descrizione: descrizione(fase ? conti.get(fase.id) : undefined),
        valore: { progettoId: progetto.id, faseProgettoId: fase?.id ?? null },
        rientro: false,
        cerca: minuscolo(progetto.titolo),
      })
      continue
    }
    elenco.push({ tipo: 'gruppo', testo: progetto.titolo })
    for (const fase of progetto.fasi) {
      elenco.push({
        tipo: 'scelta',
        testo: fase.titolo,
        descrizione: descrizione(conti.get(fase.id)),
        valore: { progettoId: progetto.id, faseProgettoId: fase.id },
        rientro: true,
        cerca: minuscolo(`${progetto.titolo} ${fase.titolo}`),
      })
    }
  }
  const scelto = progetti.find((p) => p.id === opzioni.valore.progettoId)
  const { nuovaFase, nuovoProgetto } = opzioni
  if (scelto && nuovaFase) elenco.push({ tipo: 'gesto', testo: t.nuovaFaseIn(scelto.titolo), al: () => nuovaFase(scelto) })
  if (nuovoProgetto) elenco.push({ tipo: 'gesto', testo: t.nuovoProgetto, al: nuovoProgetto })
  return elenco
}

function stessa (a: ProgettoEFase, b: ProgettoEFase): boolean {
  if (a.progettoId !== b.progettoId) return false
  if (!a.progettoId) return true
  const progetto = stato.registro.progetti.find((p) => p.id === a.progettoId)
  if (!progetto) return a.faseProgettoId === b.faseProgettoId
  const fase = (scelta: ProgettoEFase) => faseEffettiva(progetto, scelta.faseProgettoId)?.id
  return fase(a) === fase(b)
}

let chiudiAperto: (() => void) | null = null
let contatore = 0

/** Apre l'elenco sotto il pulsante. */
function apri (bottone: HTMLElement, opzioni: OpzioniScelta): void {
  chiudiAperto?.()
  const t = testi()
  const tutte = righe(opzioni)
  const conRicerca = tutte.filter((r) => r.tipo !== 'gruppo').length > 6
  const id = `scelta-fase-${++contatore}` // testo-fisso: id dell'elenco
  let filtro = ''
  let attiva = -1

  const elenco = h('ul', {
    class: 'scelta-fase__elenco',
    id,
    attr: { role: 'listbox', 'aria-label': t.etichetta },
  })
  const ricerca = conRicerca
    ? h('input', {
        class: 'campo__controllo scelta-fase__cerca',
        type: 'search',
        placeholder: t.cerca,
        attr: { 'aria-label': t.cerca, 'aria-controls': id, role: 'combobox', 'aria-expanded': 'true' },
        oninput: (evento: Event) => {
          filtro = minuscolo((evento.target as HTMLInputElement).value.trim())
          attiva = -1
          disegna()
        },
      })
    : null
  const scatola = h(
    'div',
    { class: 'menu scelta-fase', attr: { role: 'dialog', 'aria-label': t.etichetta } },
    ricerca,
    elenco,
  )

  /** Le righe che si vedono col filtro; i gruppi restano se hanno almeno una scelta. */
  const visibili = (): Riga[] => {
    if (!filtro) return tutte
    const fuori = tutte.filter((r) =>
      r.tipo === 'gesto' || (r.tipo === 'scelta' && (r.cerca === '' || r.cerca.includes(filtro))))
    return tutte.filter((r, i) => {
      if (r.tipo !== 'gruppo') return fuori.includes(r)
      const dopo = tutte.slice(i + 1)
      const fine = dopo.findIndex((x) => x.tipo !== 'scelta' || !x.rientro)
      return (fine < 0 ? dopo : dopo.slice(0, fine)).some((x) => fuori.includes(x))
    })
  }
  let premibili: Array<{ riga: Riga, nodo: HTMLElement }> = []

  const scegli = (riga: Riga): void => {
    chiudi()
    rifocalizza(bottone)
    if (riga.tipo === 'scelta') opzioni.al(riga.valore)
    if (riga.tipo === 'gesto') riga.al()
  }

  const accendi = (indice: number): void => {
    if (premibili.length === 0) return
    attiva = (indice + premibili.length) % premibili.length
    premibili.forEach(({ nodo }, i) => nodo.classList.toggle('scelta-fase__voce--attiva', i === attiva))
    const nodo = premibili[attiva].nodo
    nodo.scrollIntoView({ block: 'nearest' })
    ;(ricerca ?? elenco).setAttribute('aria-activedescendant', nodo.id)
    if (!ricerca) nodo.focus()
  }

  const disegna = (): void => {
    elenco.replaceChildren()
    premibili = []
    for (const riga of visibili()) {
      if (riga.tipo === 'gruppo') {
        elenco.appendChild(h('li', { class: 'menu__titolo', attr: { role: 'presentation' } }, icona('progetto'), riga.testo))
        continue
      }
      const scelta = riga.tipo === 'scelta' && stessa(riga.valore, opzioni.valore)
      const nodo = h(
        'li',
        {
          class: [
            'menu__voce',
            'scelta-fase__voce',
            scelta && 'menu__voce--accesa',
            riga.tipo === 'scelta' && riga.rientro && 'menu__voce--rientrata',
          ],
          id: `${id}-${premibili.length}`,
          attr: {
            role: 'option',
            'aria-selected': String(scelta),
            tabindex: -1,
          },
          onclick: () => scegli(riga),
        },
        riga.tipo === 'gesto' ? icona('piu') : scelta ? icona('spunta') : h('span', { class: 'menu__vuoto' }),
        h(
          'span',
          { class: 'menu__testo' },
          riga.testo,
          riga.tipo === 'scelta' && riga.descrizione
            ? h('small', { class: 'menu__descrizione' }, riga.descrizione)
            : null,
        ),
      )
      premibili.push({ riga, nodo })
      elenco.appendChild(nodo)
    }
    if (premibili.length === 0) elenco.appendChild(h('li', { class: 'testo-quieto', attr: { role: 'presentation' } }, t.niente))
  }

  const ascolto = new AbortController()
  const chiudi = (): void => {
    ascolto.abort()
    scatola.remove()
    bottone.setAttribute('aria-expanded', 'false')
    chiudiAperto = null
  }
  const allaTastiera = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopImmediatePropagation()
      chiudi()
      rifocalizza(bottone)
      return
    }
    if (e.key === 'Tab') {
      chiudi()
      return
    }
    const passo = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
    if (passo !== 0) {
      e.preventDefault()
      e.stopImmediatePropagation()
      accendi(attiva < 0 && passo < 0 ? premibili.length - 1 : attiva + passo)
      return
    }
    if (e.key === 'Home' && !ricerca) { e.preventDefault(); accendi(0); return }
    if (e.key === 'End' && !ricerca) { e.preventDefault(); accendi(premibili.length - 1); return }
    if (e.key === 'Enter' && attiva >= 0) {
      e.preventDefault()
      e.stopImmediatePropagation()
      scegli(premibili[attiva].riga)
    }
  }

  disegna()
  document.body.appendChild(scatola)
  const bordo = bottone.getBoundingClientRect()
  scatola.style.left = `${dentroIBordi(bordo.left, scatola.offsetWidth, window.innerWidth)}px` // testo-fisso: misura CSS
  scatola.style.top = `${dentroIBordi(bordo.bottom + 4, scatola.offsetHeight, window.innerHeight)}px` // testo-fisso: misura CSS
  bottone.setAttribute('aria-expanded', 'true')
  chiudiAperto = chiudi

  document.addEventListener('keydown', allaTastiera, { capture: true, signal: ascolto.signal })
  document.addEventListener('pointerdown', (e) => {
    const dove = e.target as Node | null
    if (scatola.contains(dove) || bottone.contains(dove)) return
    chiudi()
  }, { capture: true, signal: ascolto.signal })
  window.addEventListener('resize', chiudi, { signal: ascolto.signal })
  window.addEventListener('blur', chiudi, { signal: ascolto.signal })

  if (ricerca) ricerca.focus()
  else accendi(Math.max(0, premibili.findIndex(({ riga }) => riga.tipo === 'scelta' && stessa(riga.valore, opzioni.valore))))
}

/**
 * Il pulsante della scelta: dice progetto e fase di adesso, e apre l'elenco.
 * Senza progetti nel corso (e senza scelta) dice dove crearli.
 */
export function sceltaProgettoFase (opzioni: OpzioniScelta): HTMLButtonElement {
  const t = testi()
  const detta = sceltaDetta(opzioni.valore)
  return h(
    'button',
    {
      class: ['scelta-progetto', detta && 'scelta-progetto--scelta'],
      type: 'button',
      attr: {
        'aria-haspopup': 'listbox',
        'aria-expanded': 'false',
        'aria-label': `${Uno(lessico().progetto)}: ${detta ?? t.nessunProgetto}`,
      },
      onclick: (evento: MouseEvent) => {
        const bottone = evento.currentTarget as HTMLButtonElement
        if (bottone.getAttribute('aria-expanded') === 'true') {
          chiudiAperto?.()
          return
        }
        apri(bottone, opzioni)
      },
    },
    icona('progetto'),
    h('span', null, detta ?? t.nessunProgetto),
    icona('giu'),
  )
}

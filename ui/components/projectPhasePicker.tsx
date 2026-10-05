// La scelta di progetto e fase per un'attività del piano, in React (ADR-56):
// un pulsante a forma di pastiglia che dice la scelta di adesso («Nessun
// progetto», o «Giornale › Fase 2»), e al clic un elenco dei progetti dell'anno con le loro fasi: prima
// quelli integrati nel corso, poi gli altri, che la tappa integrerà. Un progetto
// con una fase sola si sceglie direttamente. Con più di sei voci compare la
// ricerca; frecce, Invio ed Esc come in ogni elenco. L'elenco vive fuori dal
// ridisegno, come i menu, in una radice sua: nasce al clic e se ne va al primo
// gesto fuori.

import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import { formattaData } from '#core/dominio/dates.js'
import { Uno } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import type { FaseProgetto, Progetto } from '#core/dominio/models.js'
import {
  faseDellAttivita,
  nelCorso,
  periodoDellaFase,
  type Periodo,
} from '#core/dominio/projects.js'
import { minuscolo } from '#core/i18n/index.js'
import { classi } from '#ui/classNames.js'
import { rifocalizza } from '#ui/focus.js'
import { progettiPerIlCorso, stato } from '#ui/state.js'
import { testi } from '#ui/components/projectPhasePicker.testi.js'
import { dentroIBordi } from './hint.js'
import { Icona } from './icons.js'

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

/** Per ogni fase: quante attività dei piani del corso ci cadono, e il periodo delle loro ore. */
interface ContoDellaFase {
  attivita: number
  periodo: Periodo | null
}

function contiDelleFasi (progetto: Progetto, corsoId: string | null): Map<string, ContoDellaFase> {
  const tappe = stato.registro.piani.filter((p) => p.corsoId === corsoId).flatMap((p) => p.attivita)
  const visto = nelCorso(progetto, corsoId)
  return new Map(progetto.fasi.map((fase) => [fase.id, {
    attivita: tappe.filter((a) => faseDellAttivita(progetto, a)?.id === fase.id).length,
    periodo: visto ? periodoDellaFase(stato.registro, visto, fase.id) : null,
  }]))
}

/** Una riga dell'elenco: una scelta, un titolo di gruppo, o un gesto in coda. */
type Riga =
  | { tipo: 'gruppo', testo: string }
  | { tipo: 'scelta', testo: string, descrizione?: string, valore: ProgettoEFase, rientro: boolean, cerca: string }
  | { tipo: 'gesto', testo: string, al: () => void }

function righe (opzioni: OpzioniScelta): Riga[] {
  const t = testi()
  const progetti = progettiPerIlCorso(opzioni.corsoId)
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
    const conti = contiDelleFasi(progetto, opzioni.corsoId)
    // Quelli non ancora integrati lo dicono: sceglierli li porta nel corso.
    const fuori = opzioni.corsoId !== null && !nelCorso(progetto, opzioni.corsoId)
    if (progetto.fasi.length <= 1) {
      const fase = progetto.fasi[0] ?? null
      elenco.push({
        tipo: 'scelta',
        testo: progetto.titolo,
        descrizione: fuori ? t.nonNelCorso : descrizione(fase ? conti.get(fase.id) : undefined),
        valore: { progettoId: progetto.id, faseProgettoId: fase?.id ?? null },
        rientro: false,
        cerca: minuscolo(progetto.titolo),
      })
      continue
    }
    elenco.push({ tipo: 'gruppo', testo: fuori ? `${progetto.titolo} · ${t.nonNelCorso}` : progetto.titolo })
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

/** Le righe che si vedono col filtro; i gruppi restano se hanno almeno una scelta. */
function visibili (tutte: Riga[], filtro: string): Riga[] {
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

let chiudiAperto: (() => void) | null = null
let contatore = 0

/** L'elenco aperto: ricerca, righe, tastiera. */
function Elenco ({ opzioni, id, scegli, chiudi, segnale }: {
  opzioni: OpzioniScelta
  id: string
  scegli: (riga: Riga) => void
  /** Chiude e ridà il fuoco al pulsante (Esc), o lo lascia andare (Tab). */
  chiudi: (rifocalizzando: boolean) => void
  segnale: AbortSignal
}): ReactElement {
  const t = testi()
  const [tutte] = useState(() => righe(opzioni))
  const conRicerca = tutte.filter((r) => r.tipo !== 'gruppo').length > 6
  const [filtro, impostaFiltro] = useState('')
  const premibili = visibili(tutte, filtro).filter((r) => r.tipo !== 'gruppo')
  const [attiva, impostaAttiva] = useState(() => conRicerca
    ? -1
    : Math.max(0, premibili.findIndex((riga) => riga.tipo === 'scelta' && stessa(riga.valore, opzioni.valore))))
  const elenco = useRef<HTMLUListElement | null>(null)
  const ricerca = useRef<HTMLInputElement | null>(null)

  const accendi = (indice: number) => {
    if (premibili.length === 0) return
    impostaAttiva((indice + premibili.length) % premibili.length)
  }

  // La riga accesa si porta in vista; senza ricerca prende anche il fuoco.
  useLayoutEffect(() => {
    if (attiva < 0) return
    const nodo = elenco.current?.querySelector<HTMLElement>(`#${CSS.escape(`${id}-${attiva}`)}`)
    if (!nodo) return
    nodo.scrollIntoView({ block: 'nearest' })
    if (!conRicerca) nodo.focus()
  }, [attiva, id, conRicerca])

  // Le letture della tastiera, sempre quelle dell'ultimo disegno.
  const ultimo = useRef({ premibili, attiva, accendi })
  useLayoutEffect(() => {
    ultimo.current = { premibili, attiva, accendi }
  })

  useLayoutEffect(() => {
    const allaTastiera = (e: KeyboardEvent): void => {
      const { premibili, attiva, accendi } = ultimo.current
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopImmediatePropagation()
        chiudi(true)
        return
      }
      if (e.key === 'Tab') {
        chiudi(false)
        return
      }
      const passo = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
      if (passo !== 0) {
        e.preventDefault()
        e.stopImmediatePropagation()
        accendi(attiva < 0 && passo < 0 ? premibili.length - 1 : attiva + passo)
        return
      }
      if (e.key === 'Home' && !conRicerca) { e.preventDefault(); accendi(0); return }
      if (e.key === 'End' && !conRicerca) { e.preventDefault(); accendi(premibili.length - 1); return }
      if (e.key === 'Enter' && attiva >= 0) {
        e.preventDefault()
        e.stopImmediatePropagation()
        const riga = premibili[attiva]
        if (riga) scegli(riga)
      }
    }
    document.addEventListener('keydown', allaTastiera, { capture: true, signal: segnale })
    return () => document.removeEventListener('keydown', allaTastiera, { capture: true })
  }, [chiudi, scegli, segnale, conRicerca])

  useLayoutEffect(() => {
    ricerca.current?.focus()
  }, [])

  const attivaId = attiva >= 0 && premibili[attiva] ? `${id}-${attiva}` : undefined
  let posto = 0
  return (
    <>
      {conRicerca
        ? (
            <input
              ref={ricerca}
              className="campo__controllo scelta-fase__cerca"
              type="search"
              placeholder={t.cerca}
              aria-label={t.cerca}
              aria-controls={id}
              role="combobox"
              aria-expanded="true"
              aria-activedescendant={attivaId}
              onInput={(evento) => {
                impostaFiltro(minuscolo(evento.currentTarget.value.trim()))
                impostaAttiva(-1)
              }}
            />
          )
        : null}
      <ul
        ref={elenco}
        className="scelta-fase__elenco"
        id={id}
        role="listbox"
        aria-label={t.etichetta}
        aria-activedescendant={conRicerca ? undefined : attivaId}
      >
        {visibili(tutte, filtro).map((riga) => {
          if (riga.tipo === 'gruppo') {
            return (
              <li key={`g${tutte.indexOf(riga)}`} className="menu__titolo" role="presentation">
                <Icona nome="progetto" />
                {riga.testo}
              </li>
            )
          }
          const mio = posto++
          const scelta = riga.tipo === 'scelta' && stessa(riga.valore, opzioni.valore)
          return (
            <li
              key={`v${tutte.indexOf(riga)}`}
              className={classi(
                'menu__voce',
                'scelta-fase__voce',
                scelta && 'menu__voce--accesa',
                riga.tipo === 'scelta' && riga.rientro && 'menu__voce--rientrata',
                mio === attiva && 'scelta-fase__voce--attiva',
              )}
              id={`${id}-${mio}`}
              role="option"
              aria-selected={String(scelta) as 'true' | 'false'}
              tabIndex={-1}
              onClick={() => scegli(riga)}
            >
              {riga.tipo === 'gesto'
                ? <Icona nome="piu" />
                : scelta ? <Icona nome="spunta" /> : <span className="menu__vuoto" />}
              <span className="menu__testo">
                {riga.testo}
                {riga.tipo === 'scelta' && riga.descrizione
                  ? <small className="menu__descrizione">{riga.descrizione}</small>
                  : null}
              </span>
            </li>
          )
        })}
        {premibili.length === 0 ? <li className="testo-quieto" role="presentation">{t.niente}</li> : null}
      </ul>
    </>
  )
}

/** Apre l'elenco sotto il pulsante; `chiusa` avvisa il pulsante quando se ne va. */
function apri (bottone: HTMLElement, opzioni: OpzioniScelta, chiusa: () => void): void {
  chiudiAperto?.()
  const t = testi()
  const id = `scelta-fase-${++contatore}` // testo-fisso: id dell'elenco

  const scatola = document.createElement('div')
  scatola.className = 'menu scelta-fase'
  scatola.setAttribute('role', 'dialog')
  scatola.setAttribute('aria-label', t.etichetta)
  const radice = createRoot(scatola)

  const ascolto = new AbortController()
  const chiudi = (): void => {
    if (chiudiAperto !== chiudi) return
    ascolto.abort()
    // Dopo il giro in corso: si chiude anche da dentro un gestore di React.
    queueMicrotask(() => radice.unmount())
    scatola.remove()
    bottone.setAttribute('aria-expanded', 'false')
    chiudiAperto = null
    chiusa()
  }

  const scegli = (riga: Riga): void => {
    chiudi()
    rifocalizza(bottone)
    if (riga.tipo === 'scelta') opzioni.al(riga.valore)
    if (riga.tipo === 'gesto') riga.al()
  }

  chiudiAperto = chiudi
  document.body.appendChild(scatola)
  flushSync(() => radice.render(
    <Elenco
      opzioni={opzioni}
      id={id}
      scegli={scegli}
      chiudi={(rifocalizzando) => {
        chiudi()
        if (rifocalizzando) rifocalizza(bottone)
      }}
      segnale={ascolto.signal}
    />,
  ))
  const bordo = bottone.getBoundingClientRect()
  scatola.style.left = `${dentroIBordi(bordo.left, scatola.offsetWidth, window.innerWidth)}px` // testo-fisso: misura CSS
  scatola.style.top = `${dentroIBordi(bordo.bottom + 4, scatola.offsetHeight, window.innerHeight)}px` // testo-fisso: misura CSS
  bottone.setAttribute('aria-expanded', 'true')

  document.addEventListener('pointerdown', (e) => {
    const dove = e.target as Node | null
    if (scatola.contains(dove) || bottone.contains(dove)) return
    chiudi()
  }, { capture: true, signal: ascolto.signal })
  window.addEventListener('resize', chiudi, { signal: ascolto.signal })
  window.addEventListener('blur', chiudi, { signal: ascolto.signal })
}

/**
 * Il pulsante della scelta: dice progetto e fase di adesso, e apre l'elenco.
 * Senza progetti nel corso (e senza scelta) dice dove crearli.
 */
export function SceltaProgettoFase (opzioni: OpzioniScelta): ReactElement {
  const t = testi()
  const [aperta, impostaAperta] = useState(false)
  const detta = sceltaDetta(opzioni.valore)
  return (
    <button
      className={classi('scelta-progetto', detta && 'scelta-progetto--scelta')}
      type="button"
      aria-haspopup="listbox"
      aria-expanded={aperta}
      aria-label={`${Uno(lessico().progetto)}: ${detta ?? t.nessunProgetto}`}
      onClick={(evento) => {
        if (aperta) {
          chiudiAperto?.()
          return
        }
        impostaAperta(true)
        apri(evento.currentTarget, opzioni, () => impostaAperta(false))
      }}
    >
      <Icona nome="progetto" />
      <span>{detta ?? t.nessunProgetto}</span>
      <Icona nome="giu" />
    </button>
  )
}

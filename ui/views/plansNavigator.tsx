// Il navigatore dei piani: l'unica strada fra le ore del corso nella pagina dei
// piani. Le frecce passano all'ora prima e a quella dopo; al centro l'ora di
// adesso, che apre l'elenco di tutte le ore del corso per semestre, ciascuna
// col suo stato e l'argomento del piano, e in fondo i piani che nessuna ora usa
// (bozze, e quelli rimasti senza corso). L'elenco vive fuori dal ridisegno,
// come i menu (`components/projectPhasePicker.tsx`), in una radice sua:
// nasce al clic e se ne va al primo gesto fuori.
//
// Da tastiera, fuori dai campi, Alt+↑ e Alt+↓ fanno le frecce: li legge
// `shortcuts.ts` dal segno `data-tasto-alt`. Alt+← e Alt+→ restano del cammino
// fra le pagine visitate, che passa anche da qui.

import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import {
  confrontaLezioni,
  durataPiano,
  minutiDiAttivita,
  minutiDiScarto,
} from '#core/dominio/calculations.js'
import { lezioniDellAnno, numeriDelleLezioni } from '#core/dominio/courses.js'
import {
  formattaData,
  formattaDurata,
  nomeSemestre,
} from '#core/dominio/dates.js'
import { quanti } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import type { Corso, Lezione, PianoLezione } from '#core/dominio/models.js'
import { corrispondeAlla, pezziDiRicerca } from '#core/dominio/text.js'
import { classi } from '#ui/classNames.js'
import { Pulsante } from '#ui/components/base.js'
import { dentroIBordi } from '#ui/components/hint.js'
import { Icona, type NomeIcona } from '#ui/components/icons.js'
import { DataDiLezione } from '#ui/components/lessonDate.js'
import { rifocalizza } from '#ui/focus.js'
import { annoCorrente, lezioneDiPiano, pianoPerId, stato } from '#ui/state.js'
import { testi } from './plansNavigator.testi.js'

/** A che punto è un'ora, per chi la prepara. */
type StatoOra =
  | { tipo: 'annullata' }
  | { tipo: 'senza-piano' }
  | { tipo: 'preparata', piano: PianoLezione }
  | { tipo: 'da-calibrare', piano: PianoLezione, scarto: number }

function statoDellOra (lezione: Lezione): StatoOra {
  if (lezione.stato === 'annullata') return { tipo: 'annullata' }
  const piano = pianoPerId(lezione.pianoId)
  if (!piano) return { tipo: 'senza-piano' }
  const scarto = minutiDiScarto(piano, lezione, stato.registro.impostazioni.minutiUd)
  return scarto === 0 ? { tipo: 'preparata', piano } : { tipo: 'da-calibrare', piano, scarto }
}

/** Il piano da aprire per un'ora: il suo, se c'è ancora. */
function pianoDellOra (lezione: Lezione): string | null {
  return pianoPerId(lezione.pianoId)?.id ?? null
}

/** Le ore del corso nell'anno aperto, nell'ordine del calendario. */
export function oreDelCorso (corso: Corso): Lezione[] {
  return lezioniDellAnno(stato.registro, annoCorrente()?.id ?? null)
    .filter((l) => l.corsoId === corso.id)
    .sort(confrontaLezioni)
}

/** I piani del corso che nessuna ora usa: preparati e non ancora messi. */
export function pianiSciolti (corso: Corso): PianoLezione[] {
  const usati = new Set(
    stato.registro.lezioni.map((l) => l.pianoId).filter((id): id is string => Boolean(id)),
  )
  return stato.registro.piani.filter((p) => p.corsoId === corso.id && !usati.has(p.id))
}

/**
 * I piani rimasti senza corso (corso eliminato: le riparazioni staccano il piano
 * invece di buttarlo). Stanno in fondo, dichiarati, da riagganciare o eliminare.
 */
export function pianiSenzaCorso (): PianoLezione[] {
  const corsi = new Set(stato.registro.corsi.map((c) => c.id))
  return stato.registro.piani.filter((p) => !p.corsoId || !corsi.has(p.corsoId))
}

/**
 * Di che cosa parla il piano: il primo obiettivo o la prima tappa. Non è il nome
 * (quello lo dà `lezioneDiPiano`) perché cambia mentre si prepara.
 */
function argomentoDiPiano (piano: PianoLezione): string {
  return (
    piano.obiettivi.find((o) => o.trim()) ??
    piano.attivita.find((a) => a.titolo.trim())?.titolo ??
    testi().scalettaVuota
  )
}

/** Il testo su cui la ricerca lavora per un piano: quel che di lui si ricorda. */
function testoDiPiano (piano: PianoLezione): string {
  return [
    lezioneDiPiano(piano),
    piano.prerequisiti,
    ...piano.tag,
    ...piano.obiettivi,
    ...piano.attivita.map((a) => a.titolo),
  ]
    .filter(Boolean)
    .join(' ')
}

/** «#3 · LUN 15.09.2026»: il numero manca alle annullate, che non contano. */
function oraDetta (lezione: Lezione, numero: number | null | undefined): string {
  const quando = formattaData(lezione.data, 'settimana')
  return numero ? `#${numero} · ${quando}` : quando
}

/** La stessa, da vedere: il giorno in maiuscoletto (`dataDiLezione`). */
function oraMostrata (lezione: Lezione, numero: number | null | undefined): ReactNode {
  return <>{numero ? `#${numero} · ` : null}<DataDiLezione iso={lezione.data} /></>
}

/** Lo stato in parole, e l'argomento del piano se c'è. */
function statoDetto (suo: StatoOra): string {
  const t = testi()
  switch (suo.tipo) {
    case 'annullata':
      return lessico().statiLezione.annullata
    case 'senza-piano':
      return t.senzaPiano
    case 'preparata':
      return `${t.preparata} · ${argomentoDiPiano(suo.piano)}`
    case 'da-calibrare': {
      const scarto = suo.scarto < 0
        ? t.scoperti(formattaDurata(-suo.scarto))
        : t.oltre(formattaDurata(suo.scarto))
      return `${scarto} · ${argomentoDiPiano(suo.piano)}`
    }
  }
}

const SEGNO_DELLO_STATO: Record<StatoOra['tipo'], NomeIcona | null> = {
  annullata: 'chiudi',
  'senza-piano': null,
  preparata: 'spunta',
  'da-calibrare': 'avviso',
}

/** Una riga dell'elenco: un titolo di gruppo, un'ora, o un piano senza ora. */
type Riga =
  | { tipo: 'gruppo', testo: string, conto: string | null, avviso: boolean }
  | {
    tipo: 'voce'
    testo: ReactNode
    descrizione: string
    segno: NomeIcona | null
    /** Il tipo di stato, per la tinta del segno. */
    tinta: StatoOra['tipo'] | 'piano'
    attiva: boolean
    cerca: string
    vai: () => void
  }

interface OpzioniNavigatore {
  corso: Corso
  /** L'ora che la pagina ha davanti; nulla se il piano aperto non sta su nessuna. */
  lezioneAttiva: Lezione | null
  pianoAttivo: PianoLezione | null
  /** Apre nella pagina un piano, o l'ora senza piano. */
  apri: (pianoId: string | null, lezione?: Lezione | null) => void
}

/** Le ore divise per semestre, con il conto delle preparate; poi i piani senza ora. */
function righe (opzioni: OpzioniNavigatore, ore: Lezione[]): Riga[] {
  const t = testi()
  const numeri = numeriDelleLezioni(stato.registro, ore)
  const anno = annoCorrente()
  const semestri = [...(anno?.semestri ?? [])].sort((a, b) => a.numero - b.numero)
  const gruppi = semestri.map((semestre) => ({
    etichetta: nomeSemestre(semestre),
    ore: ore.filter((l) => l.data >= semestre.inizio && l.data <= semestre.fine),
  }))
  const dentro = new Set(gruppi.flatMap((g) => g.ore.map((l) => l.id)))
  const fuori = ore.filter((l) => !dentro.has(l.id))
  if (fuori.length > 0) gruppi.push({ etichetta: t.fuoriSemestri, ore: fuori })

  const elenco: Riga[] = []
  for (const gruppo of gruppi) {
    if (gruppo.ore.length === 0) continue
    const stati = gruppo.ore.map((l) => ({ lezione: l, stato: statoDellOra(l) }))
    const valide = stati.filter((s) => s.stato.tipo !== 'annullata')
    elenco.push({
      tipo: 'gruppo',
      testo: gruppo.etichetta,
      conto: t.preparate(valide.filter((s) => s.stato.tipo === 'preparata').length, valide.length),
      avviso: false,
    })
    for (const { lezione, stato: suo } of stati) {
      const detta = oraDetta(lezione, numeri.get(lezione.id))
      const piano = 'piano' in suo ? suo.piano : null
      elenco.push({
        tipo: 'voce',
        testo: oraMostrata(lezione, numeri.get(lezione.id)),
        descrizione: statoDetto(suo),
        segno: SEGNO_DELLO_STATO[suo.tipo],
        tinta: suo.tipo,
        attiva: lezione.id === opzioni.lezioneAttiva?.id,
        cerca: [detta, formattaData(lezione.data, 'lungo'), piano ? testoDiPiano(piano) : ''].join(' '),
        vai: () => opzioni.apri(pianoDellOra(lezione), lezione),
      })
    }
  }

  const vocePiano = (piano: PianoLezione, descrizione: string): Riga => ({
    tipo: 'voce',
    testo: lezioneDiPiano(piano),
    descrizione,
    segno: 'piano',
    tinta: 'piano',
    attiva: !opzioni.lezioneAttiva && piano.id === opzioni.pianoAttivo?.id,
    cerca: testoDiPiano(piano),
    vai: () => opzioni.apri(piano.id),
  })
  const sciolti = pianiSciolti(opzioni.corso)
  const orfani = pianiSenzaCorso()
  const { minutiUd } = stato.registro.impostazioni
  if (sciolti.length + orfani.length > 0) {
    elenco.push({ tipo: 'gruppo', testo: t.nonAssegnati, conto: null, avviso: orfani.length > 0 })
    // Una bozza non ha un'ora, e si chiama con il giorno in cui è nata.
    for (const piano of sciolti) {
      elenco.push(vocePiano(
        piano,
        `${argomentoDiPiano(piano)} · ${quanti(piano.attivita.length, lessico().attivita)} · ` +
          formattaDurata(minutiDiAttivita(durataPiano(piano), minutiUd)),
      ))
    }
    for (const piano of orfani) {
      elenco.push(vocePiano(piano, t.corsoSparito(argomentoDiPiano(piano))))
    }
  }
  return elenco
}

let chiudiAperto: (() => void) | null = null
let contatore = 0

type Voce = Extract<Riga, { tipo: 'voce' }>

/** Le righe che si vedono col filtro; un gruppo resta se ha almeno una voce. */
function visibili (tutte: Riga[], filtro: string[]): Riga[] {
  if (filtro.length === 0) return tutte
  const passa = (r: Riga): boolean => r.tipo === 'voce' && corrispondeAlla(r.cerca, filtro)
  return tutte.filter((r, i) => {
    if (r.tipo === 'voce') return passa(r)
    const dopo = tutte.slice(i + 1)
    const fine = dopo.findIndex((x) => x.tipo === 'gruppo')
    return (fine < 0 ? dopo : dopo.slice(0, fine)).some(passa)
  })
}

/** L'elenco aperto: ricerca, righe, tastiera. */
function Elenco ({ tutte, id, scegli, chiudi, segnale }: {
  tutte: Riga[]
  id: string
  scegli: (riga: Voce) => void
  /** Chiude e ridà il fuoco al pulsante (Esc), o lo lascia andare (Tab). */
  chiudi: (rifocalizzando: boolean) => void
  segnale: AbortSignal
}): ReactElement {
  const t = testi()
  const conRicerca = tutte.filter((r) => r.tipo === 'voce').length > 6
  const [filtro, impostaFiltro] = useState<string[]>([])
  const righe = visibili(tutte, filtro)
  const premibili = righe.filter((r): r is Voce => r.tipo === 'voce')
  // L'ora di adesso accesa e in vista: si riparte da lì, non dalla prima. Con la
  // ricerca il fuoco resta nel campo: la riga accesa si legge da
  // `aria-activedescendant`, e la prima freccia riparte da lei.
  const [attiva, impostaAttiva] = useState(() =>
    premibili.length > 0 ? Math.max(0, premibili.findIndex((riga) => riga.attiva)) : -1)
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
              className="campo__controllo navigatore-ore__cerca"
              type="search"
              placeholder={t.cerca}
              aria-label={t.cerca}
              aria-controls={id}
              aria-autocomplete="list"
              role="combobox"
              aria-expanded="true"
              aria-activedescendant={attivaId}
              onInput={(evento) => {
                impostaFiltro(pezziDiRicerca(evento.currentTarget.value))
                impostaAttiva(-1)
              }}
            />
          )
        : null}
      <ul
        ref={elenco}
        className="navigatore-ore__elenco"
        id={id}
        role="listbox"
        aria-label={t.etichetta}
        aria-activedescendant={conRicerca ? undefined : attivaId}
      >
        {righe.map((riga) => {
          const chiave = tutte.indexOf(riga)
          if (riga.tipo === 'gruppo') {
            return (
              <li
                key={`g${chiave}`}
                className={classi('menu__titolo', 'navigatore-ore__gruppo', riga.avviso && 'navigatore-ore__gruppo--avviso')}
                role="presentation"
              >
                <span>{riga.testo}</span>
                {riga.conto ? <span className="navigatore-ore__conto">{riga.conto}</span> : null}
              </li>
            )
          }
          const mio = posto++
          return (
            <li
              key={`v${chiave}`}
              className={classi(
                'menu__voce',
                'navigatore-ore__voce',
                `navigatore-ore__voce--${riga.tinta}`,
                riga.attiva && 'menu__voce--accesa',
                mio === attiva && 'navigatore-ore__voce--attiva',
              )}
              id={`${id}-${mio}`}
              role="option"
              aria-selected={riga.attiva}
              tabIndex={-1}
              onClick={() => scegli(riga)}
            >
              {riga.segno ? <Icona nome={riga.segno} classe="navigatore-ore__segno" /> : <span className="menu__vuoto" />}
              <span className="menu__testo">
                {riga.testo}
                <small className="menu__descrizione">{riga.descrizione}</small>
              </span>
            </li>
          )
        })}
        {premibili.length === 0 ? <li className="testo-quieto" role="presentation">{t.niente}</li> : null}
      </ul>
    </>
  )
}

/** Apre l'elenco delle ore sotto il pulsante dell'ora di adesso; `chiusa` avvisa il pulsante. */
function apriElenco (bottone: HTMLElement, opzioni: OpzioniNavigatore, ore: Lezione[], chiusa: () => void): void {
  chiudiAperto?.()
  const t = testi()
  const tutte = righe(opzioni, ore)
  const id = `navigatore-ore-${++contatore}` // testo-fisso: id dell'elenco

  const scatola = document.createElement('div')
  scatola.className = 'menu navigatore-ore'
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

  const scegli = (riga: Voce): void => {
    chiudi()
    rifocalizza(bottone)
    riga.vai()
  }

  chiudiAperto = chiudi
  document.body.appendChild(scatola)
  flushSync(() => radice.render(
    <Elenco
      tutte={tutte}
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
  const sinistra = bordo.left + bordo.width / 2 - scatola.offsetWidth / 2
  scatola.style.left = `${dentroIBordi(sinistra, scatola.offsetWidth, window.innerWidth)}px` // testo-fisso: misura CSS
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
 * Il navigatore in testata: frecce ai lati, al centro l'ora di adesso che apre
 * l'elenco, e sotto quante ore sono preparate. Null se il corso non ha né ore
 * né piani da raggiungere.
 */
export function navigatorePiani (opzioni: OpzioniNavigatore): ReactElement | null {
  const ore = oreDelCorso(opzioni.corso)
  const sciolti = pianiSciolti(opzioni.corso).length + pianiSenzaCorso().length
  if (ore.length === 0 && sciolti === 0) return null
  return <NavigatorePiani opzioni={opzioni} ore={ore} />
}

function NavigatorePiani ({ opzioni, ore }: { opzioni: OpzioniNavigatore, ore: Lezione[] }): ReactElement {
  const t = testi()
  const [aperto, impostaAperto] = useState(false)

  const { lezioneAttiva, pianoAttivo } = opzioni
  const posizione = lezioneAttiva ? ore.findIndex((l) => l.id === lezioneAttiva.id) : -1
  const vaiA = (indice: number): void => {
    const bersaglio = ore[indice]
    if (!bersaglio) return
    opzioni.apri(pianoDellOra(bersaglio), bersaglio)
  }

  const numeri = numeriDelleLezioni(stato.registro, ore)
  const adesso = lezioneAttiva
    ? oraDetta(lezioneAttiva, numeri.get(lezioneAttiva.id))
    : pianoAttivo
      ? lezioneDiPiano(pianoAttivo)
      : t.nessunaOra
  const mostrata = lezioneAttiva
    ? oraMostrata(lezioneAttiva, numeri.get(lezioneAttiva.id))
    : pianoAttivo
      ? lezioneDiPiano(pianoAttivo)
      : t.nessunaOra
  const suo = lezioneAttiva ? statoDellOra(lezioneAttiva) : null
  const segno = suo ? SEGNO_DELLO_STATO[suo.tipo] : pianoAttivo ? 'piano' : null

  const valide = ore.map(statoDellOra).filter((s) => s.tipo !== 'annullata')
  const pronte = valide.filter((s) => s.tipo === 'preparata').length
  const daCalibrare = valide.filter((s) => s.tipo === 'da-calibrare').length

  // Le frecce: fuori dai campi le premono anche Alt+↑ e Alt+↓ (`shortcuts.ts`).
  const freccia = (verso: -1 | 1): ReactElement => {
    const indietro = verso < 0
    const tasto = indietro ? 'Alt+↑' : 'Alt+↓' // testo-fisso: nome dei tasti
    return (
      <Pulsante
        simbolo={indietro ? 'sinistra' : 'destra'}
        variante="sottile"
        classe="navigatore-piani__freccia"
        titolo={`${indietro ? t.precedente : t.successiva} (${tasto})`}
        // Senza un'ora davanti, «avanti» porta alla prima.
        disabilitato={indietro ? posizione <= 0 : posizione >= ore.length - 1}
        al={() => vaiA(posizione < 0 ? 0 : posizione + verso)}
        data-tasto-alt={indietro ? 'ArrowUp' : 'ArrowDown'} // testo-fisso: nome del tasto
        aria-keyshortcuts={indietro ? 'Alt+ArrowUp' : 'Alt+ArrowDown'} // testo-fisso: nome dei tasti
      />
    )
  }

  return (
    <div className="navigatore-piani" role="group" aria-label={t.etichetta}>
      <div className="navigatore-piani__passo">
        {freccia(-1)}
        <button
          className={classi('navigatore-piani__ora', suo && `navigatore-piani__ora--${suo.tipo}`)}
          type="button"
          data-fuoco="navigatore-piani" // testo-fisso: chiave del fuoco
          aria-haspopup="listbox"
          aria-expanded={aperto}
          aria-label={t.scegli(suo ? `${adesso}, ${statoDetto(suo)}` : adesso)}
          onClick={(evento) => {
            if (aperto) {
              chiudiAperto?.()
              return
            }
            impostaAperto(true)
            apriElenco(evento.currentTarget, opzioni, ore, () => impostaAperto(false))
          }}
        >
          {segno ? <Icona nome={segno} classe="navigatore-piani__segno" /> : null}
          <span className="navigatore-piani__data">{mostrata}</span>
          <Icona nome="giu" />
        </button>
        {freccia(1)}
      </div>
      {valide.length > 0
        ? (
            <span className="navigatore-piani__sintesi">
              {t.preparate(pronte, valide.length)}
              {daCalibrare > 0 ? ` · ${t.daCalibrare(daCalibrare)}` : ''}
            </span>
          )
        : null}
    </div>
  )
}

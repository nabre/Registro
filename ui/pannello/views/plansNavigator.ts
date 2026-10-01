// Il navigatore dei piani: l'unica strada fra le ore del corso nella pagina dei
// piani. Le frecce passano all'ora prima e a quella dopo; al centro l'ora di
// adesso, che apre l'elenco di tutte le ore del corso per semestre, ciascuna
// col suo stato e l'argomento del piano, e in fondo i piani che nessuna ora usa
// (bozze, e quelli rimasti senza corso). L'elenco vive fuori dal ridisegno,
// come i menu (`components/projectPhasePicker.ts`): nasce al clic e se ne va
// al primo gesto fuori.
//
// Da tastiera, fuori dai campi, Alt+↑ e Alt+↓ fanno le frecce: li legge
// `shortcuts.ts` dal segno `data-tasto-alt`. Alt+← e Alt+→ restano del cammino
// fra le pagine visitate, che passa anche da qui.

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
import { pulsante } from '#ui/pannello/components/base.js'
import { dentroIBordi } from '#ui/pannello/components/hint.js'
import { icona, type NomeIcona } from '#ui/pannello/components/icons.js'
import { dataDiLezione } from '#ui/pannello/components/lessonDate.js'
import { h, rifocalizza, type Figlio } from '#ui/pannello/dom.js'
import { annoCorrente, lezioneDiPiano, pianoPerId, stato } from '#ui/pannello/state.js'
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
function oraMostrata (lezione: Lezione, numero: number | null | undefined): Figlio {
  return [numero ? `#${numero} · ` : null, dataDiLezione(lezione.data)]
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
    testo: Figlio
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

/** Apre l'elenco delle ore sotto il pulsante dell'ora di adesso. */
function apriElenco (bottone: HTMLElement, opzioni: OpzioniNavigatore, ore: Lezione[]): void {
  chiudiAperto?.()
  const t = testi()
  const tutte = righe(opzioni, ore)
  const conRicerca = tutte.filter((r) => r.tipo === 'voce').length > 6
  const id = `navigatore-ore-${++contatore}` // testo-fisso: id dell'elenco
  let filtro: string[] = []
  let attiva = -1

  const elenco = h('ul', {
    class: 'navigatore-ore__elenco',
    id,
    attr: { role: 'listbox', 'aria-label': t.etichetta },
  })
  const ricerca = conRicerca
    ? h('input', {
        class: 'campo__controllo navigatore-ore__cerca',
        type: 'search',
        placeholder: t.cerca,
        attr: {
          'aria-label': t.cerca,
          'aria-controls': id,
          'aria-autocomplete': 'list',
          role: 'combobox',
          'aria-expanded': 'true',
        },
        oninput: (evento: Event) => {
          filtro = pezziDiRicerca((evento.target as HTMLInputElement).value)
          attiva = -1
          disegna()
        },
      })
    : null
  const scatola = h(
    'div',
    { class: 'menu navigatore-ore', attr: { role: 'dialog', 'aria-label': t.etichetta } },
    ricerca,
    elenco,
  )

  /** Le righe che si vedono col filtro; un gruppo resta se ha almeno una voce. */
  const visibili = (): Riga[] => {
    if (filtro.length === 0) return tutte
    const passa = (r: Riga): boolean => r.tipo === 'voce' && corrispondeAlla(r.cerca, filtro)
    return tutte.filter((r, i) => {
      if (r.tipo === 'voce') return passa(r)
      const dopo = tutte.slice(i + 1)
      const fine = dopo.findIndex((x) => x.tipo === 'gruppo')
      return (fine < 0 ? dopo : dopo.slice(0, fine)).some(passa)
    })
  }
  let premibili: Array<{ riga: Extract<Riga, { tipo: 'voce' }>, nodo: HTMLElement }> = []

  const scegli = (riga: Extract<Riga, { tipo: 'voce' }>): void => {
    chiudi()
    rifocalizza(bottone)
    riga.vai()
  }

  const accendi = (indice: number): void => {
    if (premibili.length === 0) return
    attiva = (indice + premibili.length) % premibili.length
    premibili.forEach(({ nodo }, i) => nodo.classList.toggle('navigatore-ore__voce--attiva', i === attiva))
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
        elenco.appendChild(h(
          'li',
          {
            class: ['menu__titolo', 'navigatore-ore__gruppo', riga.avviso && 'navigatore-ore__gruppo--avviso'],
            attr: { role: 'presentation' },
          },
          h('span', null, riga.testo),
          riga.conto ? h('span', { class: 'navigatore-ore__conto' }, riga.conto) : null,
        ))
        continue
      }
      const nodo = h(
        'li',
        {
          class: [
            'menu__voce',
            'navigatore-ore__voce',
            `navigatore-ore__voce--${riga.tinta}`,
            riga.attiva && 'menu__voce--accesa',
          ],
          id: `${id}-${premibili.length}`,
          attr: { role: 'option', 'aria-selected': String(riga.attiva), tabindex: -1 },
          onclick: () => scegli(riga),
        },
        riga.segno ? icona(riga.segno, 'navigatore-ore__segno') : h('span', { class: 'menu__vuoto' }),
        h(
          'span',
          { class: 'menu__testo' },
          riga.testo,
          h('small', { class: 'menu__descrizione' }, riga.descrizione),
        ),
      )
      premibili.push({ riga, nodo })
      elenco.appendChild(nodo)
    }
    if (premibili.length === 0) {
      elenco.appendChild(h('li', { class: 'testo-quieto', attr: { role: 'presentation' } }, t.niente))
    }
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
  const sinistra = bordo.left + bordo.width / 2 - scatola.offsetWidth / 2
  scatola.style.left = `${dentroIBordi(sinistra, scatola.offsetWidth, window.innerWidth)}px` // testo-fisso: misura CSS
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

  // L'ora di adesso accesa e in vista: si riparte da lì, non dalla prima.
  const daQui = Math.max(0, premibili.findIndex(({ riga }) => riga.attiva))
  if (ricerca) {
    ricerca.focus()
    if (premibili.length > 0) {
      accendi(daQui)
      // Con la ricerca il fuoco resta nel campo: la riga accesa si legge da
      // `aria-activedescendant`, e la prima freccia riparte da lei.
    }
  } else {
    accendi(daQui)
  }
}

/**
 * Il navigatore in testata: frecce ai lati, al centro l'ora di adesso che apre
 * l'elenco, e sotto quante ore sono preparate. Null se il corso non ha né ore
 * né piani da raggiungere.
 */
export function navigatorePiani (opzioni: OpzioniNavigatore): HTMLElement | null {
  const t = testi()
  const ore = oreDelCorso(opzioni.corso)
  const sciolti = pianiSciolti(opzioni.corso).length + pianiSenzaCorso().length
  if (ore.length === 0 && sciolti === 0) return null

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
  const freccia = (verso: -1 | 1): HTMLButtonElement => {
    const indietro = verso < 0
    const tasto = indietro ? 'Alt+↑' : 'Alt+↓' // testo-fisso: nome dei tasti
    const bottone = pulsante({
      simbolo: indietro ? 'sinistra' : 'destra',
      variante: 'sottile',
      classe: 'navigatore-piani__freccia',
      titolo: `${indietro ? t.precedente : t.successiva} (${tasto})`,
      // Senza un'ora davanti, «avanti» porta alla prima.
      disabilitato: indietro ? posizione <= 0 : posizione >= ore.length - 1,
      al: () => vaiA(posizione < 0 ? 0 : posizione + verso),
    })
    bottone.dataset.tastoAlt = indietro ? 'ArrowUp' : 'ArrowDown' // testo-fisso: nome del tasto
    bottone.setAttribute('aria-keyshortcuts', indietro ? 'Alt+ArrowUp' : 'Alt+ArrowDown') // testo-fisso: nome dei tasti
    return bottone
  }

  const centro = h(
    'button',
    {
      class: ['navigatore-piani__ora', suo && `navigatore-piani__ora--${suo.tipo}`],
      type: 'button',
      dataset: { fuoco: 'navigatore-piani' }, // testo-fisso: chiave del fuoco
      attr: {
        'aria-haspopup': 'listbox',
        'aria-expanded': 'false',
        'aria-label': t.scegli(suo ? `${adesso}, ${statoDetto(suo)}` : adesso),
      },
      onclick: (evento: MouseEvent) => {
        const bottone = evento.currentTarget as HTMLButtonElement
        if (bottone.getAttribute('aria-expanded') === 'true') {
          chiudiAperto?.()
          return
        }
        apriElenco(bottone, opzioni, ore)
      },
    },
    segno ? icona(segno, 'navigatore-piani__segno') : null,
    h('span', { class: 'navigatore-piani__data' }, mostrata),
    icona('giu'),
  )

  return h(
    'div',
    { class: 'navigatore-piani', attr: { role: 'group', 'aria-label': t.etichetta } },
    h('div', { class: 'navigatore-piani__passo' }, freccia(-1), centro, freccia(1)),
    valide.length > 0
      ? h(
          'span',
          { class: 'navigatore-piani__sintesi' },
          t.preparate(pronte, valide.length),
          daCalibrare > 0 ? ` · ${t.daCalibrare(daCalibrare)}` : '',
        )
      : null,
  )
}

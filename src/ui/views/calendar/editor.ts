// Il calendario in modifica: le lezioni prese in mano, senza finestre.
// In modifica un clic sceglie l'ora invece di aprirla. Sul vuoto si disegna una
// lezione (premi e tira, a UD intere; clic secco = durata predefinita); le
// maniglie la stirano; da tastiera frecce spostano, Ctrl+D copia alla settimana
// dopo, Invio apre, F2 modifica, Canc cancella.
// Le ore nuove prendono il corso del filtro; senza filtro si apre il modulo con
// giorno, ora e durata. Un clic su un evento ICS ne genera o apre la lezione
// (`calendar/ics.ts`).
// Durante un gesto si muovono solo gli elementi della griglia, fuori dal ciclo
// di ridisegno: il registro riceve un'azione sola a gesto finito.
// Le lezioni ancorate all'ICS restano ferme (`ancorataAIcs`).

import {
  fineLezione,
  inizioLezione,
  lezioniSovrapposte,
  slotOrdinati,
} from '../../../domain/calculations.js'
import { lezioniDellAnno } from '../../../domain/courses.js'
import {
  formattaData,
  minutiDaOra,
  oraDaMinuti,
  sommaGiorni,
  sommaMinuti,
} from '../../../domain/dates.js'
import { eliminazione } from '../../../domain/deletions.js'
import {
  inizioSullaGriglia,
  lezioneNellaGiornata,
  slotStiratiAncoratiSullePause,
  slotStiratiSullePause,
} from '../../../domain/breaks.js'
import type { Iso, Lezione } from '../../../domain/models.js'
import { azione } from '../../bridge.js'
import { notifica } from '../../components/notifications.js'
import { dentroUnCampo, h } from '../../dom.js'
import { ancorataAIcs } from '../../externalCalendar.js'
import { chiediEliminazione, moduloLezione } from '../../forms.js'
import { opzioniCorsi } from '../../forms/common.js'
import { aggiorna, annoCorrente, nomeClasseDiLezione, stato } from '../../state.js'
import { apriLezione } from './common.js'
import { AGGANCIO_MINUTI, posa } from './drag.js'
import { testi } from './calendar.testi.js'

/** La fascia oraria disegnata dalla settimana: serve a tradurre pixel in minuti. */
export interface Fascia {
  primaOra: number
  ultimaOra: number
}

/** Sotto questa distanza, in pixel, un premi-e-molla è un clic e non un disegno. */
const SOGLIA_TRASCINA = 4
/** Quanto aspettare dopo l'ultima freccia prima di scrivere lo spostamento. */
const ATTESA_FRECCE_MS = 450

// ------------------------------------------------------------------ stato

/**
 * L'ora scelta, fuori dallo stato del pannello: scegliere non cambia il
 * registro e non merita un ridisegno. Il blocco la legge nascendo, `scegli` la
 * accende su quelli che ci sono già.
 */
let scelta: string | null = null

/** Vero se la griglia sta in modifica: interruttore acceso, vista che lo regge. */
export function inModifica (): boolean {
  return (
    stato.editorCalendario &&
    stato.vista === 'calendario' &&
    (stato.modoCalendario === 'settimana' || stato.modoCalendario === 'mese')
  )
}

/** Se quella lezione è l'ora scelta: il blocco lo chiede nascendo. */
export function sceltaLezione (id: string): boolean {
  return inModifica() && scelta === id
}

/** Gli elementi della griglia che disegnano quella lezione. */
function elementiDi (id: string): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(`[data-lezione="${CSS.escape(id)}"]`)]
}

/** Sceglie un'ora — o nessuna — accendendo il bordo senza ridisegnare. */
export function scegli (id: string | null, conFuoco = false): void {
  if (scelta) for (const el of elementiDi(scelta)) el.classList.remove('blocco--scelto', 'chip--scelto')
  scelta = id
  if (!id) return
  for (const el of elementiDi(id)) {
    el.classList.add(el.classList.contains('chip') ? 'chip--scelto' : 'blocco--scelto')
  }
  if (conFuoco) elementiDi(id)[0]?.focus({ preventScroll: true })
}

/** Dopo un ridisegno: l'ora scelta torna ad avere il fuoco, se l'aveva la griglia. */
function rimettiFuoco (id: string): void {
  requestAnimationFrame(() => scegli(id, true))
}

/** Il corso delle ore nuove: quello del filtro, se è un corso dell'anno aperto. */
function corsoPerNuove (): string | null {
  const filtro = stato.filtroCorsoAgendaId
  return filtro && opzioniCorsi().some((c) => c.valore === filtro) ? filtro : null
}

/** Quanto dura un'ora nuova creata con un clic secco, in minuti. */
function durataPredefinita (): number {
  return stato.registro.impostazioni.durataSlotPredefinita
}

function lezionePerId (id: string): Lezione | undefined {
  return stato.registro.lezioni.find((l) => l.id === id)
}

/** «sopra 3B, 4A» se la lezione proposta si sovrappone ad altre dell'anno. */
function sovrapposte (proposta: Lezione): string {
  const dellAnno = lezioniDellAnno(stato.registro, annoCorrente()?.id ?? null)
  const scontri = lezioniSovrapposte(dellAnno, proposta)
  return scontri.length > 0
    ? testi().sopra(scontri.map((l) => nomeClasseDiLezione(l)).join(', '))
    : ''
}

/**
 * Esce dalla modifica, lasciando la griglia com'è. La scelta se ne va, perché
 * rientrando Canc o le frecce agirebbero su un'ora magari non più visibile.
 */
export function esci (): void {
  scegli(null)
  aggiorna({ editorCalendario: false })
}

// ------------------------------------------------------------------ disegnare

/**
 * Premi sul vuoto di una colonna, tira, molla: una lezione nuova (sul
 * `pointerdown` della colonna). Mentre si tira c'è una bozza a UD intere;
 * mollando parte `lezione.salva`, un passo della storia. Si disegna nei due
 * versi. Con le pause della giornata l'inizio si aggancia alla loro griglia e
 * la lezione le contiene (`lezioneNellaGiornata`).
 */
export function disegnaLezione (
  evento: PointerEvent,
  colonna: HTMLElement,
  data: Iso,
  fascia: Fascia,
): void {
  if (evento.button !== 0 || evento.target !== colonna) return
  evento.preventDefault()

  const corsoId = corsoPerNuove()
  const riquadro = colonna.getBoundingClientRect()
  const durata = Math.max(1, fascia.ultimaOra - fascia.primaOra)
  const minutoDi = (clientY: number): number => {
    const frazione = riquadro.height > 0 ? (clientY - riquadro.top) / riquadro.height : 0
    const grezzi = fascia.primaOra + frazione * durata
    return Math.round(grezzi / AGGANCIO_MINUTI) * AGGANCIO_MINUTI
  }
  const partenza = minutoDi(evento.clientY)
  const predefinita = durataPredefinita()
  const giornata = stato.registro.impostazioni
  const { minutiUd } = giornata
  /** Il minuto portato sulla griglia delle pause, se ce ne sono. */
  const sullaGriglia = (minuto: number): number =>
    minutiDaOra(inizioSullaGriglia(oraDaMinuti(minuto), giornata))

  /** Inizio e lunghezza della lezione se si mollasse qui. */
  const misura = (clientY: number, tirato: boolean): { inizio: number, minuti: number } => {
    if (!tirato) return { inizio: sullaGriglia(partenza), minuti: predefinita }
    const qui = minutoDi(clientY)
    const ud = Math.max(1, Math.round(Math.abs(qui - partenza) / minutiUd))
    const minuti = ud * minutiUd
    return { inizio: sullaGriglia(qui < partenza ? partenza - minuti : partenza), minuti }
  }

  const bozza = h('div', { class: 'settimana__bozza', attr: { 'aria-hidden': 'true' } })
  const disegna = (inizio: number, minuti: number): void => {
    bozza.style.top = `${((inizio - fascia.primaOra) / durata) * 100}%`
    bozza.style.height = `${(minuti / durata) * 100}%`
    bozza.dataset.orario = `${oraDaMinuti(inizio)}–${oraDaMinuti(inizio + minuti)}`
  }

  let tirato = false
  let ultimoY = evento.clientY
  let cornice = 0
  const muovi = (mossa: PointerEvent): void => {
    ultimoY = mossa.clientY
    if (!tirato && Math.abs(mossa.clientY - evento.clientY) < SOGLIA_TRASCINA) return
    if (!tirato) {
      tirato = true
      colonna.appendChild(bozza)
    }
    // Una misura per fotogramma: il puntatore manda eventi più spesso dello schermo.
    if (cornice) return
    cornice = requestAnimationFrame(() => {
      cornice = 0
      const { inizio, minuti } = misura(ultimoY, true)
      disegna(inizio, minuti)
    })
  }
  const finisci = (fine: PointerEvent): void => {
    colonna.removeEventListener('pointermove', muovi)
    colonna.removeEventListener('pointerup', finisci)
    colonna.removeEventListener('pointercancel', annulla)
    if (cornice) cancelAnimationFrame(cornice)
    bozza.remove()
    const { inizio, minuti } = misura(fine.clientY, tirato)
    void creaQui(corsoId, data, inizio, minuti)
  }
  const annulla = (): void => {
    colonna.removeEventListener('pointermove', muovi)
    colonna.removeEventListener('pointerup', finisci)
    colonna.removeEventListener('pointercancel', annulla)
    if (cornice) cancelAnimationFrame(cornice)
    bozza.remove()
  }

  colonna.setPointerCapture(evento.pointerId)
  colonna.addEventListener('pointermove', muovi)
  colonna.addEventListener('pointerup', finisci)
  colonna.addEventListener('pointercancel', annulla)
}

/** Scrive la lezione disegnata. Senza un corso, apre il modulo con giorno, ora e durata. */
async function creaQui (
  corsoId: string | null,
  data: Iso,
  inizio: number,
  minuti: number,
): Promise<void> {
  // Al massimo un minuto prima di mezzanotte, come `scriviSpostamento`: una fine
  // alle 24:00 si scriverebbe «00:00».
  const limite = 24 * 60 - 1 - minuti
  const da = Math.max(0, Math.min(inizio, limite))
  if (!corsoId) {
    moduloLezione({ data, oraProposta: oraDaMinuti(da), durataProposta: minuti })
    return
  }
  const lezione =
    lezioneNellaGiornata(corsoId, data, oraDaMinuti(da), minuti, stato.registro.impostazioni)
  const sopra = sovrapposte(lezione)
  const risposta = await azione({ tipo: 'lezione.salva', lezione })
  if (!risposta.ok) return
  // Inizio e fine della lezione nata, non del tratto: con una pausa finisce più tardi.
  const dal = inizioLezione(lezione) ?? oraDaMinuti(da)
  const orario = `${dal}–${fineLezione(lezione) ?? oraDaMinuti(da + minuti)}`
  notifica(
    testi().creata(nomeClasseDiLezione(lezione), formattaData(data, 'giorno'), orario, sopra),
    sopra ? 'avviso' : 'successo',
  )
  rimettiFuoco(risposta.creato?.id ?? lezione.id)
}

// ------------------------------------------------------------------ stirare

/**
 * Le due maniglie di un blocco. Si tirano a UD intere con l'orario nuovo
 * scritto dentro; mollando parte `lezione.salva` con `slotStirati` (le pause
 * restano dove sono). Su un blocco ancorato all'ICS cambiano solo le fasce
 * libere accanto all'evento (`stirati`).
 */
export function maniglie (blocco: HTMLElement, lezione: Lezione, fascia: Fascia): HTMLElement[] {
  return (['inizio', 'fine'] as const).map((capo) =>
    h('span', {
      class: ['blocco__maniglia', `blocco__maniglia--${capo}`],
      attr: {
        'aria-hidden': 'true',
        title: capo === 'inizio' ? testi().tiraInizio : testi().tiraFine,
      },
      onpointerdown: (evento: PointerEvent) => stira(evento, blocco, lezione, capo, fascia),
      // Il clic che chiude la tirata non deve scegliere né aprire il blocco.
      onclick: (evento: MouseEvent) => evento.stopPropagation(),
    }),
  )
}

function stira (
  evento: PointerEvent,
  blocco: HTMLElement,
  lezione: Lezione,
  capo: 'inizio' | 'fine',
  fascia: Fascia,
): void {
  if (evento.button !== 0) return
  evento.preventDefault()
  evento.stopPropagation()
  const colonna = blocco.parentElement
  const inizio = inizioLezione(lezione)
  const fine = fineLezione(lezione)
  if (!colonna || !inizio || !fine) return

  const maniglia = evento.currentTarget as HTMLElement
  const altezza = colonna.getBoundingClientRect().height
  const durata = Math.max(1, fascia.ultimaOra - fascia.primaOra)
  const pixelPerMinuto = altezza / durata
  const primaTop = blocco.style.top
  const primaHeight = blocco.style.height
  const eraTrascinabile = blocco.draggable
  // Il trascinamento del blocco resta spento mentre si tiene la maniglia.
  blocco.draggable = false
  blocco.classList.add('blocco--in-stiro')
  scegli(lezione.id)

  let ud = 0
  let slot: Lezione['slot'] | null = lezione.slot
  const aggiornaAnteprima = (clientY: number): void => {
    const spostati = (clientY - evento.clientY) / pixelPerMinuto
    // Tirare giù il bordo di sotto allunga; tirare giù quello di sopra accorcia.
    const voluto =
      Math.round(spostati / stato.registro.impostazioni.minutiUd) * (capo === 'fine' ? 1 : -1)
    if (voluto === ud) return
    const prova = stirati(lezione, capo, voluto)
    if (!prova) return
    ud = voluto
    slot = prova
    // Gli estremi dell'ora stirata e non quelli di prima più le UD: sulle pause
    // un'UD in più può portarsi dietro una ricreazione.
    const ordinati = slotOrdinati(prova)
    const da = minutiDaOra(ordinati[0].inizio)
    const a = minutiDaOra(ordinati[ordinati.length - 1].fine)
    blocco.style.top = `${((da - fascia.primaOra) / durata) * 100}%`
    blocco.style.height = `${((a - da) / durata) * 100}%`
    blocco.dataset.orario = `${oraDaMinuti(da)}–${oraDaMinuti(a)}`
  }

  let ultimoY = evento.clientY
  let cornice = 0
  const muovi = (mossa: PointerEvent): void => {
    ultimoY = mossa.clientY
    if (cornice) return
    cornice = requestAnimationFrame(() => {
      cornice = 0
      aggiornaAnteprima(ultimoY)
    })
  }
  const chiudi = (): void => {
    maniglia.removeEventListener('pointermove', muovi)
    maniglia.removeEventListener('pointerup', finisci)
    maniglia.removeEventListener('pointercancel', annulla)
    if (cornice) cancelAnimationFrame(cornice)
    blocco.draggable = eraTrascinabile
    blocco.classList.remove('blocco--in-stiro')
    delete blocco.dataset.orario
  }
  const annulla = (): void => {
    chiudi()
    blocco.style.top = primaTop
    blocco.style.height = primaHeight
  }
  const finisci = (fineGesto: PointerEvent): void => {
    aggiornaAnteprima(fineGesto.clientY)
    chiudi()
    if (ud === 0 || !slot) {
      annulla()
      return
    }
    const nuova: Lezione = { ...lezione, slot }
    void salvaStirata(nuova, primaTop, primaHeight, blocco)
  }

  maniglia.setPointerCapture(evento.pointerId)
  maniglia.addEventListener('pointermove', muovi)
  maniglia.addEventListener('pointerup', finisci)
  maniglia.addEventListener('pointercancel', annulla)
}

async function salvaStirata (
  lezione: Lezione,
  primaTop: string,
  primaHeight: string,
  blocco: HTMLElement | null,
): Promise<void> {
  const sopra = sovrapposte(lezione)
  const risposta = await azione({ tipo: 'lezione.salva', lezione })
  if (!risposta.ok) {
    // Rifiutata: il blocco torna com'era, e il perché lo ha già detto `azione`.
    if (blocco) {
      blocco.style.top = primaTop
      blocco.style.height = primaHeight
    }
    return
  }
  const orario = `${inizioLezione(lezione) ?? ''}–${fineLezione(lezione) ?? ''}`
  notifica(
    testi().stirata(nomeClasseDiLezione(lezione), orario, sopra),
    sopra ? 'avviso' : 'successo',
  )
  rimettiFuoco(lezione.id)
}

/**
 * Stira l'ora di un'unità didattica da un capo, senza maniglia: è la voce del
 * tasto destro. Torna falso, e non scrive, se il gesto non ha senso.
 */
export function stirabile (lezione: Lezione, capo: 'inizio' | 'fine', ud: number): boolean {
  return stirati(lezione, capo, ud) !== null
}

export async function stiraDiUd (lezione: Lezione, capo: 'inizio' | 'fine', ud: number): Promise<void> {
  const slot = stirati(lezione, capo, ud)
  if (!slot) return
  await salvaStirata({ ...lezione, slot }, '', '', null)
}

/**
 * Gli slot dell'ora tirata da un capo. Ancorata all'ICS cambiano solo le fasce
 * libere, l'evento resta fermo (`slotStiratiAncorati`). Con le pause dichiarate
 * l'ora si ridispone su di loro e scavalca la ricreazione
 * (`slotStiratiSullePause`, `slotStiratiAncoratiSullePause`).
 */
function stirati (lezione: Lezione, capo: 'inizio' | 'fine', ud: number): Lezione['slot'] | null {
  const giornata = stato.registro.impostazioni
  return ancorataAIcs(lezione.id)
    ? slotStiratiAncoratiSullePause(lezione.slot, capo, ud, giornata)
    : slotStiratiSullePause(lezione.slot, capo, ud, giornata)
}

// ------------------------------------------------------------------ dai menu

/**
 * Entra in modifica senza ora scelta (voce «Modifica il calendario»). Da
 * agenda o anno si passa alla settimana: la modifica sta sulle griglie.
 */
export function entraInModifica (): void {
  const griglia = stato.modoCalendario === 'settimana' || stato.modoCalendario === 'mese'
  scelta = null
  aggiorna({
    editorCalendario: true,
    ...(griglia ? {} : { modoCalendario: 'settimana' as const }),
  })
}

/**
 * Una lezione nuova al minuto su cui si è premuto il tasto destro, lunga
 * quanto l'ora predefinita. Con il corso del filtro nasce subito; senza, il
 * modulo con giorno e ora già messi.
 */
export function creaAlle (data: Iso, minuto: number | null): Promise<void> {
  const inizio = minuto ?? minutiDaOra(stato.registro.impostazioni.oraInizioGiornata)
  return creaQui(corsoPerNuove(), data, inizio, durataPredefinita())
}

/** Il nome del corso in cui nascerebbe un'ora nuova, se c'è un filtro. */
export function corsoDelleNuove (): string | null {
  return corsoPerNuove()
}

// ------------------------------------------------------------------ tastiera

/**
 * Lo spostamento in attesa delle frecce, in minuti e in giorni. Su e giù
 * muovono il blocco subito sullo schermo e il registro riceve la somma a frecce
 * ferme (una freccia tenuta manda trenta battute al secondo). I giorni partono
 * subito, in fila dietro la scrittura precedente (`ultimaScrittura`).
 */
interface Attesa {
  id: string
  minuti: number
  giorni: number
  timer: number
  primaTop: string
  /** Già messa in coda dietro la scrittura in volo: vedi `spostaDi`. */
  accodata: boolean
}
let inAttesa: Attesa | null = null

/**
 * La coda delle scritture delle frecce. Ogni spostamento si calcola dalla
 * lezione nel registro, che fino alla risposta è ancora quella vecchia: in fila,
 * ognuna parte quando la precedente è arrivata (l'host manda lo stato prima
 * della risposta).
 */
let ultimaScrittura: Promise<unknown> = Promise.resolve()
let scrittureInVolo = 0

/** La fascia della settimana disegnata per ultima, per l'anteprima delle frecce. */
let fasciaCorrente: Fascia | null = null

/** La settimana la dichiara a ogni disegno. */
export function ricordaFascia (fascia: Fascia): void {
  fasciaCorrente = fascia
}

/** Mette in coda la scrittura dello spostamento in attesa, se c'è. */
function scriviSpostamento (): Promise<unknown> {
  const attesa = inAttesa
  if (!attesa) return ultimaScrittura
  clearTimeout(attesa.timer)
  inAttesa = null
  scrittureInVolo += 1
  ultimaScrittura = ultimaScrittura
    .then(() => mandaSpostamento(attesa))
    .finally(() => { scrittureInVolo -= 1 })
  return ultimaScrittura
}

async function mandaSpostamento (attesa: Attesa): Promise<void> {
  const { id, minuti, giorni } = attesa
  const lezione = lezionePerId(id)
  const inizio = lezione ? inizioLezione(lezione) : null
  if (!lezione || (minuti === 0 && giorni === 0) || (minuti !== 0 && !inizio)) {
    ritiraAnteprima(attesa)
    return
  }
  const data = giorni === 0 ? lezione.data : sommaGiorni(lezione.data, giorni)
  let ora: string | undefined
  if (minuti !== 0 && inizio) {
    const fine = fineLezione(lezione)
    const lunga = fine ? minutiDaOra(fine) - minutiDaOra(inizio) : 0
    ora = oraDaMinuti(Math.max(0, Math.min(minutiDaOra(inizio) + minuti, 24 * 60 - 1 - lunga)))
  }
  if (!(await spostaDavvero(lezione, data, ora))) ritiraAnteprima(attesa)
}

/**
 * Scrive subito lo spostamento delle frecce in attesa e aspetta la coda vuota.
 * Annulla e ripristina la chiamano prima di partire, così Ctrl+Z toglie proprio
 * lo spostamento invece di un passo precedente.
 */
export function scriviInAttesa (): Promise<unknown> {
  return scriviSpostamento()
}

/** Vero se le frecce hanno qualcosa da scrivere, o lo stanno scrivendo. */
export function spostamentoInAttesa (): boolean {
  return inAttesa !== null || scrittureInVolo > 0
}

export async function sposta (lezione: Lezione, data: Iso, inizio?: string): Promise<void> {
  await spostaDavvero(lezione, data, inizio)
}

/** Come `sposta`, ma dice se il registro l'ha preso. */
async function spostaDavvero (lezione: Lezione, data: Iso, inizio?: string): Promise<boolean> {
  const risposta = await azione({
    tipo: 'lezione.sposta',
    lezioneId: lezione.id,
    data,
    ...(inizio ? { inizio } : {}),
  })
  if (risposta.ok) rimettiFuoco(lezione.id)
  return risposta.ok
}

/** Il blocco della settimana di quella lezione, se è sullo schermo. */
function bloccoDi (id: string): HTMLElement | undefined {
  return elementiDi(id).find((el) => el.classList.contains('blocco'))
}

/** Rimette il blocco dov'era: lo spostamento non è stato scritto. */
function ritiraAnteprima (attesa: Attesa): void {
  const blocco = bloccoDi(attesa.id)
  if (!blocco) return
  blocco.style.top = attesa.primaTop
  delete blocco.dataset.orario
}

/**
 * Accumula uno spostamento dell'ora scelta: i minuti aspettano le frecce ferme
 * (con anteprima), i giorni si scrivono subito in coda. Lo spostamento in attesa
 * di un'altra ora parte prima.
 */
function spostaDi (lezione: Lezione, minuti: number, giorni: number): void {
  if (inAttesa && inAttesa.id !== lezione.id) void scriviSpostamento()
  const blocco = bloccoDi(lezione.id)
  if (!inAttesa) {
    inAttesa = {
      id: lezione.id, minuti: 0, giorni: 0, timer: 0, primaTop: blocco?.style.top ?? '', accodata: false,
    }
  }
  inAttesa.minuti += minuti
  inAttesa.giorni += giorni
  clearTimeout(inAttesa.timer)
  if (giorni !== 0) {
    // Con una scrittura in volo le battute si sommano e partono insieme al suo arrivo.
    if (scrittureInVolo === 0) void scriviSpostamento()
    else if (!inAttesa.accodata) {
      inAttesa.accodata = true
      void ultimaScrittura.then(scriviSpostamento)
    }
    return
  }
  inAttesa.timer = window.setTimeout(() => void scriviSpostamento(), ATTESA_FRECCE_MS)

  const inizio = inizioLezione(lezione)
  if (blocco && inizio && fasciaCorrente) {
    const durata = Math.max(1, fasciaCorrente.ultimaOra - fasciaCorrente.primaOra)
    const da = minutiDaOra(inizio) + inAttesa.minuti
    blocco.style.top = `${((da - fasciaCorrente.primaOra) / durata) * 100}%`
    const fine = fineLezione(lezione)
    const lunga = fine ? minutiDaOra(fine) - minutiDaOra(inizio) : 0
    blocco.dataset.orario = `${oraDaMinuti(da)}–${sommaMinuti(oraDaMinuti(da), lunga)}`
  }
}

/** Cancella l'ora scelta: subito se è vuota, chiedendo se si porta via qualcosa. */
export async function elimina (lezione: Lezione): Promise<void> {
  const piano = eliminazione(stato.registro, { genere: 'lezione', id: lezione.id })
  // Un'ora pianificata e vuota si toglie subito (c'è Ctrl+Z); con appello, note
  // o testi si chiede, con l'elenco di quel che se ne va.
  const daChiedere = lezione.stato !== 'pianificata' || (piano?.perdite.length ?? 0) > 0
  if (daChiedere && !(await chiediEliminazione({ genere: 'lezione', id: lezione.id }))) return
  const risposta = await azione({ tipo: 'lezione.elimina', lezioneId: lezione.id })
  if (!risposta.ok) return
  scelta = null
  notifica(testi().eliminata(nomeClasseDiLezione(lezione)), 'successo')
}

/** Frena i gesti sulle ore che il calendario ICS tiene ferme, dicendo perché. */
function ferma (lezione: Lezione): boolean {
  if (!ancorataAIcs(lezione.id)) return false
  notifica(testi().ancorataFerma, 'avviso')
  return true
}

/**
 * Vero mentre una copia o una cancellazione da tastiera è in volo: le battute
 * ripetute arrivano prima della risposta e farebbero copie doppie o errori.
 */
let gestoInVolo = false

async function inVolo (gesto: () => Promise<void>): Promise<void> {
  gestoInVolo = true
  try {
    await gesto()
  } finally {
    gestoInVolo = false
  }
}

/**
 * Se il tasto è dell'editor: fuoco sulla pagina o dentro il calendario. I
 * pulsanti della barra e quelli del calendario che non sono ore tengono i
 * loro tasti.
 */
function tastoDellEditor (bersaglio: EventTarget | null): boolean {
  if (bersaglio === document.body) return true
  if (!(bersaglio instanceof Element) || !bersaglio.closest('.vista--calendario')) return false
  const pulsante = bersaglio.closest('button, a, [role="button"]')
  return !pulsante || pulsante.hasAttribute('data-lezione')
}

function tasto (evento: KeyboardEvent): void {
  if (!inModifica() || evento.defaultPrevented) return
  if (document.querySelector('.modale, .menu')) return
  if (dentroUnCampo(evento.target)) return

  // L'ora scelta che non è più sullo schermo non si tocca.
  if (scelta && elementiDi(scelta).length === 0) scegli(null)

  if (evento.key === 'Escape') {
    evento.preventDefault()
    if (scelta) scegli(null)
    else esci()
    return
  }

  if (!tastoDellEditor(evento.target)) return
  const lezione = scelta ? lezionePerId(scelta) : undefined
  if (!lezione) return
  const settimana = stato.modoCalendario === 'settimana'
  const conCtrl = evento.ctrlKey || evento.metaKey

  switch (evento.key) {
    case 'Delete':
    case 'Backspace':
      evento.preventDefault()
      if (evento.repeat || gestoInVolo || ferma(lezione)) return
      // Uno spostamento in attesa di un'ora che se ne va non ha più dove andare.
      if (inAttesa?.id === lezione.id) {
        clearTimeout(inAttesa.timer)
        inAttesa = null
      }
      void inVolo(() => elimina(lezione))
      return
    case 'Enter':
      evento.preventDefault()
      apriLezione(lezione)
      return
    case 'F2':
      evento.preventDefault()
      moduloLezione({ lezione })
      return
    case 'ArrowUp':
    case 'ArrowDown': {
      if (conCtrl || evento.altKey) return
      evento.preventDefault()
      if (ferma(lezione)) return
      const verso = evento.key === 'ArrowUp' ? -1 : 1
      // Maiusc: un'unità didattica alla volta, per rifare l'orario in fretta.
      const passo = evento.shiftKey ? stato.registro.impostazioni.minutiUd : AGGANCIO_MINUTI
      if (settimana) spostaDi(lezione, verso * passo, 0)
      else spostaDi(lezione, 0, verso * 7)
      return
    }
    case 'ArrowLeft':
    case 'ArrowRight': {
      if (conCtrl || evento.altKey) return
      evento.preventDefault()
      if (ferma(lezione)) return
      spostaDi(lezione, 0, evento.key === 'ArrowLeft' ? -1 : 1)
      return
    }
    case 'd':
    case 'D':
      if (!conCtrl || evento.altKey || evento.shiftKey) return
      evento.preventDefault()
      // Come «Copia» nel menu, che per le ore ancorate all'ICS non c'è.
      if (evento.repeat || gestoInVolo || ferma(lezione)) return
      void inVolo(async () => {
        // Prima lo spostamento in attesa: la copia va dove l'ora sta adesso.
        await scriviSpostamento()
        const adesso = lezionePerId(lezione.id) ?? lezione
        await posa(adesso, sommaGiorni(adesso.data, 7), undefined, true)
      })
  }
}

document.addEventListener('keydown', tasto)

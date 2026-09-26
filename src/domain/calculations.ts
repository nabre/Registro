// I conti del registro: durate, presenze, medie. Funzioni pure su dati in
// memoria, senza disco né `apparato`: si provano con `node --test`.

import {
  durataMinuti,
  formattaData,
  giornoDi,
  minutiDaOra,
  oraDaMinuti,
  sommaMinuti,
} from './dates.js'
import { nuovoIdSlot } from './identifiers.js'
import { SIGLE_PRESENZA as SIGLE, chiaviDi, corto } from './lexicon.js'
import { lessico } from './lexicon.testi.js'
import { testi } from './calculations.testi.js'
import { confrontaNomi } from './text.js'
import type { Grafico } from './reports.js'
import type {
  Attivita,
  Allievo,
  Classe,
  Iso,
  Lezione,
  MomentoValutazione,
  Ora,
  PianoLezione,
  Presenza,
  Scala,
  Slot,
  StatoPresenza,
  Voto,
} from './models.js'

// ------------------------------------------------------------------ orari

/** Gli slot in ordine di inizio. Non modifica l'originale. */
export function slotOrdinati (slot: Slot[]): Slot[] {
  return [...slot].sort((a, b) => a.inizio.localeCompare(b.inizio))
}

/**
 * Dove sta una lezione rispetto a questo momento, guardando l'ora e non solo
 * la data: alle dodici l'ora delle otto è finita, e un appello mancante manca
 * adesso. `in-corso` va dal primo all'ultimo minuto, pause comprese.
 */
export type Momento = 'passata' | 'in-corso' | 'futura'

export function momentoLezione (lezione: Lezione, giorno: Iso, ora: Ora): Momento {
  if (lezione.data < giorno) return 'passata'
  if (lezione.data > giorno) return 'futura'

  const inizio = inizioLezione(lezione)
  const fine = fineLezione(lezione)
  // Un'ora senza orario, oggi: non si può dire che sia finita.
  if (!inizio || !fine) return 'in-corso'

  const minuti = minutiDaOra(ora)
  if (minuti < minutiDaOra(inizio)) return 'futura'
  return minuti >= minutiDaOra(fine) ? 'passata' : 'in-corso'
}

/**
 * Le fasce di una lezione che vengono dal calendario ICS (`Slot.ics`). Se la
 * lezione non ne segna nessuna, valgono tutte.
 */
export function slotDelCalendario (slot: readonly Slot[]): Slot[] {
  const segnati = slot.filter((s) => s.ics)
  return slotOrdinati(segnati.length > 0 ? segnati : [...slot])
}

/**
 * Le fasce aggiunte a mano accanto a quelle del calendario: un'ora in più, una
 * pausa. Nessuna, se la lezione non ne segna nessuna del calendario.
 */
export function slotLiberi (slot: readonly Slot[]): Slot[] {
  return slot.some((s) => s.ics) ? slotOrdinati(slot.filter((s) => !s.ics)) : []
}

/**
 * Gli stessi slot con quelli del calendario segnati (tutti, se nessuno lo era).
 * Va chiamata prima di aggiungere una fascia libera a una lezione ancorata,
 * se no la fascia nuova passerebbe per ICS e il primo allineamento la
 * toglierebbe.
 */
export function slotSegnati (slot: readonly Slot[]): Slot[] {
  if (slot.some((s) => s.ics)) return slot.map((s) => ({ ...s }))
  return slot.map((s) => ({ ...s, ics: true as const }))
}

/**
 * Gli stessi slot, spostati perché il primo cominci a un'altra ora: tutto
 * insieme, pause comprese, durate invariate.
 */
export function slotSpostati (slot: Slot[], nuovoInizio: Ora): Slot[] {
  const primo = slotOrdinati(slot)[0]
  if (!primo) return slot
  const scarto = minutiDaOra(nuovoInizio) - minutiDaOra(primo.inizio)
  if (scarto === 0) return slot
  return slot.map((s) => ({
    ...s,
    inizio: sommaMinuti(s.inizio, scarto),
    fine: sommaMinuti(s.fine, scarto),
  }))
}

/**
 * Gli stessi slot, allungati o accorciati da un capo di `ud` UD (la maniglia
 * del calendario). Cambia solo lo slot su quel capo, a UD intere. `ud`
 * positivo allunga. `null` se il capo è una pausa, lo slot resterebbe senza UD
 * o la lezione uscirebbe dal giorno.
 */
export function slotStirati (
  slot: Slot[],
  capo: 'inizio' | 'fine',
  ud: number,
  minutiUd: number,
): Slot[] | null {
  const ordinati = slotOrdinati(slot)
  const bordo = capo === 'inizio' ? ordinati[0] : ordinati[ordinati.length - 1]
  if (!bordo || bordo.tipo !== 'lezione' || !Number.isInteger(ud)) return null
  if (ud === 0) return slot
  const scarto = ud * minutiUd
  const inizio = minutiDaOra(bordo.inizio) - (capo === 'inizio' ? scarto : 0)
  const fine = minutiDaOra(bordo.fine) + (capo === 'fine' ? scarto : 0)
  if (fine - inizio < minutiUd || inizio < 0 || fine >= 24 * 60) return null
  const stirato: Slot = {
    ...bordo,
    inizio: capo === 'inizio' ? sommaMinuti(bordo.inizio, -scarto) : bordo.inizio,
    fine: capo === 'fine' ? sommaMinuti(bordo.fine, scarto) : bordo.fine,
  }
  return slot.map((s) => (s.id === bordo.id ? stirato : s))
}

/**
 * `slotStirati` per una lezione ancorata al calendario ICS: le fasce ICS non si
 * muovono, il capo tirato fa crescere o calare le fasce libere. Oltre una
 * fascia ICS nasce una fascia libera attaccata; una libera accorciata a zero se
 * ne va con la sua pausa libera. `null` se si accorcia dentro le fasce ICS.
 */
export function slotStiratiAncorati (
  slot: Slot[],
  capo: 'inizio' | 'fine',
  ud: number,
  minutiUd: number,
): Slot[] | null {
  if (!Number.isInteger(ud)) return null
  if (ud === 0) return slot
  const segnati = slotOrdinati(slotSegnati(slot))
  const bordo = capo === 'inizio' ? segnati[0] : segnati[segnati.length - 1]
  if (!bordo) return null
  const scarto = ud * minutiUd

  if (bordo.ics || bordo.tipo === 'pausa') {
    if (ud < 0) return null
    const da = capo === 'fine' ? minutiDaOra(bordo.fine) : minutiDaOra(bordo.inizio) - scarto
    const a = da + scarto
    if (da < 0 || a >= 24 * 60) return null
    const nuova: Slot = {
      id: nuovoIdSlot(),
      inizio: oraDaMinuti(da),
      fine: oraDaMinuti(a),
      tipo: 'lezione',
    }
    return slotOrdinati([...segnati, nuova])
  }

  const da = minutiDaOra(bordo.inizio) - (capo === 'inizio' ? scarto : 0)
  const a = minutiDaOra(bordo.fine) + (capo === 'fine' ? scarto : 0)
  if (da < 0 || a >= 24 * 60) return null
  if (a - da > 0) {
    const stirato = { ...bordo, inizio: oraDaMinuti(da), fine: oraDaMinuti(a) }
    return segnati.map((s) => (s.id === bordo.id ? stirato : s))
  }
  if (a - da < 0) return null
  // Accorciata a zero: se ne va con la pausa libera rimasta sul bordo. Una
  // fascia del calendario non se ne va mai.
  const resto = segnati.filter((s) => s.id !== bordo.id)
  const nuovoBordo = capo === 'inizio' ? resto[0] : resto[resto.length - 1]
  return nuovoBordo && !nuovoBordo.ics && nuovoBordo.tipo === 'pausa'
    ? resto.filter((s) => s.id !== nuovoBordo.id)
    : resto
}

/**
 * Gli stessi slot, ognuno attaccato alla fine del precedente, nell'ordine
 * dell'elenco; le durate non cambiano. Un buco non è un dato: o è una pausa
 * (uno slot `pausa`) o un errore. Con `inizio` si sposta l'ora intera.
 */
export function slotIncatenati (slot: Slot[], inizio?: Ora): Slot[] {
  let ora = inizio ?? slot[0]?.inizio
  if (ora === undefined) return []
  return slot.map((s) => {
    const attaccato = { ...s, inizio: ora, fine: sommaMinuti(ora, durataMinuti(s.inizio, s.fine)) }
    ora = attaccato.fine
    return attaccato
  })
}

/** Ora d'inizio della lezione: quella del primo slot. */
export function inizioLezione (lezione: Lezione): string | null {
  return slotOrdinati(lezione.slot)[0]?.inizio ?? null
}

/**
 * L'ordine in cui le lezioni si sfogliano: per giorno, poi per ora d'inizio.
 * Mai zero per ore mancanti, perché `sort` possa contarci.
 */
export function confrontaLezioni (a: Lezione, b: Lezione): number {
  return (
    a.data.localeCompare(b.data) ||
    (inizioLezione(a) ?? '').localeCompare(inizioLezione(b) ?? '') ||
    a.id.localeCompare(b.id)
  )
}

/** Ora di fine della lezione: la più tarda fra tutti gli slot. */
export function fineLezione (lezione: Lezione): string | null {
  return lezione.slot.reduce<string | null>(
    (max, s) => (max === null || s.fine > max ? s.fine : max),
    null,
  )
}

/** Minuti di effettiva lezione: le pause non contano. */
export function minutiEffettivi (lezione: Lezione): number {
  return lezione.slot
    .filter((s) => s.tipo === 'lezione')
    .reduce((somma, s) => somma + durataMinuti(s.inizio, s.fine), 0)
}

/** Minuti dal primo inizio all'ultima fine, pause comprese. */
export function minutiTotali (lezione: Lezione): number {
  const inizio = inizioLezione(lezione)
  const fine = fineLezione(lezione)
  return inizio && fine ? durataMinuti(inizio, fine) : 0
}

/** Vero se i due intervalli si sovrappongono (il contatto agli estremi non conta). */
export function sovrapposti (a: Slot, b: Slot): boolean {
  return a.inizio < b.fine && b.inizio < a.fine
}

/** Le coppie di slot in conflitto dentro una stessa lezione. */
export function slotInConflitto (slot: Slot[]): Array<[Slot, Slot]> {
  const ordinati = slotOrdinati(slot)
  const conflitti: Array<[Slot, Slot]> = []
  for (let i = 0; i < ordinati.length - 1; i += 1) {
    // Non basta il vicino: uno slot lungo ne può contenere due. Si scorre finché
    // il prossimo comincia dopo la fine di questo.
    for (let j = i + 1; j < ordinati.length; j += 1) {
      if (ordinati[j].inizio >= ordinati[i].fine) break
      if (sovrapposti(ordinati[i], ordinati[j])) conflitti.push([ordinati[i], ordinati[j]])
    }
  }
  return conflitti
}

/** Lezioni dello stesso giorno il cui orario si accavalla a quello dato. */
export function lezioniSovrapposte (lezioni: Lezione[], lezione: Lezione): Lezione[] {
  const inizio = inizioLezione(lezione)
  const fine = fineLezione(lezione)
  if (!inizio || !fine) return []
  return lezioni.filter((altra) => {
    if (altra.id === lezione.id || altra.data !== lezione.data) return false
    if (altra.stato === 'annullata') return false
    const altroInizio = inizioLezione(altra)
    const altraFine = fineLezione(altra)
    return !!altroInizio && !!altraFine && inizio < altraFine && altroInizio < fine
  })
}

// ------------------------------------------------------------------ unità didattiche

/**
 * Una casella dell'appello: un'UD dell'ora, con il suo orario. Le assenze si
 * contano per UD (lunga quanto la dichiara il documento), non per ora.
 */
interface UnitaDidattica {
  /** Posizione nell'ora, da zero: è l'indice con cui si legge `Presenza.stati`. */
  indice: number
  inizio: Ora
  fine: Ora
  /** Vera per la prima UD di ogni slot dopo il primo: lì in mezzo c'è una pausa. */
  dopoUnaPausa: boolean
}

/**
 * Le UD di un'ora in fila, solo negli slot di lezione. Se uno slot non è un
 * multiplo dell'UD (dato scritto a mano), l'ultima fetta è quel che avanza:
 * meglio una colonna corta che un'ora sparita dall'appello.
 */
export function unitaDidattiche (lezione: Lezione, minutiUd: number): UnitaDidattica[] {
  const esito: UnitaDidattica[] = []
  let primo = true
  for (const slot of slotOrdinati(lezione.slot)) {
    if (slot.tipo !== 'lezione') continue
    let resto = durataMinuti(slot.inizio, slot.fine)
    let inizio = slot.inizio
    let apre = !primo
    primo = false
    while (resto > 0) {
      const quanto = Math.min(minutiUd, resto)
      const fine = sommaMinuti(inizio, quanto)
      esito.push({ indice: esito.length, inizio, fine, dopoUnaPausa: apre })
      apre = false
      inizio = fine
      resto -= quanto
    }
  }
  return esito
}

/**
 * Come si segna una casella dell'appello, e come si chiama: sigle e parole dal
 * lessico, uguali a schermo e nel verbale stampato.
 */
export const SIGLE_PRESENZA: ReadonlyArray<{
  readonly valore: StatoPresenza
  readonly sigla: string
  readonly nome: string
}> = chiaviDi(SIGLE).map((valore) =>
  // Il nome si legge al momento (la lingua si sceglie dopo il caricamento); la
  // sigla è uguale in tutte le lingue.
  Object.defineProperty({ valore, sigla: SIGLE[valore] }, 'nome', {
    enumerable: true,
    get: () => lessico().presenze[valore],
  }) as { valore: StatoPresenza, sigla: string, nome: string },
)

export function siglaPresenza (stato: StatoPresenza): string {
  return SIGLE_PRESENZA.find((v) => v.valore === stato)?.sigla ?? '-'
}

/** Quante unità didattiche conta un'ora: la lunghezza che deve avere l'appello. */
export function contaUd (lezione: Lezione, minutiUd: number): number {
  return unitaDidattiche(lezione, minutiUd).length
}

/**
 * Quante ore hanno già un appello: fissano la durata dell'UD, perché l'appello
 * ha una casella per UD e tagli diversi sposterebbero le assenze.
 */
export function oreConAppello (lezioni: readonly Lezione[]): number {
  return lezioni.filter((lezione) => lezione.presenze.length > 0).length
}

// ------------------------------------------------------------------ presenze

/**
 * Lo stato di un allievo in una UD. Quel che non è stato detto resta non
 * detto: un appello dimenticato non deve sembrare una classe al completo.
 */
export function statoUd (presenza: Presenza | undefined, indice: number): StatoPresenza {
  return presenza?.stati[indice] ?? 'non-impostato'
}

/** Vero per le caselle su cui qualcuno si è pronunciato. */
export function deciso (stato: StatoPresenza): boolean {
  return stato !== 'non-impostato'
}

/** Vero per quel che nel registro si legge come un'irregolarità da guardare. */
export function segnato (stato: StatoPresenza): boolean {
  return stato !== 'non-impostato' && stato !== 'presente'
}

/**
 * Se una casella dell'appello vale come un'ora persa: **solo `assente`**.
 *
 * Il ritardo è una presenza: chi entra alla terza UD ha le prime due `assente`,
 * e contare anche la terza la toglierebbe due volte. I minuti di ritardo
 * restano sulla presenza e si contano a parte. L'esonero non conta per nessuno:
 * c'è un'autorizzazione dietro.
 *
 * Una funzione sola per quadro dell'allievo, riepilogo dell'ora e matrice del
 * corso, e quindi per percentuali, rapporti e soglia.
 */
export function contaComeAssenza (stato: StatoPresenza): boolean {
  return stato === 'assente'
}

/** Gli stati di un allievo portati alla lunghezza dell'ora: né corti né lunghi. */
export function statiAllineati (presenza: Presenza | undefined, quante: number): StatoPresenza[] {
  return Array.from({ length: quante }, (_, i) => statoUd(presenza, i))
}

/**
 * Un'ora riassunta in uno stato solo (blocco nel calendario, riga nell'albero,
 * diario). Vince il caso peggiore che non sia una scusa: assente, poi ritardo.
 * L'esonero esce solo se tutte le UD decise sono esonerate: un'UD esonerata
 * accanto a una presente si legge «presente» (lo fissa
 * `tests/domain/calculations.test.mjs`). Senza caselle decise resta non
 * impostata.
 */
export function statoDellOra (stati: StatoPresenza[]): StatoPresenza {
  const decisi = stati.filter(deciso)
  if (decisi.length === 0) return 'non-impostato'
  if (decisi.some((s) => s === 'assente')) return 'assente'
  if (decisi.some((s) => s === 'ritardo')) return 'ritardo'
  if (decisi.every((s) => s === 'esonerato')) return 'esonerato'
  return 'presente'
}

interface RiepilogoPresenze {
  /** Allievi con una riga d'appello. */
  totale: number
  /** Chi in aula c'è stato, almeno per una UD. */
  presenti: number
  /** Chi è mancato per tutte le UD su cui ci si è pronunciati. */
  assenti: number
  /** Chi ne ha persa una parte: entrato dopo, uscito prima, o tutti e due. */
  parziali: number
  ritardi: number
  esonerati: number
  /** Di quanti non si è ancora detto niente, per nessuna UD. */
  senzaAppello: number
  /** Le UD su cui ci si è pronunciati, e quelle in cui mancava. */
  udTotali: number
  udAssenza: number
  /** Le caselle ancora vuote: quel che resta da fare, non un risultato. */
  udSenzaAppello: number
  /** Quota di presenti su chi ha un appello, 0–1. Senza appello vale 1. */
  quotaPresenza: number
}

/**
 * I conti dell'appello su due piani: gli allievi («presenti 18 su 20») e le UD,
 * dove un'assenza pesa davvero. Le caselle non impostate si contano a parte:
 * sono lavoro da fare, non un fatto.
 */
export function riepilogaPresenze (presenze: Presenza[]): RiepilogoPresenze {
  let assenti = 0
  let parziali = 0
  let ritardi = 0
  let esonerati = 0
  let senzaAppello = 0
  let udTotali = 0
  let udAssenza = 0
  let udSenzaAppello = 0

  for (const presenza of presenze) {
    const decisi = presenza.stati.filter(deciso)
    udSenzaAppello += presenza.stati.length - decisi.length
    if (decisi.length === 0) {
      senzaAppello += 1
      continue
    }
    const mancate = decisi.filter(contaComeAssenza).length
    udTotali += decisi.length
    udAssenza += mancate
    if (mancate === decisi.length) assenti += 1
    else if (mancate > 0) parziali += 1
    if (decisi.some((s) => s === 'ritardo')) ritardi += 1
    if (decisi.every((s) => s === 'esonerato')) esonerati += 1
  }

  const totale = presenze.length
  const conAppello = totale - senzaAppello
  return {
    totale,
    presenti: conAppello - assenti,
    assenti,
    parziali,
    ritardi,
    esonerati,
    senzaAppello,
    udTotali,
    udAssenza,
    udSenzaAppello,
    quotaPresenza: conAppello === 0 ? 1 : (conAppello - assenti) / conAppello,
  }
}

// I conti per persona (UD perse, ritardi, assenze intere) stanno in
// `matriceCorso`: matrice a schermo, rapporto, CSV e segnalazioni leggono
// quella riga.

// ------------------------------------------------------------------ voti

/**
 * Un valore portato sul passo più vicino contato da `base`, e tenuto nella
 * scala. Il ritaglio al milionesimo toglie il residuo della virgola mobile
 * (3.8000000000000003). Si conta da `base` come la tendina (`votiDellaScala`):
 * con minimo 1 e passo 0,3 i voti sono 1; 1,3; 1,6…
 */
function sulPasso (valore: number, base: number, passo: number, min: number, max: number): number {
  const passi = Math.round((valore - base) / passo)
  const netto = Math.round((base + passi * passo) * 1e6) / 1e6
  return Math.min(max, Math.max(min, netto))
}

/** Porta il voto dentro la scala e sul passo previsto (di norma 0.25), contato dal minimo. */
export function arrotondaVoto (valore: number, scala: Scala): number {
  const passo = scala.passo > 0 ? scala.passo : 0.25
  const dentro = Math.min(scala.max, Math.max(scala.min, valore))
  return sulPasso(dentro, scala.min, passo, scala.min, scala.max)
}

/**
 * La nota di fine semestre: la media portata sul suo passo (di solito mezzi
 * punti, mentre i voti sono a quarti). Passo zero lascia la media com'è.
 */
export function notaFineSemestre (
  media: number | null,
  scala: Scala,
  passoFineSemestre: number,
): number | null {
  if (media === null || !Number.isFinite(media)) return null
  const dentro = Math.min(scala.max, Math.max(scala.min, media))
  if (!(passoFineSemestre > 0)) return dentro
  // Contata da zero, non dal minimo: la nota va sul mezzo punto intero.
  return sulPasso(dentro, 0, passoFineSemestre, scala.min, scala.max)
}

/** Un numero tenuto dentro due estremi. */
export function limita (valore: number, minimo: number, massimo: number): number {
  return Math.min(massimo, Math.max(minimo, valore))
}

/**
 * Una media al centesimo, arrotondata dove si calcola e non dove si stampa:
 * così un 3.995 non si legge «4» mentre il confronto con la sufficienza lo
 * tratta da insufficiente.
 */
export function arrotondaCentesimo (valore: number): number {
  return Math.round(valore * 100) / 100
}

export function votoValido (valore: number, scala: Scala): boolean {
  return Number.isFinite(valore) && valore >= scala.min && valore <= scala.max
}

/**
 * I voti che contano in una media: niente assenze né caselle vuote. Esportata
 * perché anche l'API conti gli stessi. Il tipo stretto evita `as number` a chi
 * legge il valore.
 */
export function votiEffettivi (voti: Voto[]): (Voto & { valore: number })[] {
  return voti.filter((v): v is Voto & { valore: number } =>
    !v.assente && typeof v.valore === 'number')
}

interface MediaPesata {
  /** Nulla quando non c'è nemmeno un voto: una media di zero voti non è zero. */
  media: number | null
  pesoTotale: number
  conteggio: number
}

/**
 * Media pesata dei voti di un allievo sui momenti dati. Un momento senza voto
 * per quell'allievo non entra nel conto e non abbassa la media.
 */
export function mediaAllievo (
  momenti: MomentoValutazione[],
  allievoId: string,
): MediaPesata {
  let somma = 0
  let peso = 0
  let conteggio = 0
  for (const momento of momenti) {
    const voto = momento.voti.find((v) => v.allievoId === allievoId)
    if (!voto || voto.assente || typeof voto.valore !== 'number') continue
    // Peso zero vuol dire «non fa media»: il voto c'è ma non entra nel conto.
    const p = momento.peso
    if (!(p > 0)) continue
    somma += voto.valore * p
    peso += p
    conteggio += 1
  }
  return {
    media: peso === 0 ? null : arrotondaCentesimo(somma / peso),
    pesoTotale: peso,
    conteggio,
  }
}

/** Media di un singolo momento sulla classe (le assenze non entrano). */
export function mediaMomento (momento: MomentoValutazione): number | null {
  const effettivi = votiEffettivi(momento.voti)
  if (effettivi.length === 0) return null
  return arrotondaCentesimo(
    effettivi.reduce((s, v) => s + v.valore, 0) / effettivi.length,
  )
}

interface DistribuzioneVoti {
  conteggio: number
  media: number | null
  minimo: number | null
  massimo: number | null
  sufficienti: number
  insufficienti: number
  /** Quota di sufficienti sui voti espressi, 0–1. */
  quotaSufficienti: number
  /** Voti raggruppati per fascia intera: la chiave è il voto troncato. */
  fasce: Record<number, number>
}

export function distribuzione (momento: MomentoValutazione): DistribuzioneVoti {
  const valori = votiEffettivi(momento.voti).map((v) => v.valore)
  const fasce: Record<number, number> = {}
  for (const valore of valori) {
    const fascia = Math.floor(valore)
    fasce[fascia] = (fasce[fascia] ?? 0) + 1
  }
  const sufficienti = valori.filter((v) => v >= momento.scala.sufficienza).length
  return {
    conteggio: valori.length,
    media:
      valori.length === 0
        ? null
        : arrotondaCentesimo(valori.reduce((s, v) => s + v, 0) / valori.length),
    minimo: valori.length === 0 ? null : Math.min(...valori),
    massimo: valori.length === 0 ? null : Math.max(...valori),
    sufficienti,
    insufficienti: valori.length - sufficienti,
    quotaSufficienti: valori.length === 0 ? 0 : sufficienti / valori.length,
    fasce,
  }
}

/**
 * La distribuzione dei voti di una prova, pronta da disegnare: un punto per
 * voto al suo valore esatto, impilato se si ripete (niente fasce: 3.75 e 3.00
 * sono diversi). Una sola funzione per PDF, pannello e schermo in aula.
 */
export function distribuzioneAPunti (momento: MomentoValutazione): Grafico {
  const conti = distribuzione(momento)
  const scala = momento.scala

  const quante = new Map<number, number>()
  for (const voto of votiEffettivi(momento.voti)) {
    quante.set(voto.valore, (quante.get(voto.valore) ?? 0) + 1)
  }

  // Tacche al mezzo punto, lineette al quarto senza numero. Si contano in
  // quarti interi, non sommando 0.25, per evitare 3.7500000000001.
  const tacche: number[] = []
  const tacchette: number[] = []
  const primoQuarto = Math.ceil(scala.min * 4)
  const ultimoQuarto = Math.floor(scala.max * 4)
  for (let q = primoQuarto; q <= ultimoQuarto; q += 1) {
    const valore = q / 4
    if (q % 2 === 0) tacche.push(valore)
    else tacchette.push(valore)
  }

  return {
    unita: testi().unitaGrafico(conti.conteggio),
    // L'asse è la scala della prova, non l'intervallo dei voti presenti.
    da: scala.min,
    a: scala.max,
    tacche,
    tacchette,
    soglia: scala.sufficienza,
    punti: [...quante.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([valore, quanti]) => ({ valore, quanti })),
    // Il segno della media. La sufficienza non ha una riga: la dice il colore
    // dei punti.
    segni:
      conti.media === null
        ? []
        : [{ valore: conti.media, etichetta: testi().mediaGrafico(formattaVoto(conti.media)) }],
  }
}

/**
 * I voti che una scala ammette, dal minimo al massimo, sul suo passo: le voci
 * della tendina (1–6 a quarti fa ventuno valori).
 */
export function votiDellaScala (scala: Scala): string[] {
  // Un passo storto (zero, negativo, più grande della scala) torna al mezzo
  // punto invece di produrre un elenco infinito.
  const passo = scala.passo > 0 && scala.passo <= scala.max - scala.min ? scala.passo : 0.5
  const quanti = Math.round((scala.max - scala.min) / passo)

  const voti: string[] = []
  for (let i = 0; i <= quanti; i += 1) {
    // Niente accumulatore: sommare il passo accumula l'errore della virgola mobile.
    voti.push(String(Math.round((scala.min + i * passo) * 100) / 100))
  }
  return voti
}

export function formattaVoto (valore: number | null): string {
  if (valore === null || !Number.isFinite(valore)) return '—'
  return valore.toFixed(2).replace(/\.?0+$/, '')
}

// ------------------------------------------------------------------ piani

/**
 * Come si chiama un piano: la lezione del corso per cui è fatto («Matematica
 * 3A · 12ª lezione»). Con più lezioni, la prima e quante altre; senza lezioni
 * è una bozza, e si dice il corso e quanto dura la scaletta.
 */
interface ContestoNomePiano {
  corso?: string | null
  lezioni?: Lezione[]
  /**
   * Il numero d'ordine di un'ora nel corso (`numeroDellaLezione` in
   * `courses.ts`), che riparte a ogni semestre. Una funzione perché la lezione
   * da numerare si sa solo dopo.
   */
  numeroDellaLezione?: (lezione: Lezione) => number | null
}

/**
 * Di quale lezione è un piano: «3ª lezione», o «bozza del 12.09». È la metà
 * del nome da mostrare dove il corso è già scritto. Mai l'argomento, che
 * cambia mentre si prepara e ripete fra piani.
 */
export function lezioneDelPiano (piano: PianoLezione, contesto: ContestoNomePiano = {}): string {
  const usi = (contesto.lezioni ?? [])
    .filter((l) => l.pianoId === piano.id)
    .sort((a, b) => a.data.localeCompare(b.data))

  const prima = usi[0]
  if (!prima) {
    // Una bozza si distingue dal giorno in cui è nata, l'unica data che non cambia.
    const nato = giornoDi(piano.creatoIl)
    return nato ? testi().bozzaDel(formattaData(nato)) : testi().bozza
  }

  // Il numero dell'ora e non la data: si ragiona «la dodicesima», e spostare
  // l'ora non cambia il piano. La data è il ripiego (ora annullata, fuori
  // dall'anno).
  const numero = contesto.numeroDellaLezione?.(prima) ?? null
  const quale = numero ? testi().ennesimaLezione(numero) : formattaData(prima.data)
  return quale + (usi.length > 1 ? ` +${usi.length - 1}` : '')
}

export function nomePiano (piano: PianoLezione, contesto: ContestoNomePiano = {}): string {
  const corso = contesto.corso?.trim() || corto(lessico().pianoLezione)
  return `${corso} · ${lezioneDelPiano(piano, contesto)}`
}

/**
 * Quanti minuti dura una tappa. La durata è salvata in UD (così un piano
 * riempie l'ora anche dove le UD durano cinquanta minuti) ma si scrive in
 * minuti; il cambio usa l'UD dell'ora vera, o quella delle impostazioni.
 */
export function minutiDiAttivita (durataUd: number, minutiPerUd: number): number {
  return Math.max(1, Math.round(durataUd * minutiPerUd))
}

/** Il contrario: i minuti scritti a mano tornano unità didattiche. */
export function udDaMinutiAttivita (minuti: number, minutiPerUd: number): number {
  return Math.max(1, minuti) / minutiPerUd
}

/** Somma delle durate delle attività di un piano, in unità didattiche. */
export function durataPiano (piano: PianoLezione): number {
  return piano.attivita.reduce((somma, a) => somma + (a.durataUd || 0), 0)
}

/**
 * Di quanti minuti la scaletta non torna con l'ora: negativo se resta tempo
 * scoperto, positivo se sfora. In minuti perché si legge, col cambio dell'ora
 * vera.
 */
export function minutiDiScarto (
  piano: PianoLezione,
  lezione: Lezione,
  minutiUd: number,
): number {
  const posata = scalettaSulleUd(piano.attivita, lezione, minutiUd)
  return Math.round(posata.scostamento * posata.minutiPerUd)
}

interface ScostamentoPiano {
  /** Quanto dura la scaletta, in UD. */
  durataPiano: number
  /** Quante UD ha l'ora. */
  udLezione: number
  /** Positivo se il piano dura più della lezione, in UD. */
  scostamento: number
  /**
   * Quante attività cominciano prima di un intervallo e finiscono dopo: l'unico
   * sforo che conta, fra UD attigue il tempo è continuo.
   */
  oltreLaPausa: number
}

/** Confronta la scaletta con il tempo davvero disponibile in aula. */
export function confrontaPianoConLezione (
  piano: PianoLezione,
  lezione: Lezione,
  minutiUd: number,
): ScostamentoPiano {
  const durata = durataPiano(piano)
  const disponibili = contaUd(lezione, minutiUd)
  const posata = scalettaSulleUd(piano.attivita, lezione, minutiUd)
  return {
    durataPiano: durata,
    udLezione: disponibili,
    scostamento: durata - disponibili,
    oltreLaPausa: posata.posti.filter((p) => p.oltreLaPausa).length,
  }
}

/**
 * Dove cade ogni attività della scaletta, UD per UD della lezione vera: in
 * quale comincia, e quel che non ci sta resta fuori, dichiarato. Si usano le UD
 * reali (l'ultima di uno slot può essere corta). Fra UD attigue il tempo è
 * continuo: solo un intervallo spezza un'attività.
 */
interface PostoInScaletta {
  attivita: Attivita
  /** L'indice della UD in cui comincia, o `null` se la lezione è già piena. */
  ud: number | null
  /** L'indice della UD in cui cade il suo ultimo minuto, o `null` se sfora l'ora. */
  udFine: number | null
  /**
   * Il gruppo di UD attaccate in cui comincia e quello in cui finisce: dentro un
   * gruppo il tempo è continuo. Differiscono solo se in mezzo c'è un intervallo.
   */
  blocco: number | null
  bloccoFine: number | null
  /** Minuti dall'inizio della lezione, pause escluse. */
  da: number
  a: number
  /**
   * L'ora dell'orologio d'inizio e fine, o `null` fuori dall'ora: le pause
   * contano, così l'orario è quello dell'aula.
   */
  oraInizio: Ora | null
  oraFine: Ora | null
  /** Vero se finisce in una UD diversa da quella in cui comincia. */
  aCavallo: boolean
  /** Vero se le due UD non sono attigue: in mezzo c'è una pausa. */
  oltreLaPausa: boolean
}

/** UD attaccate fra loro: un tratto di lezione senza intervalli dentro. */
interface BloccoUd {
  /** Indice della prima UD del blocco. */
  da: number
  /** Indice dell'ultima UD del blocco, inclusa. */
  a: number
  /** Quante UD attaccate lo compongono: `a - da + 1`, detto una volta sola. */
  ud: number
  inizio: Ora
  fine: Ora
  capienza: number
  occupati: number
  /** Minuti di pausa fra il blocco precedente e questo; zero per il primo. */
  pausaPrima: number
}

interface ScalettaSulleUd {
  posti: PostoInScaletta[]
  /**
   * Le UD della lezione, con quanti minuti di scaletta ciascuna ha addosso.
   * `attigua` è vera se è attaccata alla precedente, cioè se non apre un blocco.
   */
  ud: Array<{
    unita: UnitaDidattica
    capienza: number
    occupati: number
    attigua: boolean
    /** L'indice del blocco di UD attigue a cui appartiene. */
    blocco: number
  }>
  /** Le UD raggruppate per contiguità: dentro un blocco il tempo è continuo. */
  blocchi: BloccoUd[]
  minutiLezione: number
  /** Quante UD ha l'ora. */
  udLezione: number
  /**
   * Quanto vale un'UD in quest'ora: la media dell'ora, il cambio con cui la
   * scaletta in UD si posa su minuti veri.
   */
  minutiPerUd: number
  /** Quanto dura la scaletta, in UD. */
  durataPiano: number
  /** Quanto sfora in UD, o quanto resta libero se negativo. */
  scostamento: number
}

export function scalettaSulleUd (
  attivita: Attivita[],
  lezione: Lezione,
  minutiUd: number,
): ScalettaSulleUd {
  const unita = unitaDidattiche(lezione, minutiUd)
  const capienze = unita.map((u) => durataMinuti(u.inizio, u.fine))
  const occupati = capienze.map(() => 0)
  const minutiLezione = capienze.reduce((somma, c) => somma + c, 0)
  // Il cambio è la media dell'ora e non l'UD dichiarata: due UD di attività
  // riempiono esattamente un'ora da due UD, qualunque sia la loro durata.
  const minutiPerUd = unita.length > 0 ? minutiLezione / unita.length : minutiUd

  /** In quale UD cade il minuto `m` contato dall'inizio della lezione. */
  const udDelMinuto = (m: number): number | null => {
    let soglia = 0
    for (let i = 0; i < capienze.length; i += 1) {
      soglia += capienze[i]
      if (m < soglia) return i
    }
    return null
  }

  /** Quanti minuti di lezione sono passati prima dell'inizio della UD `i`. */
  const primaDellaUd = (i: number): number =>
    capienze.slice(0, i).reduce((somma, c) => somma + c, 0)

  /** L'ora dell'orologio del minuto di lezione `m`: le pause non si contano. */
  const oraDelMinuto = (m: number): Ora | null => {
    const dove = udDelMinuto(m)
    if (dove === null) return null
    return sommaMinuti(unita[dove].inizio, m - primaDellaUd(dove))
  }

  // Una UD apre un blocco nuovo solo se prima c'è una pausa.
  const bloccoDella: number[] = []
  let blocco = -1
  unita.forEach((u, i) => {
    if (i === 0 || u.dopoUnaPausa) blocco += 1
    bloccoDella[i] = blocco
  })

  let cursore = 0
  const posti = attivita.map((voce): PostoInScaletta => {
    const da = cursore
    // Almeno un minuto: un'attività lunga zero non si vedrebbe.
    const a = cursore + Math.max(1, Math.round(voce.durataUd * minutiPerUd))
    cursore = a
    const ud = udDelMinuto(da)
    // Conta l'ultimo minuto occupato, non il primo libero.
    const udFine = udDelMinuto(Math.max(da, a - 1))
    if (ud !== null) {
      for (let m = da; m < a; m += 1) {
        const dove = udDelMinuto(m)
        if (dove !== null) occupati[dove] += 1
      }
    }
    // Chi sfora la fine dell'ora è fuori, non a cavallo: lo dice lo scostamento.
    const aCavallo = ud !== null && udFine !== null && udFine !== ud
    // La fine è il minuto dopo l'ultimo occupato: chiude con la UD, non prima.
    const oraFine =
      udFine === null
        ? null
        : a <= da
          ? oraDelMinuto(da)
          : sommaMinuti(oraDelMinuto(a - 1) as Ora, 1)
    return {
      attivita: voce,
      ud,
      udFine,
      blocco: ud === null ? null : bloccoDella[ud],
      bloccoFine: udFine === null ? null : bloccoDella[udFine],
      da,
      a,
      oraInizio: oraDelMinuto(da),
      oraFine,
      aCavallo,
      oltreLaPausa: aCavallo && bloccoDella[ud] !== bloccoDella[udFine],
    }
  })

  const blocchi: BloccoUd[] = []
  unita.forEach((u, i) => {
    const quale = bloccoDella[i]
    const corrente = blocchi[quale]
    if (!corrente) {
      const precedente = blocchi[quale - 1]
      blocchi[quale] = {
        da: i,
        a: i,
        ud: 1,
        inizio: u.inizio,
        fine: u.fine,
        capienza: capienze[i],
        occupati: occupati[i],
        // L'intervallo: fra la fine del blocco prima e l'inizio di questo.
        pausaPrima: precedente ? durataMinuti(precedente.fine, u.inizio) : 0,
      }
      return
    }
    corrente.a = i
    corrente.ud += 1
    corrente.fine = u.fine
    corrente.capienza += capienze[i]
    corrente.occupati += occupati[i]
  })

  // Il totale in UD, l'unità della scaletta.
  const durataPiano = attivita.reduce((somma, v) => somma + (v.durataUd || 0), 0)
  return {
    posti,
    ud: unita.map((u, i) => ({
      unita: u,
      capienza: capienze[i],
      occupati: occupati[i],
      attigua: i > 0 && !u.dopoUnaPausa,
      blocco: bloccoDella[i],
    })),
    blocchi,
    minutiLezione,
    udLezione: unita.length,
    minutiPerUd,
    durataPiano,
    scostamento: durataPiano - unita.length,
  }
}

/** Quota di attività portate a termine, 0–1: quanto della scaletta è stato fatto. */
export function avanzamentoPiano (lezione: Lezione, piano: PianoLezione | null): number {
  if (!piano || piano.attivita.length === 0) return 0
  const svolte = piano.attivita.filter((a) => {
    const stato = lezione.avanzamento.find((v) => v.attivitaId === a.id)?.stato
    return stato === 'svolta'
  }).length
  return svolte / piano.attivita.length
}

// ------------------------------------------------------------------ selezioni

export function allieviAttivi (classe: Classe): Allievo[] {
  return classe.allievi.filter((a) => a.attivo)
}

/** Allievi in ordine di elenco: cognome, poi nome, con collazione italiana. */
export function ordinaAllievi (allievi: Allievo[]): Allievo[] {
  return [...allievi].sort(
    (a, b) => confrontaNomi(a.cognome, b.cognome) || confrontaNomi(a.nome, b.nome),
  )
}

/** Lezioni di un giorno, in ordine di orario. */
export function lezioniDelGiorno (lezioni: Lezione[], data: Iso): Lezione[] {
  return lezioni.filter((l) => l.data === data).sort(confrontaLezioni)
}

/**
 * La prossima lezione da adesso in poi, escluse le annullate: quella di oggi
 * che deve ancora cominciare o è in corso, altrimenti la prima dei giorni a
 * venire. Senza l'ora, «oggi» comprende anche le ore già finite.
 */
export function prossimaLezione (lezioni: Lezione[], da: Iso, ora?: Ora): Lezione | null {
  return (
    lezioni
      .filter((l) => l.data >= da && l.stato !== 'annullata')
      .filter((l) => !ora || momentoLezione(l, da, ora) !== 'passata')
      .sort(confrontaLezioni)[0] ?? null
  )
}

export function nomeCompleto (allievo: Allievo): string {
  return `${allievo.cognome} ${allievo.nome}`.trim()
}

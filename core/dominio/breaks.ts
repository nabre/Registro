// Le pause della giornata: dove cadono, e come ci si adatta un'ora di lezione.
//
// Una giornata è fatta di UD intere con le pause in mezzo, mai dentro un'UD.
// La scuola dichiara le pause in `Impostazioni.pause` (la prima con l'orario,
// le altre a quante UD dalla precedente); qui si calcolano:
//
// - la **griglia** delle partenze: prima della prima pausa all'indietro dal suo
//   inizio, dopo ogni pausa in avanti dalla sua fine;
// - la **disposizione** di una lezione nuova: UD in fila, e dove la prossima
//   non sta prima di una pausa si mette la pausa;
// - la **ridisposizione** di un'ora esistente a ogni gesto che ne tocca
//   l'orario (spostare, copiare, stirare, modulo): stesse UD, pause dove
//   cadono. Un'ora che non si muove non si riscrive; le fasce ancorate al
//   calendario ICS le detta l'evento.
//
// Tutto si conta sulla `Giornata` (pause e durata dell'UD) del documento.

import {
  slotOrdinati,
  slotSegnati,
  slotSpostati,
  slotStirati,
  slotStiratiAncorati,
} from './calculations.js'
import { durataMinuti, minutiDaOra, oraDaMinuti, udDaMinuti } from './dates.js'
import { creaLezione, creaSlot } from './factories.js'
import type { Giornata, Iso, Lezione, Ora, PauseGiornata, Slot } from './models.js'

/** Gli estremi dichiarabili, per normalizzazione, convalida e campi della pagina. */
export const LIMITI_PAUSE = {
  /** I minuti di una pausa: dal cambio d'aula al pranzo. */
  durata: { minimo: 1, massimo: 120 },
  /** Le UD fra una pausa e la successiva: almeno una, e non più di una giornata. */
  distanza: { minimo: 1, massimo: 12 },
  /** Quante pause in una giornata, la prima compresa. */
  quante: 8,
} as const

/** Mezzanotte: una lezione o una pausa deve finire prima. */
const MEZZANOTTE = 24 * 60

/** Una pausa sulla giornata, in minuti dalla mezzanotte. */
interface Intervallo {
  inizio: number
  fine: number
}

/** Le pause come intervalli, in ordine: la prima dall'orario, le altre contate da lei. */
function intervalli ({ pause, minutiUd }: Giornata): Intervallo[] {
  if (!pause) return []
  const inizio = minutiDaOra(pause.prima.inizio)
  const esito: Intervallo[] = [{ inizio, fine: inizio + pause.prima.durataMin }]
  for (const seguente of pause.seguenti) {
    const da = esito[esito.length - 1].fine + seguente.dopoUd * minutiUd
    esito.push({ inizio: da, fine: da + seguente.durataMin })
  }
  return esito
}

/** La pausa in cui cade un minuto della giornata, se ce n'è una. */
function pausaDi (minuto: number, lista: readonly Intervallo[]): Intervallo | undefined {
  return lista.find((p) => p.inizio <= minuto && minuto < p.fine)
}

/** Le pause con il loro orario, in ordine, come sull'orario in corridoio. */
export function pauseDellaGiornata (giornata: Giornata): Array<{ inizio: Ora, fine: Ora }> {
  return intervalli(giornata).map((p) => ({
    inizio: oraDaMinuti(p.inizio),
    fine: oraDaMinuti(p.fine),
  }))
}

/**
 * Le stesse pause, fin dove stanno nel giorno: una che finirebbe dopo
 * mezzanotte si porta via le successive (si contano da lei). Se non ci sta
 * nemmeno la prima, `undefined`, come senza pause.
 */
export function pauseDentroIlGiorno (
  pause: PauseGiornata,
  minutiUd: number,
): PauseGiornata | undefined {
  const lista = intervalli({ pause, minutiUd })
  const stanno = lista.findIndex((p) => p.fine >= MEZZANOTTE)
  if (stanno === 0) return undefined
  if (stanno < 0) return pause
  return { prima: pause.prima, seguenti: pause.seguenti.slice(0, stanno - 1) }
}

/** Tanti quante le pause ammesse (`LIMITI_PAUSE.quante`). */
const ORDINALI = ['prima', 'seconda', 'terza', 'quarta', 'quinta', 'sesta', 'settima', 'ottava']

/** Il numero ordinale di una pausa, per i messaggi: «la seconda pausa». */
export function ordinalePausa (indice: number): string {
  return ORDINALI[indice] ?? `${indice + 1}ª`
}

/**
 * I minuti in cui una lezione può cominciare con ogni UD intera fra le pause,
 * in ordine: all'indietro dalla prima pausa, poi in avanti dalla fine di ogni
 * pausa finché un'UD sta prima della successiva (o di mezzanotte).
 */
function partenze (lista: readonly Intervallo[], minutiUd: number): number[] {
  if (lista.length === 0) return []
  const punti: number[] = []
  for (let t = lista[0].inizio - minutiUd; t >= 0; t -= minutiUd) punti.push(t)
  lista.forEach((pausa, i) => {
    const limite = i + 1 < lista.length ? lista[i + 1].inizio : MEZZANOTTE - 1
    for (let t = pausa.fine; t + minutiUd <= limite; t += minutiUd) punti.push(t)
  })
  return punti.sort((a, b) => a - b)
}

/**
 * Le righe principali di una giornata con le pause, fra due minuti: le
 * partenze della griglia più l'inizio di ogni pausa. Sostituiscono le ore
 * piene, che con la ricreazione alle 9:30 non dicono niente. In minuti dalla
 * mezzanotte.
 */
export function lineeDellaGiornata (giornata: Giornata, da: number, a: number): number[] {
  const lista = intervalli(giornata)
  return [...new Set([...partenze(lista, giornata.minutiUd), ...lista.map((p) => p.inizio)])]
    .filter((minuto) => minuto >= da && minuto <= a)
    .sort((x, y) => x - y)
}

/**
 * L'inizio della griglia più vicino a quello dato (a pari distanza il più
 * presto): un clic alle 8:05 diventa 8:00 se la ricreazione è alle 9:30. Senza
 * pause l'ora resta com'è.
 */
export function inizioSullaGriglia (ora: Ora, giornata: Giornata): Ora {
  const punti = partenze(intervalli(giornata), giornata.minutiUd)
  if (punti.length === 0) return ora
  const minuto = minutiDaOra(ora)
  const vicino = punti.reduce((migliore, punto) =>
    Math.abs(punto - minuto) < Math.abs(migliore - minuto) ? punto : migliore)
  return oraDaMinuti(vicino)
}

/**
 * La fine più vicina in cui un'UD finisce intera (fine di un'UD della griglia,
 * o inizio di una pausa); a pari distanza la più presto. Senza pause l'ora
 * resta com'è.
 */
export function fineSullaGriglia (ora: Ora, giornata: Giornata): Ora {
  const punti = lineeDellaGiornata(giornata, 0, MEZZANOTTE - 1)
  if (punti.length === 0) return ora
  const minuto = minutiDaOra(ora)
  const vicino = punti.reduce((migliore, punto) =>
    Math.abs(punto - minuto) < Math.abs(migliore - minuto) ? punto : migliore)
  return oraDaMinuti(vicino)
}

/**
 * L'ora data, o la fine della pausa in cui cade: una lezione non comincia in
 * pausa. Serve anche alle fasce incatenate dell'orario del corso.
 */
export function oraFuoriDallePause (ora: Ora, giornata: Giornata): Ora {
  const dentro = pausaDi(minutiDaOra(ora), intervalli(giornata))
  return dentro ? oraDaMinuti(dentro.fine) : ora
}

/**
 * Le fasce di una lezione nuova: le UD in fila da `inizio`, con le pause della
 * giornata in mezzo.
 *
 * Dalla griglia (`inizioSullaGriglia`) la pausa coincide con quella della
 * scuola. Da un inizio sfasato la pausa comincia dove finisce l'ultima UD che
 * ci sta, e i minuti in mezzo contano come pausa: mai un'UD spezzata né un
 * buco fra fasce. La lezione non comincia né finisce con una pausa. `minuti`
 * si porta a UD intere; senza pause è lo slot unico.
 */
export function slotNellaGiornata (inizio: Ora, minuti: number, giornata: Giornata): Slot[] {
  const { minutiUd } = giornata
  const ud = udDaMinuti(minuti, minutiUd)
  const lista = intervalli(giornata)
  if (lista.length === 0) return [creaSlot(inizio, ud * minutiUd)]
  return tratti(minutiDaOra(inizio), ud, lista, minutiUd)
    .map((t) => creaSlot(oraDaMinuti(t.inizio), t.fine - t.inizio, t.tipo))
}

/** Un pezzo di un'ora disposta sulle pause, in minuti dalla mezzanotte. */
interface Tratto extends Intervallo {
  tipo: Slot['tipo']
}

/**
 * La disposizione di `slotNellaGiornata` in minuti, per sapere se l'ora esce
 * dal giorno senza passare da un orario che a mezzanotte riparte da zero.
 */
function tratti (
  inizio: number,
  ud: number,
  lista: readonly Intervallo[],
  minutiUd: number,
): Tratto[] {
  let cursore = pausaDi(inizio, lista)?.fine ?? inizio
  const esito: Tratto[] = []
  let restano = ud
  while (restano > 0) {
    // La prima pausa non ancora finita: il cursore non sta mai in pausa.
    const prossima = lista.find((p) => p.fine > cursore)
    const stanno = prossima ? Math.floor((prossima.inizio - cursore) / minutiUd) : restano
    const qui = Math.min(restano, stanno)
    if (qui > 0) {
      esito.push({ inizio: cursore, fine: cursore + qui * minutiUd, tipo: 'lezione' })
      cursore += qui * minutiUd
      restano -= qui
    }
    if (restano === 0 || !prossima) break
    if (esito.length > 0) esito.push({ inizio: cursore, fine: prossima.fine, tipo: 'pausa' })
    cursore = prossima.fine
  }
  return esito
}

/** Le UD di lezione contate nelle fasce, pause escluse: almeno una. */
function udDelleFasce (slot: readonly Slot[], minutiUd: number): number {
  const ud = slot
    .filter((s) => s.tipo === 'lezione')
    .reduce((somma, s) => somma + Math.round(durataMinuti(s.inizio, s.fine) / minutiUd), 0)
  return Math.max(1, ud)
}

/**
 * Le fasce di un'ora esistente, ridisposte sulle pause della giornata. Le UD
 * restano quante erano (l'appello è per UD); l'inizio è quello dato o
 * l'attuale, fuori dalle pause; le pause a mano lasciano il posto a quelle
 * della giornata. Senza pause, o con fasce ICS (`Slot.ics`, l'ora la detta
 * l'evento), è `slotSpostati`.
 *
 * L'inizio non si porta sulla griglia: lo fa chi chiama quando il gesto è
 * impreciso (`inizioSullaGriglia`).
 */
export function slotSullePause (slot: Slot[], giornata: Giornata, inizio?: Ora): Slot[] {
  const primo = slotOrdinati(slot)[0]
  if (!primo) return slot
  if (!giornata.pause || slot.some((s) => s.ics)) return inizio ? slotSpostati(slot, inizio) : slot
  const { minutiUd } = giornata
  const minuti = udDelleFasce(slot, minutiUd) * minutiUd
  return slotNellaGiornata(inizio ?? primo.inizio, minuti, giornata)
}

/**
 * Vero se un'UD dell'ora cade dentro una pausa della giornata. Il contatto
 * agli estremi non conta.
 */
export function invadeLePause (slot: readonly Slot[], giornata: Giornata): boolean {
  const lista = intervalli(giornata)
  return slot.some((s) => {
    if (s.tipo !== 'lezione') return false
    const da = minutiDaOra(s.inizio)
    const a = da + durataMinuti(s.inizio, s.fine)
    return lista.some((p) => da < p.fine && p.inizio < a)
  })
}

/**
 * Le fasce di un'ora, spezzate e spostate se invadono una pausa; lo stesso
 * array se non la invadono (così chi chiama sa se dirlo). Vale per ogni ora
 * scritta: un'UD non sta mai sopra la ricreazione. L'ora comincia dov'era e
 * tiene le sue UD (`slotSullePause`). Con fasce ICS si ridispongono solo le
 * fasce libere.
 */
export function slotFuoriDallePause (slot: Slot[], giornata: Giornata): Slot[] {
  if (!giornata.pause) return slot
  if (slot.some((s) => s.ics)) {
    // Ancorata al calendario ICS: l'evento resta dov'è, anche sopra una pausa;
    // si ridispongono solo le fasce libere, se invadono.
    if (!invadeLePause(slot.filter((s) => !s.ics), giornata)) return slot
    const { prima, dopo } = udLibere(slot, giornata.minutiUd)
    return ancorataSullePause(slot, prima, dopo, giornata) ?? slot
  }
  if (!invadeLePause(slot, giornata)) return slot
  return slotSullePause(slot, giornata)
}

/**
 * Le UD delle fasce libere di un'ora ancorata al calendario ICS: quelle prima
 * delle fasce dell'evento e quelle dopo.
 */
function udLibere (slot: readonly Slot[], minutiUd: number): { prima: number, dopo: number } {
  const ordinati = slotOrdinati([...slot])
  const primoIcs = ordinati.findIndex((s) => s.ics)
  const ultimoIcs = ordinati.length - 1 - [...ordinati].reverse().findIndex((s) => s.ics)
  const conta = (fasce: Slot[]) =>
    fasce
      .filter((s) => s.tipo === 'lezione' && !s.ics)
      .reduce((somma, s) => somma + Math.round(durataMinuti(s.inizio, s.fine) / minutiUd), 0)
  return { prima: conta(ordinati.slice(0, primoIcs)), dopo: conta(ordinati.slice(ultimoIcs + 1)) }
}

/**
 * Un'ora ancorata al calendario ICS con `primaUd` UD libere prima dell'evento
 * e `dopoUd` dopo, disposte sulle pause. L'evento non si muove: prima si conta
 * all'indietro dal suo inizio, dopo in avanti dalla sua fine, scavalcando le
 * pause. Una pausa fra UD libere ed evento diventa una fascia, così l'ora
 * resta senza buchi. `null` se l'ora uscirebbe dal giorno.
 */
function ancorataSullePause (
  slot: readonly Slot[],
  primaUd: number,
  dopoUd: number,
  giornata: Giornata,
): Slot[] | null {
  const lista = intervalli(giornata)
  const { minutiUd } = giornata
  const ordinati = slotOrdinati([...slot])
  const primoIcs = ordinati.findIndex((s) => s.ics)
  const ultimoIcs = ordinati.length - 1 - [...ordinati].reverse().findIndex((s) => s.ics)
  const evento = ordinati.slice(primoIcs, ultimoIcs + 1).map((s) => ({ ...s }))
  const da = minutiDaOra(evento[0].inizio)
  const ultimo = evento[evento.length - 1]
  const a = minutiDaOra(ultimo.inizio) + durataMinuti(ultimo.inizio, ultimo.fine)

  const primaDi: Tratto[] = []
  if (primaUd > 0) {
    const partenza = inizioAllIndietro(da, primaUd, lista, minutiUd)
    if (partenza < 0) return null
    primaDi.push(...tratti(partenza, primaUd, lista, minutiUd))
    const fine = primaDi[primaDi.length - 1].fine
    if (fine < da) primaDi.push({ inizio: fine, fine: da, tipo: 'pausa' })
  }

  const dopoDi: Tratto[] = []
  if (dopoUd > 0) {
    dopoDi.push(...tratti(a, dopoUd, lista, minutiUd))
    if (dopoDi[0].inizio > a) dopoDi.unshift({ inizio: a, fine: dopoDi[0].inizio, tipo: 'pausa' })
    if (dopoDi[dopoDi.length - 1].fine >= MEZZANOTTE) return null
  }

  const libere = (fasce: Tratto[]) =>
    fasce.map((t) => creaSlot(oraDaMinuti(t.inizio), t.fine - t.inizio, t.tipo))
  return [...libere(primaDi), ...evento, ...libere(dopoDi)]
}

/**
 * `slotStiratiAncorati` sulle pause: l'ora ancorata cresce o cala di `ud` UD
 * libere dal capo tirato, l'evento resta fermo. Un'UD che attraversa una pausa
 * la scavalca, e la pausa diventa una fascia. `null` sotto l'evento o fuori
 * dal giorno. Senza pause è `slotStiratiAncorati`.
 */
export function slotStiratiAncoratiSullePause (
  slot: Slot[],
  capo: 'inizio' | 'fine',
  ud: number,
  giornata: Giornata,
): Slot[] | null {
  if (!giornata.pause) return slotStiratiAncorati(slot, capo, ud, giornata.minutiUd)
  if (!Number.isInteger(ud)) return null
  if (ud === 0) return slot
  const segnati = slotSegnati(slot)
  if (segnati.length === 0) return null
  const { prima, dopo } = udLibere(segnati, giornata.minutiUd)
  const nuovaPrima = capo === 'inizio' ? prima + ud : prima
  const nuovaDopo = capo === 'fine' ? dopo + ud : dopo
  if (nuovaPrima < 0 || nuovaDopo < 0) return null
  return ancorataSullePause(segnati, nuovaPrima, nuovaDopo, giornata)
}

/**
 * L'inizio di un'ora allungata all'indietro di `ud` UD, scavalcando le pause.
 */
function inizioAllIndietro (
  inizio: number,
  ud: number,
  lista: readonly Intervallo[],
  minutiUd: number,
): number {
  let cursore = inizio
  for (let passo = 0; passo < ud; passo += 1) {
    const dentro = [...lista]
      .reverse()
      .find((p) => p.inizio < cursore && cursore - minutiUd < p.fine)
    cursore = (dentro ? dentro.inizio : cursore) - minutiUd
  }
  return cursore
}

/**
 * `slotStirati` sulle pause: l'ora cresce o cala di `ud` UD da un capo, e le
 * pause restano quelle della giornata. Dal bordo di sotto l'inizio resta e le
 * UD si aggiungono in coda; dal bordo di sopra la fine resta (in UD) e l'inizio
 * si sposta. `null` senza nemmeno un'UD o fuori dal giorno. Senza pause è
 * `slotStirati`.
 */
export function slotStiratiSullePause (
  slot: Slot[],
  capo: 'inizio' | 'fine',
  ud: number,
  giornata: Giornata,
): Slot[] | null {
  const { minutiUd } = giornata
  if (!giornata.pause) return slotStirati(slot, capo, ud, minutiUd)
  if (!Number.isInteger(ud)) return null
  if (ud === 0) return slot
  const primo = slotOrdinati(slot)[0]
  if (!primo) return null
  const prima = udDelleFasce(slot, minutiUd)
  const quante = prima + ud
  if (quante < 1) return null
  const lista = intervalli(giornata)

  let inizio: number | undefined = minutiDaOra(primo.inizio)
  if (capo === 'inizio' && ud > 0) inizio = inizioAllIndietro(inizio, ud, lista, minutiUd)
  if (capo === 'inizio' && ud < 0) {
    // La nuova comincia dove comincia l'UD numero `-ud` dell'ora attuale.
    const partenze = tratti(inizio, prima, lista, minutiUd)
      .filter((t) => t.tipo === 'lezione')
      .flatMap((t) =>
        Array.from({ length: (t.fine - t.inizio) / minutiUd }, (_, i) => t.inizio + i * minutiUd))
    inizio = partenze[-ud]
  }
  if (inizio === undefined || inizio < 0) return null
  const nuovi = tratti(inizio, quante, lista, minutiUd)
  if (nuovi[nuovi.length - 1].fine >= MEZZANOTTE) return null
  return nuovi.map((t) => creaSlot(oraDaMinuti(t.inizio), t.fine - t.inizio, t.tipo))
}

/** Dove finisce una lezione nuova di quei minuti che comincia a `inizio`, pause comprese. */
export function fineNellaGiornata (inizio: Ora, minuti: number, giornata: Giornata): Ora {
  const slot = slotNellaGiornata(inizio, minuti, giornata)
  return slot[slot.length - 1].fine
}

/**
 * Una lezione nuova con le fasce disposte sulle pause. L'inizio resta quello
 * dato, o dopo la pausa in cui cade; portarlo sulla griglia tocca a chi chiama
 * (modulo e calendario sì, orario del corso no).
 */
export function lezioneNellaGiornata (
  corsoId: string,
  data: Iso,
  inizio: Ora,
  minuti: number,
  giornata: Giornata,
): Lezione {
  const lezione = creaLezione(corsoId, data, inizio, minuti)
  lezione.slot = slotNellaGiornata(inizio, minuti, giornata)
  return lezione
}

/**
 * Le fasce di un'ora ridisegnate su un'UD di un'altra lunghezza, con le stesse
 * UD (si cambia la durata dell'UD prima che ci siano appelli). Ogni fascia
 * tiene le sue UD, le pause i minuti, in fila; poi l'ora si ridispone sulle
 * pause. `null` se uscirebbe dal giorno.
 */
export function slotSuAltraUd (
  slot: Slot[],
  vecchiaUd: number,
  giornata: Giornata,
): Slot[] | null {
  const ordinati = slotOrdinati(slot)
  const primo = ordinati[0]
  if (!primo) return slot
  let cursore = minutiDaOra(primo.inizio)
  const ridisegnati = ordinati.map((s) => {
    const minuti = durataMinuti(s.inizio, s.fine)
    const nuovi = s.tipo === 'lezione' ? udDaMinuti(minuti, vecchiaUd) * giornata.minutiUd : minuti
    const fascia = { ...s, inizio: oraDaMinuti(cursore), fine: oraDaMinuti(cursore + nuovi) }
    cursore += nuovi
    return fascia
  })
  if (cursore >= MEZZANOTTE) return null
  return slotFuoriDallePause(ridisegnati, giornata)
}

/** Un pezzo della giornata come la griglia la vede: un'UD, una pausa, o minuti che non fanno un'UD. */
interface TrattoDellaGiornata {
  tipo: 'ud' | 'pausa' | 'avanzo'
  inizio: Ora
  fine: Ora
}

/**
 * La giornata pezzo per pezzo: UD, pause e i minuti che non fanno un'UD. È il
 * disegno sotto i campi delle impostazioni, perché durata dell'UD, pause,
 * inizio e fine si capiscono solo insieme.
 */
export function scansioneDellaGiornata (
  giornata: Giornata,
  da: Ora,
  a: Ora,
): TrattoDellaGiornata[] {
  const { minutiUd } = giornata
  const lista = intervalli(giornata)
  const fine = minutiDaOra(a)
  const esito: TrattoDellaGiornata[] = []
  const metti = (tipo: TrattoDellaGiornata['tipo'], x: number, y: number) => {
    if (y > x) esito.push({ tipo, inizio: oraDaMinuti(x), fine: oraDaMinuti(y) })
  }
  let cursore = minutiDaOra(da)
  while (cursore < fine) {
    const prossima = lista.find((p) => p.fine > cursore)
    if (prossima && prossima.inizio <= cursore) {
      metti('pausa', cursore, Math.min(prossima.fine, fine))
      cursore = prossima.fine
      continue
    }
    const limite = prossima ? Math.min(prossima.inizio, fine) : fine
    while (cursore + minutiUd <= limite) {
      metti('ud', cursore, cursore + minutiUd)
      cursore += minutiUd
    }
    metti('avanzo', cursore, limite)
    cursore = limite
  }
  return esito
}

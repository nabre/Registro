// I conti del registro: durate, presenze, medie. Funzioni pure su dati già in
// memoria — nessuna lettura da disco, nessun `vscode`. È il motivo per cui
// questo file si può provare con `node --test` senza avviare l'editor.

import { MINUTI_UD, durataMinuti, formattaData, minutiDaOra, sommaMinuti } from './date.js'
import { STATI_PRESENZA } from './lessico.js'
import type { Grafico } from './rapporti.js'
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
} from './modelli.js'

// ------------------------------------------------------------------ orari

/** Gli slot in ordine di inizio. Non modifica l'originale. */
export function slotOrdinati (slot: Slot[]): Slot[] {
  return [...slot].sort((a, b) => a.inizio.localeCompare(b.inizio))
}

/**
 * Dove sta una lezione rispetto a questo momento.
 *
 * Il registro confrontava solo le date, e a mezzogiorno l'ora delle otto era
 * ancora «di oggi»: non finita, quindi non un buco, quindi invisibile fino al
 * giorno dopo. Ma alle dodici quell'ora è finita da un pezzo, e se l'appello non
 * c'è manca adesso — non domani. È la differenza che rende un cruscotto utile la
 * mattina invece che il giorno dopo.
 *
 * `in-corso` è l'ora che si sta facendo: dal primo minuto all'ultimo, pause
 * comprese, perché durante la pausa si è ancora in classe.
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
 * Gli stessi slot, spostati perché il primo cominci a un'altra ora.
 *
 * Si sposta tutto insieme, pause comprese, e le durate non cambiano: una
 * lezione trascinata un'ora più avanti nel calendario è la stessa lezione, non
 * una lezione riscritta. Serve al trascinamento della griglia e al comando che
 * sposta l'ora intera dall'editor degli slot.
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
 * Gli stessi slot, ognuno attaccato alla fine del precedente.
 *
 * L'ordine è quello dell'elenco — lo decide chi insegna, trascinando le righe —
 * e le durate non si toccano: cambia solo dove ciascuno comincia. Un buco fra
 * due slot non è un'informazione: o è una pausa, e allora è uno slot di tipo
 * `pausa` che si vede e si conta nei totali, o è un errore di battitura che fa
 * quadrare male i minuti. Dando un `inizio` si sposta l'ora intera, perché
 * spostato il primo slot gli altri lo seguono per costruzione.
 */
export function slotIncatenati (slot: Slot[], inizio?: Ora): Slot[] {
  let ora = inizio ?? slot[0]?.inizio
  if (ora === undefined) return []
  return slot.map((s) => {
    const attaccato = { ...s, inizio: ora as Ora, fine: sommaMinuti(ora as Ora, durataMinuti(s.inizio, s.fine)) }
    ora = attaccato.fine
    return attaccato
  })
}

/** Ora d'inizio della lezione: quella del primo slot. */
export function inizioLezione (lezione: Lezione): string | null {
  return slotOrdinati(lezione.slot)[0]?.inizio ?? null
}

/**
 * L'ordine in cui le lezioni si sfogliano: per giorno, e nel giorno per ora
 * d'inizio. Era scritto in cinque posti, ognuno a modo suo — e uno tornava
 * zero quando mancava l'ora, che è un comparatore su cui `sort` non può
 * contare.
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
    if (sovrapposti(ordinati[i], ordinati[i + 1])) {
      conflitti.push([ordinati[i], ordinati[i + 1]])
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
 * Una casella dell'appello: un'unità didattica dell'ora, con il suo orario.
 *
 * L'ora non è l'unità in cui si insegna né quella in cui si contano le
 * assenze: lo è l'UD, quarantacinque minuti. Un blocco di due ore ne fa
 * quattro, e nell'appello sono quattro colonne — chi arriva a metà è assente
 * per due e presente per due, e la differenza si vede.
 */
export interface UnitaDidattica {
  /** Posizione nell'ora, da zero: è l'indice con cui si legge `Presenza.stati`. */
  indice: number
  inizio: Ora
  fine: Ora
  /** Lo slot da cui viene: due UD dello stesso slot non hanno pause in mezzo. */
  slotId: string
  /** Vera per la prima UD di ogni slot dopo il primo: lì in mezzo c'è una pausa. */
  dopoUnaPausa: boolean
}

/**
 * Le unità didattiche di un'ora, in fila.
 *
 * Solo gli slot di lezione: durante la pausa non si fa appello. Uno slot dura
 * un multiplo di UD e si taglia in fette da quarantacinque minuti; se un dato
 * vecchio o scritto a mano non è un multiplo, l'ultima fetta è quel che
 * avanza — meglio una colonna corta che un'ora che sparisce dall'appello.
 */
export function unitaDidattiche (lezione: Lezione): UnitaDidattica[] {
  const esito: UnitaDidattica[] = []
  let primo = true
  for (const slot of slotOrdinati(lezione.slot)) {
    if (slot.tipo !== 'lezione') continue
    let resto = durataMinuti(slot.inizio, slot.fine)
    let inizio = slot.inizio
    let apre = !primo
    primo = false
    while (resto > 0) {
      const quanto = Math.min(MINUTI_UD, resto)
      const fine = sommaMinuti(inizio, quanto)
      esito.push({ indice: esito.length, inizio, fine, slotId: slot.id, dopoUnaPausa: apre })
      apre = false
      inizio = fine
      resto -= quanto
    }
  }
  return esito
}

/**
 * Come si segna una casella dell'appello, e come si chiama.
 *
 * Le parole e le sigle stanno nel lessico, insieme a tutte le altre parole del
 * registro; qui resta il nome con cui il dominio le chiede, perché la griglia
 * non è solo dell'interfaccia — il verbale stampato mostra la stessa griglia
 * con le stesse sigle, e chi rilegge un PDF accanto allo schermo deve vedere la
 * stessa cosa.
 */
export const SIGLE_PRESENZA: ReadonlyArray<{ valore: StatoPresenza, sigla: string, nome: string }> =
  STATI_PRESENZA

export function siglaPresenza (stato: StatoPresenza): string {
  return SIGLE_PRESENZA.find((v) => v.valore === stato)?.sigla ?? '-'
}

/** Quante unità didattiche conta un'ora: la lunghezza che deve avere l'appello. */
export function contaUd (lezione: Lezione): number {
  return unitaDidattiche(lezione).length
}

// ------------------------------------------------------------------ presenze

/**
 * Lo stato di un allievo in una UD. Quel che non è stato detto resta non detto:
 * leggerlo «presente» sarebbe mettere in bocca al registro una risposta che
 * nessuno ha dato, e un appello dimenticato non si distinguerebbe più da una
 * classe al completo.
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

/** Gli stati di un allievo portati alla lunghezza dell'ora: né corti né lunghi. */
export function statiAllineati (presenza: Presenza | undefined, quante: number): StatoPresenza[] {
  return Array.from({ length: quante }, (_, i) => statoUd(presenza, i))
}

/**
 * Come si riassume un'ora in uno stato solo, per chi ha spazio per uno solo —
 * il blocco nel calendario, la riga nell'albero, il diario dell'allievo.
 *
 * Vince il caso peggiore che non sia una scusa: assente batte ritardo, ritardo
 * batte esonero, e l'esonero batte la presenza perché è la ragione per cui
 * quell'ora non conta. Un'ora tutta presente resta presente, e un'ora su cui
 * non si è detto niente resta non impostata: le caselle mute non fanno numero
 * né in un senso né nell'altro.
 */
export function statoDellOra (stati: StatoPresenza[]): StatoPresenza {
  const decisi = stati.filter(deciso)
  if (decisi.length === 0) return 'non-impostato'
  if (decisi.some((s) => s === 'assente')) return 'assente'
  if (decisi.some((s) => s === 'ritardo')) return 'ritardo'
  if (decisi.every((s) => s === 'esonerato')) return 'esonerato'
  return 'presente'
}

export interface RiepilogoPresenze {
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
  /** Le UD su cui ci si è pronunciati, e quelle in cui l'allievo mancava. */
  udTotali: number
  udAssenza: number
  /** Le caselle ancora vuote: quel che resta da fare, non un risultato. */
  udSenzaAppello: number
  /** Quota di presenti su chi ha un appello, 0–1. Senza appello vale 1. */
  quotaPresenza: number
}

/**
 * I conti dell'appello, che si fanno su due piani.
 *
 * Gli allievi, per la riga «presenti 18 su 20» che si legge di sfuggita; e le
 * UD, perché è lì che un'assenza pesa davvero — mancare la prima ora di un
 * blocco di quattro non è mancare la giornata, e una somma di teste non sa
 * dirlo.
 *
 * Le caselle non impostate non entrano in nessuno dei due conti: si contano a
 * parte, perché sono lavoro da fare e non un fatto della giornata. Un appello
 * mai cominciato dà venti allievi e zero di tutto, che è la verità.
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
    const mancate = decisi.filter((s) => s === 'assente').length
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

export interface StatisticaAllievo {
  allievoId: string
  /** Lezioni svolte in cui l'allievo ha almeno una UD con l'appello fatto. */
  lezioni: number
  /** Unità didattiche di quelle lezioni: è su queste che si fanno le quote. */
  ud: number
  /** UD in cui c'era, esoneri compresi: l'esonero non è un'assenza. */
  presenze: number
  udAssenza: number
  /** Lezioni in cui è mancato del tutto, e quelle in cui ne ha persa una parte. */
  assenze: number
  assenzeParziali: number
  ritardi: number
  minutiRitardo: number
  /** Quota di UD perse sulle UD svolte, 0–1. */
  quotaAssenze: number
}

/**
 * Il quadro presenze di un allievo sulle lezioni in cui l'appello è stato
 * fatto: le annullate non sono colpa di nessuno, e le ore su cui non si è
 * detto niente non sono ancora successe. Non si guarda lo stato dichiarato —
 * è la cosa che si dimentica di aggiornare — ma le caselle: un appello fatto
 * è la prova che l'ora c'è stata.
 *
 * Si conta in unità didattiche, non in ore: è l'unità in cui la scuola misura
 * le assenze, ed è l'unica in cui due lezioni di lunghezza diversa si possono
 * sommare senza raccontare una bugia.
 */
export function statisticheAllievo (lezioni: Lezione[], allievoId: string): StatisticaAllievo {
  const svolte = lezioni.filter((l) => l.stato !== 'annullata')
  let ud = 0
  let presenze = 0
  let udAssenza = 0
  let assenze = 0
  let parziali = 0
  let ritardi = 0
  let minutiRitardo = 0
  let considerate = 0

  for (const lezione of svolte) {
    const voce = lezione.presenze.find((p) => p.allievoId === allievoId)
    if (!voce) continue
    const stati = statiAllineati(voce, Math.max(voce.stati.length, contaUd(lezione)))
    // Le UD non impostate non sono né presenze né assenze: un'ora di cui non
    // si è detto niente non deve muovere la percentuale in nessun verso.
    const decisi = stati.filter(deciso)
    if (decisi.length === 0) continue
    considerate += 1
    const mancate = decisi.filter((s) => s === 'assente').length
    ud += decisi.length
    udAssenza += mancate
    presenze += decisi.length - mancate
    if (mancate === decisi.length) assenze += 1
    else if (mancate > 0) parziali += 1
    if (decisi.some((s) => s === 'ritardo')) {
      ritardi += 1
      minutiRitardo += voce.minuti ?? 0
    }
  }

  return {
    allievoId,
    lezioni: considerate,
    ud,
    presenze,
    udAssenza,
    assenze,
    assenzeParziali: parziali,
    ritardi,
    minutiRitardo,
    quotaAssenze: ud === 0 ? 0 : udAssenza / ud,
  }
}

// ------------------------------------------------------------------ voti

/** Porta il voto dentro la scala e sul passo previsto (di norma 0.25). */
export function arrotondaVoto (valore: number, scala: Scala): number {
  const passo = scala.passo > 0 ? scala.passo : 0.25
  const dentro = Math.min(scala.max, Math.max(scala.min, valore))
  return Math.round(dentro / passo) * passo
}

/**
 * La nota di fine semestre: la media, portata sul suo passo.
 *
 * Non è l'arrotondamento dei voti: quello è la grana con cui si scrive una
 * prova, e vale mentre si corregge. Questo è la regola con cui una media
 * diventa la nota che va sulla pagella, e nelle scuole non è la stessa —
 * quarti durante l'anno, mezzi a fine semestre. Con passo zero la media resta
 * com'è: c'è chi la nota la scrive a mano guardando il numero esatto.
 */
export function notaFineSemestre (
  media: number | null,
  scala: Scala,
  passoFineSemestre: number,
): number | null {
  if (media === null || !Number.isFinite(media)) return null
  const dentro = Math.min(scala.max, Math.max(scala.min, media))
  if (!(passoFineSemestre > 0)) return dentro
  return Math.round(dentro / passoFineSemestre) * passoFineSemestre
}

/**
 * Una media al centesimo.
 *
 * La media si arrotonda dove si calcola, non dove si stampa: `formattaVoto`
 * ne mostrava due decimali e il numero vero ne aveva quindici, e i due non
 * dicevano sempre la stessa cosa — un 3.995 si leggeva «4» e veniva colorato
 * come un'insufficienza, perché il confronto con la sufficienza guardava il
 * numero lungo. Al centesimo ci si ferma perché è la grana con cui una media
 * si scrive e si discute: più cifre non le usa nessuno, e servono solo a far
 * discordare due schermate.
 */
export function arrotondaCentesimo (valore: number): number {
  return Math.round(valore * 100) / 100
}

export function votoValido (valore: number, scala: Scala): boolean {
  return Number.isFinite(valore) && valore >= scala.min && valore <= scala.max
}

/** I voti che contano in una media: niente assenze, niente caselle vuote. */
function votiEffettivi (voti: Voto[]): Voto[] {
  return voti.filter((v) => !v.assente && typeof v.valore === 'number')
}

export interface MediaPesata {
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
    // Peso zero vuol dire «non fa media»: la prova si è fatta, il voto c'è, e
    // non entra nel conto. Prima lo zero veniva letto come uno — una guardia
    // contro i dati storti — e una prova dichiarata senza peso finiva per
    // contare come tutte le altre.
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
    effettivi.reduce((s, v) => s + (v.valore as number), 0) / effettivi.length,
  )
}

export interface DistribuzioneVoti {
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
  const valori = votiEffettivi(momento.voti).map((v) => v.valore as number)
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
 * La distribuzione dei voti di una prova, pronta da disegnare.
 *
 * Un punto per voto, al suo valore esatto, impilato quando si ripete. Non
 * colonne per fascia: una classe è di dodici o venticinque voti, non di
 * cinquecento, e raggrupparli è una perdita che non compra niente — con le
 * fasce intere un 3.75 e un 3.00 diventano la stessa cosa, e la differenza fra
 * «quasi» e «lontano» è proprio quella che si guarda decidendo chi recupera.
 *
 * Sta qui e non accanto a chi disegna perché a disegnarla sono in tre — il
 * PDF, il pannello del registro e lo schermo per la classe — e prima erano tre
 * istogrammi scritti a mano. Restituendo una verifica il docente commenta sul
 * proiettore una forma, e riguardandola sul portatile ne trovava un'altra: non
 * un errore di calcolo, ma abbastanza per far dubitare del numero.
 */
export function distribuzioneAPunti (momento: MomentoValutazione): Grafico {
  const conti = distribuzione(momento)
  const scala = momento.scala

  const quante = new Map<number, number>()
  for (const voto of votiEffettivi(momento.voti)) {
    const valore = voto.valore as number
    quante.set(valore, (quante.get(valore) ?? 0) + 1)
  }

  // Le tacche sull'asse: il mezzo punto, che è la grana con cui i voti si
  // dicono. Fra una e l'altra passano le lineette del quarto, senza numero: il
  // quarto è il passo con cui i voti si mettono davvero, e sull'asse serve a
  // vedere dove cade un punto, non a rileggerne il voto — quello sta scritto
  // da un'altra parte. I valori si contano in quarti interi e non sommando
  // 0.25 in un accumulatore: il virgola mobile produrrebbe un 3.7500000000001
  // sotto l'asse.
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
    unita: `${conti.conteggio} ${conti.conteggio === 1 ? 'voto' : 'voti'} · un punto per allievo`,
    // L'asse è la scala della prova, non l'intervallo dei voti che ci sono:
    // una prova in cui nessuno è andato sotto il 4 non deve sembrare una prova
    // in cui il 4 era il minimo possibile.
    da: scala.min,
    a: scala.max,
    tacche,
    tacchette,
    soglia: scala.sufficienza,
    punti: [...quante.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([valore, quanti]) => ({ valore, quanti })),
    // Il segno che trasforma una fila di pallini in un giudizio: dove cade la
    // media. La sufficienza non ne ha uno suo — la dice il colore dei punti,
    // che è la prima cosa che di una distribuzione si guarda, e la sua riga
    // finiva per raddoppiare un'informazione già sul disegno.
    segni:
      conti.media === null
        ? []
        : [{ valore: conti.media, etichetta: `media ${formattaVoto(conti.media)}` }],
  }
}

/** Formattazione dei voti: due decimali, ma senza zeri inutili in coda. */
/**
 * I voti che una scala ammette, dal minimo al massimo, sul suo passo.
 *
 * Servono alla tendina: con la scala 1–6 a quarti sono ventuno valori, e
 * sceglierli da un elenco è più rapido — e più difficile da sbagliare — che
 * batterli. Il passo lo dice la scala della prova, non un'abitudine: chi
 * lavora a mezzi punti non deve vedere i quarti.
 */
export function votiDellaScala (scala: Scala): string[] {
  // Un passo storto — zero, negativo, più grande della scala — non deve
  // produrre un elenco infinito: si torna al mezzo punto, che è la grana con
  // cui quasi tutti mettono i voti.
  const passo = scala.passo > 0 && scala.passo <= scala.max - scala.min ? scala.passo : 0.5
  const quanti = Math.round((scala.max - scala.min) / passo)

  const voti: string[] = []
  for (let i = 0; i <= quanti; i += 1) {
    // Sommare il passo in un accumulatore accumula anche l'errore del
    // virgola mobile: 1.7500000000000002 non è un voto che qualcuno vuole
    // vedere in una tendina.
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
 * Come si chiama un piano: la lezione del corso per cui è fatto.
 *
 * Il piano non ha un titolo proprio, e non gli serve: nasce per un'ora precisa
 * di un corso preciso, e quello è il suo nome — «Matematica 3A · 15.09.2025».
 * Se le lezioni che lo usano sono più d'una (lo si è riassegnato, o copiato
 * addosso a due ore gemelle) si nomina dalla prima e si dice quante altre.
 * Finché non è appeso a nessuna lezione è una bozza, e allora si presenta per
 * quel che è: il corso, e quanto dura la scaletta.
 */
export function nomePiano (
  piano: PianoLezione,
  contesto: { corso?: string | null; lezioni?: Lezione[] } = {},
): string {
  const corso = contesto.corso?.trim() || 'Piano'
  const usi = (contesto.lezioni ?? [])
    .filter((l) => l.pianoId === piano.id)
    .sort((a, b) => a.data.localeCompare(b.data))
  const prima = usi[0]
  if (!prima) {
    return `${corso} · bozza · ${piano.attivita.length} attività`
  }
  return `${corso} · ${formattaData(prima.data)}` + (usi.length > 1 ? ` +${usi.length - 1}` : '')
}

/**
 * Quanti minuti dura una tappa.
 *
 * La durata si conserva in unità didattiche — così lo stesso piano riusato dove
 * le UD sono da cinquanta riempie comunque l'ora — ma dentro il piano lezione
 * si scrive e si legge in minuti: preparando una scaletta si ragiona «venti
 * minuti di esercizi», e chiedere «zero virgola quattro unità» sarebbe stato
 * chiedere una divisione a mente. La conversione usa l'unità dell'ora vera
 * quando c'è, e quella delle impostazioni quando il piano non è ancora su
 * nessuna ora.
 */
export function minutiDiAttivita (durataUd: number, minutiPerUd = MINUTI_UD): number {
  return Math.max(1, Math.round(durataUd * minutiPerUd))
}

/** Il contrario: i minuti scritti a mano tornano unità didattiche. */
export function udDaMinutiAttivita (minuti: number, minutiPerUd = MINUTI_UD): number {
  return Math.max(1, minuti) / (minutiPerUd > 0 ? minutiPerUd : MINUTI_UD)
}

/** Somma delle durate delle attività di un piano, in unità didattiche. */
export function durataPiano (piano: PianoLezione): number {
  return piano.attivita.reduce((somma, a) => somma + (a.durataUd || 0), 0)
}

export interface ScostamentoPiano {
  /** Quanto dura la scaletta, in UD. */
  durataPiano: number
  /** Quante UD ha l'ora. */
  udLezione: number
  /** Positivo se il piano dura più della lezione, in UD. */
  scostamento: number
  /**
   * Quante attività cominciano prima di un intervallo e finiscono dopo.
   *
   * Sforare da una UD a quella attigua non è sforare: le due si toccano, si
   * continua a parlare e nessuno se ne accorge. Attraversare la pausa sì —
   * l'attività si spezza davvero — ed è l'unico caso che vale un avviso.
   */
  oltreLaPausa: number
}

/** Confronta la scaletta con il tempo davvero disponibile in aula. */
export function confrontaPianoConLezione (
  piano: PianoLezione,
  lezione: Lezione,
): ScostamentoPiano {
  const durata = durataPiano(piano)
  const disponibili = contaUd(lezione)
  const posata = scalettaSulleUd(piano.attivita, lezione)
  return {
    durataPiano: durata,
    udLezione: disponibili,
    scostamento: durata - disponibili,
    oltreLaPausa: posata.posti.filter((p) => p.oltreLaPausa).length,
  }
}

/**
 * Dove cade ogni attività della scaletta, unità didattica per unità didattica.
 *
 * Un piano si scrive in minuti, ma si svolge dentro le UD di un'ora vera: la
 * domanda che ci si fa preparando è «l'esercizio da venti minuti sta ancora
 * nella prima UD o sfora nella seconda?», e a occhio non si risponde. Qui la
 * scaletta si posa sulle UD della lezione: ogni attività sa in quale comincia,
 * e quel che non ci sta più resta fuori, dichiarato invece che silenzioso.
 *
 * Le UD non sono tutte lunghe uguale — l'ultima di uno slot è quel che avanza —
 * e per questo si contano quelle vere della lezione e non multipli di 45.
 *
 * Due UD attigue — attaccate, senza pausa in mezzo — per chi insegna sono un
 * tempo solo: un esercizio che comincia al minuto 40 e finisce al 50 non si
 * interrompe, e segnalarlo sarebbe un allarme per nulla. Quel che spezza
 * davvero un'attività è l'intervallo, e solo quello si conta come sforo.
 */
export interface PostoInScaletta {
  attivita: Attivita
  /** L'indice della UD in cui comincia, o `null` se la lezione è già piena. */
  ud: number | null
  /** L'indice della UD in cui cade il suo ultimo minuto, o `null` se sfora l'ora. */
  udFine: number | null
  /**
   * Il gruppo di UD attaccate in cui comincia, e quello in cui finisce.
   *
   * È l'unità con cui si pianifica davvero: dentro un gruppo il tempo è
   * continuo e le UD sono una divisione dell'orologio, non della lezione — un
   * esercizio che ne occupa una e mezza è un esercizio, non due tronconi. I
   * due indici differiscono solo quando in mezzo c'è un intervallo.
   */
  blocco: number | null
  bloccoFine: number | null
  /** Minuti dall'inizio della lezione, pause escluse. */
  da: number
  a: number
  /**
   * L'ora dell'orologio in cui comincia e in cui finisce, o `null` fuori dall'ora.
   *
   * La scaletta si scrive in minuti di lezione, ma si svolge in minuti di
   * giornata: se in mezzo c'è un intervallo di quindici minuti, l'attività che
   * lo scavalca finisce un quarto d'ora più tardi di quanto dica la somma. Qui
   * le pause si contano, così l'orario scritto è quello dell'aula.
   */
  oraInizio: Ora | null
  oraFine: Ora | null
  /** Vero se finisce in una UD diversa da quella in cui comincia. */
  aCavallo: boolean
  /** Vero se le due UD non sono attigue: in mezzo c'è una pausa. */
  oltreLaPausa: boolean
}

/** UD attaccate fra loro: un tratto di lezione senza intervalli dentro. */
export interface BloccoUd {
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

export interface ScalettaSulleUd {
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
   * Quanto vale un'unità didattica in quest'ora.
   *
   * Non è una costante: le UD di una lezione non sono tutte lunghe uguale, e
   * la scuola accanto le fa da cinquanta. Qui è la media dell'ora, ed è il
   * cambio con cui la scaletta — scritta in UD — si posa su minuti veri.
   */
  minutiPerUd: number
  /** Quanto dura la scaletta, in UD. */
  durataPiano: number
  /** Quanto sfora in UD, o quanto resta libero se negativo. */
  scostamento: number
}

export function scalettaSulleUd (attivita: Attivita[], lezione: Lezione): ScalettaSulleUd {
  const unita = unitaDidattiche(lezione)
  const capienze = unita.map((u) => durataMinuti(u.inizio, u.fine))
  const occupati = capienze.map(() => 0)
  const minutiLezione = capienze.reduce((somma, c) => somma + c, 0)
  // Il cambio fra le UD della scaletta e i minuti dell'ora. Si prende la media
  // dell'ora e non i quarantacinque di listino: due UD di attività devono
  // riempire esattamente un'ora da due UD, anche dove durano cinquanta minuti
  // — altrimenti lo stesso piano, riusato altrove, lascerebbe scoperto un
  // pezzo di lezione senza dirlo.
  const minutiPerUd = unita.length > 0 ? minutiLezione / unita.length : MINUTI_UD

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

  // A quale blocco di UD attigue appartiene ciascuna UD: una UD apre un blocco
  // nuovo solo se prima di lei c'è una pausa.
  const bloccoDella: number[] = []
  let blocco = -1
  unita.forEach((u, i) => {
    if (i === 0 || u.dopoUnaPausa) blocco += 1
    bloccoDella[i] = blocco
  })

  let cursore = 0
  const posti = attivita.map((voce): PostoInScaletta => {
    const da = cursore
    // Almeno un minuto: un'attività esiste, e una lunga zero non si vedrebbe.
    const a = cursore + Math.max(1, Math.round(voce.durataUd * minutiPerUd))
    cursore = a
    const ud = udDelMinuto(da)
    // Un'attività lunga un minuto sta dove comincia: si guarda l'ultimo minuto
    // che occupa davvero, non il primo che non le appartiene più.
    const udFine = udDelMinuto(Math.max(da, a - 1))
    if (ud !== null) {
      for (let m = da; m < a; m += 1) {
        const dove = udDelMinuto(m)
        if (dove !== null) occupati[dove] += 1
      }
    }
    // Chi sfora la fine dell'ora non è a cavallo di due UD: è fuori, e lo dice
    // già lo scostamento. A cavallo si è solo fra due UD che esistono entrambe.
    const aCavallo = ud !== null && udFine !== null && udFine !== ud
    // La fine è l'orologio del minuto dopo l'ultimo occupato: un'attività che
    // chiude una UD finisce quando finisce la UD, non un minuto prima.
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
      oltreLaPausa: aCavallo && bloccoDella[ud as number] !== bloccoDella[udFine as number],
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
        // Quanto dura l'intervallo: il tempo fra la fine del blocco prima e
        // l'inizio di questo, che è poi quel che si legge sull'orologio.
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

  // Il totale torna in UD: è l'unità in cui la scaletta è scritta, e dirlo in
  // minuti costringerebbe chi legge a rifare la divisione a mente.
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
    (a, b) =>
      a.cognome.localeCompare(b.cognome, 'it') || a.nome.localeCompare(b.nome, 'it'),
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

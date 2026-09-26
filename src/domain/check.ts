// Il check: la lista di controllo di un corso, una casella per allievo e per
// colonna. La spunta dice anche quando: se data dentro un'ora segue il giorno
// di quell'ora, se data dalla pagina del check è il giorno scelto. Qui le sole
// regole; salvataggio e griglia le chiedono a queste funzioni.

import { allieviAttivi, ordinaAllievi } from './calculations.js'
import { isoValida } from './dates.js'
import { nuovoIdColonnaCheck } from './identifiers.js'
import type {
  Allievo,
  Check,
  ColonnaCheck,
  Iso,
  Istante,
  Registro,
  SpuntaCheck,
} from './models.js'

/** La lista del corso, se ne ha una. */
export function checkDelCorso (registro: Registro, corsoId: string): Check | null {
  return registro.check.find((c) => c.corsoId === corsoId) ?? null
}

/** La spunta di una casella, se la casella è spuntata. */
export function spuntaDelCheck (
  check: Check,
  allievoId: string,
  colonnaId: string,
): SpuntaCheck | null {
  return check.spunte.find((s) => s.allievoId === allievoId && s.colonnaId === colonnaId) ?? null
}

/**
 * Il giorno della spunta: se data dentro un'ora, il giorno attuale di
 * quell'ora; se l'ora non c'è più, il giorno salvato.
 */
export function dataSpunta (registro: Registro, spunta: SpuntaCheck): Iso {
  if (spunta.lezioneId) {
    const lezione = registro.lezioni.find((l) => l.id === spunta.lezioneId)
    if (lezione) return lezione.data
  }
  return spunta.data
}

/**
 * Le righe del check: chi frequenta, più i ritirati con qualcosa di spuntato
 * (le loro spunte restano visibili, ma senza righe vuote aperte per sempre).
 */
export function allieviDelCheck (registro: Registro, corsoId: string): Allievo[] {
  const corso = registro.corsi.find((c) => c.id === corsoId)
  const classe = corso ? registro.classi.find((c) => c.id === corso.classeId) : undefined
  if (!classe) return []
  const check = checkDelCorso(registro, corsoId)
  const conSpunte = new Set(check?.spunte.map((s) => s.allievoId) ?? [])
  const attivi = allieviAttivi(classe)
  const ritirati = classe.allievi.filter((a) => !a.attivo && conSpunte.has(a.id))
  return ordinaAllievi([...attivi, ...ritirati])
}

/**
 * Le colonne come vanno scritte: titolo ripulito, nessuna senza titolo,
 * nessun id ripetuto (due colonne si dividerebbero le spunte), un id per le
 * nuove.
 */
export function colonneRipulite (colonne: readonly ColonnaCheck[]): ColonnaCheck[] {
  const viste = new Set<string>()
  const esito: ColonnaCheck[] = []
  for (const colonna of colonne) {
    const titolo = colonna.titolo.trim()
    if (!titolo) continue
    const id = colonna.id && !viste.has(colonna.id) ? colonna.id : nuovoIdColonnaCheck()
    viste.add(id)
    esito.push({ id, titolo })
  }
  return esito
}

/**
 * Quante spunte si perdono passando a queste colonne, calcolate come farà
 * `applicaColonne`: da dire prima.
 */
export function spunteCheCadono (check: Check | null, colonne: readonly ColonnaCheck[]): number {
  if (!check) return 0
  const restano = new Set(colonne.map((c) => c.id))
  return check.spunte.filter((s) => !restano.has(s.colonnaId)).length
}

/** Scrive le colonne e toglie le spunte di quelle sparite. Vero se è cambiato qualcosa. */
export function applicaColonne (
  check: Check,
  colonne: readonly ColonnaCheck[],
  adesso: Istante,
): boolean {
  const nuove = colonneRipulite(colonne)
  const restano = new Set(nuove.map((c) => c.id))
  const spunte = check.spunte.filter((s) => restano.has(s.colonnaId))
  const uguali = JSON.stringify(nuove) === JSON.stringify(check.colonne) &&
    spunte.length === check.spunte.length
  if (uguali) return false
  check.colonne = nuove
  check.spunte = spunte
  check.aggiornatoIl = adesso
  return true
}

/** Che cosa si scrive nella casella: il quando, detto in uno dei due modi. */
interface QuandoSpunta {
  /** La lezione in cui si è spuntato, se si è spuntato dentro un'ora. */
  lezioneId: string | null
  /** Il giorno: quello della lezione, o quello scelto. */
  data: Iso
}

/**
 * Spunta la casella, o la toglie. Vero se è cambiato qualcosa. Una casella
 * già spuntata non si rispunta (doppio clic, altra ora): il giorno si cambia
 * con `applicaData`.
 */
export function applicaSpunta (
  check: Check,
  allievoId: string,
  colonnaId: string,
  quando: QuandoSpunta | null,
  adesso: Istante,
): boolean {
  const attuale = spuntaDelCheck(check, allievoId, colonnaId)
  if (!quando) {
    if (!attuale) return false
    check.spunte = check.spunte.filter((s) => s !== attuale)
    check.aggiornatoIl = adesso
    return true
  }
  if (attuale) return false
  // Una data storta non andrebbe in nessuna colonna della griglia. La regola
  // sta qui anche se lo schema della procedura la ferma già.
  if (!isoValida(quando.data)) return false
  check.spunte.push({
    allievoId, colonnaId, lezioneId: quando.lezioneId, data: quando.data, fattaIl: adesso,
  })
  check.aggiornatoIl = adesso
  return true
}

/**
 * Scrive il quando nella casella, spuntandola se serve. Vero se è cambiato
 * qualcosa. Lezione `null` vuol dire giorno scelto a mano; una lezione vuol
 * dire «segui l'ora». Corpo comune di `applicaData` e `applicaLezione`.
 */
export function applicaQuando (
  check: Check,
  allievoId: string,
  colonnaId: string,
  quando: QuandoSpunta,
  adesso: Istante,
): boolean {
  const attuale = spuntaDelCheck(check, allievoId, colonnaId)
  if (!attuale) {
    check.spunte.push({
      allievoId, colonnaId, lezioneId: quando.lezioneId, data: quando.data, fattaIl: adesso,
    })
  } else {
    if (attuale.lezioneId === quando.lezioneId && attuale.data === quando.data) return false
    attuale.lezioneId = quando.lezioneId
    attuale.data = quando.data
  }
  check.aggiornatoIl = adesso
  return true
}

/**
 * Il giorno scelto a mano: la casella resta spuntata, o lo diventa, e smette
 * di seguire una lezione. Vero se è cambiato qualcosa.
 */
export function applicaData (
  check: Check,
  allievoId: string,
  colonnaId: string,
  data: Iso,
  adesso: Istante,
): boolean {
  if (!isoValida(data)) return false
  return applicaQuando(check, allievoId, colonnaId, { lezioneId: null, data }, adesso)
}

/**
 * Lega la spunta a una lezione: da qui il suo giorno segue l'ora. Il contrario
 * di `applicaData`. Vero se è cambiato qualcosa.
 */
export function applicaLezione (
  check: Check,
  allievoId: string,
  colonnaId: string,
  lezione: { id: string; data: Iso },
  adesso: Istante,
): boolean {
  return applicaQuando(
    check, allievoId, colonnaId, { lezioneId: lezione.id, data: lezione.data }, adesso,
  )
}

/** Quanti hanno spuntato la colonna, fra quelli dati. */
export function fatteDellaColonna (
  check: Check,
  colonnaId: string,
  allievi: readonly Allievo[],
): number {
  const ids = new Set(allievi.map((a) => a.id))
  return check.spunte.filter((s) => s.colonnaId === colonnaId && ids.has(s.allievoId)).length
}

/** Una colonna vista da sopra: quanti l'hanno fatta, su quanti, e chi manca. */
interface RiepilogoColonna {
  colonna: ColonnaCheck
  /** Quanti fra chi frequenta l'hanno spuntata. */
  fatte: number
  /** Quanti frequentano: il denominatore di `fatte`. */
  totale: number
  /** Chi frequenta e non l'ha ancora spuntata, in ordine d'appello. */
  mancano: Allievo[]
}

/**
 * Il check del corso colonna per colonna, come la testata della griglia: fatte
 * su quanti frequentano, e chi manca. I conti stanno sugli attivi anche se la
 * griglia mostra i ritirati con spunte (se no «23 su 22», o colonne mai
 * complete).
 */
export function riepilogoDelCheck (registro: Registro, corsoId: string): RiepilogoColonna[] {
  const check = checkDelCorso(registro, corsoId)
  if (!check) return []
  const corso = registro.corsi.find((c) => c.id === corsoId)
  const classe = corso ? registro.classi.find((c) => c.id === corso.classeId) : undefined
  const attivi = classe ? ordinaAllievi(allieviAttivi(classe)) : []
  return check.colonne.map((colonna) => {
    const mancano = attivi.filter((a) => !spuntaDelCheck(check, a.id, colonna.id))
    return { colonna, fatte: attivi.length - mancano.length, totale: attivi.length, mancano }
  })
}

/** Una casella del check di una persona: la colonna, e se è fatta, quando. */
interface CasellaDellAllievo {
  colonna: ColonnaCheck
  spunta: SpuntaCheck | null
  /** Il giorno della spunta, come lo dice `dataSpunta`; null se è da fare. */
  data: Iso | null
}

/**
 * Il check di una persona in un corso, una voce per colonna. Vuoto se il
 * corso non ha check o colonne.
 */
export function checkDellAllievo (
  registro: Registro,
  corsoId: string,
  allievoId: string,
): CasellaDellAllievo[] {
  const check = checkDelCorso(registro, corsoId)
  if (!check) return []
  return check.colonne.map((colonna) => {
    const spunta = spuntaDelCheck(check, allievoId, colonna.id)
    return { colonna, spunta, data: spunta ? dataSpunta(registro, spunta) : null }
  })
}

/** Che cosa fa il clic sinistro su una casella: spuntarla, toglierla, o niente. */
type GestoDelClic = 'spunta' | 'togli' | null

/**
 * La regola del clic sinistro. Una casella vuota si spunta; una spuntata nel
 * giorno del contesto (oggi nella pagina, il giorno dell'ora dentro un'ora)
 * si toglie; una spuntata in un altro giorno non si tocca: si cambia dal tasto
 * destro.
 */
export function gestoDelClic (dataSpuntata: Iso | null, dataDelContesto: Iso): GestoDelClic {
  if (dataSpuntata === null) return 'spunta'
  return dataSpuntata === dataDelContesto ? 'togli' : null
}

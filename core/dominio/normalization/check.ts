// Le liste di controllo dal file, e la fusione di due liste dello stesso corso.

import { giornoDi, istanteAdesso, oggi } from '#core/dominio/dates.js'
import { nuovoIdCheck } from '#core/dominio/identifiers.js'
import type { Check, SpuntaCheck } from '#core/dominio/models.js'
import { colonneRipulite } from '#core/dominio/check.js'
import {
  testo,
  riferimento,
  unaData,
  elenco,
  oggetto,
} from './readers.js'


/**
 * Una casella spuntata dal file. Il giorno di riserva, se illeggibile, è quello
 * in cui la spunta è stata scritta.
 */
function normalizzaSpuntaCheck (grezzo: unknown): SpuntaCheck {
  const dati = oggetto(grezzo)
  const fattaIl = testo(dati.fattaIl, istanteAdesso())
  return {
    allievoId: testo(dati.allievoId),
    colonnaId: testo(dati.colonnaId),
    lezioneId: riferimento(dati.lezioneId),
    data: unaData(dati.data, giornoDi(fattaIl) ?? oggi()),
    fattaIl,
  }
}

/**
 * La lista di controllo dal file. Colonne ripulite come al salvataggio; spunte
 * solo con allievo e colonna esistente. Due spunte sulla stessa casella: vale
 * la prima, come dal pannello.
 */
export function normalizzaCheck (grezzo: unknown): Check {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()
  const colonne = colonneRipulite(
    elenco(dati.colonne).map((voce) => {
      const colonna = oggetto(voce)
      return { id: testo(colonna.id), titolo: testo(colonna.titolo) }
    }),
  )
  const esistenti = new Set(colonne.map((c) => c.id))
  const caselle = new Set<string>()
  const spunte: SpuntaCheck[] = []
  for (const spunta of elenco(dati.spunte).map(normalizzaSpuntaCheck)) {
    if (!spunta.allievoId || !esistenti.has(spunta.colonnaId)) continue
    const casella = `${spunta.allievoId} ${spunta.colonnaId}`
    if (caselle.has(casella)) continue
    caselle.add(casella)
    spunte.push(spunta)
  }
  return {
    id: testo(dati.id) || nuovoIdCheck(),
    corsoId: testo(dati.corsoId),
    colonne,
    spunte,
    creatoIl: testo(dati.creatoIl, ora),
    aggiornatoIl: testo(dati.aggiornatoIl, ora),
  }
}

/**
 * Versa una lista in un'altra senza perdere niente: colonne e spunte che non
 * ha. Colonne riconosciute per id, non per titolo: due «Quaderno» di corsi
 * diversi restano due.
 */
export function fondiCheck (dentro: Check, altro: Check): void {
  const colonne = new Set(dentro.colonne.map((c) => c.id))
  for (const colonna of altro.colonne) {
    if (colonne.has(colonna.id)) continue
    colonne.add(colonna.id)
    dentro.colonne.push({ ...colonna })
  }
  const caselle = new Set(dentro.spunte.map((s) => `${s.allievoId} ${s.colonnaId}`))
  for (const spunta of altro.spunte) {
    const casella = `${spunta.allievoId} ${spunta.colonnaId}`
    if (caselle.has(casella)) continue
    caselle.add(casella)
    dentro.spunte.push({ ...spunta })
  }
  if (altro.aggiornatoIl > dentro.aggiornatoIl) dentro.aggiornatoIl = altro.aggiornatoIl
}

/**
 * Una lista per corso: le doppie (file toccato a mano, due finestre) si
 * fondono nella prima, perché `checkDelCorso` ne vede una sola.
 */
export function unCheckPerCorso (elenco: Check[]): Check[] {
  const primi = new Map<string, Check>()
  const esito: Check[] = []
  for (const check of elenco) {
    const primo = check.corsoId ? primi.get(check.corsoId) : undefined
    if (primo) {
      fondiCheck(primo, check)
      continue
    }
    if (check.corsoId) primi.set(check.corsoId, check)
    esito.push(check)
  }
  return esito
}

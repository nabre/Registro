// Comando: regi chiama <procedura> [--campo valore]... [--json '{...}']
// Solo moduli `node:`.

import { inTutteLeLingue, testi } from '../testi.mjs'

export const SENZA_VALORE = Symbol('senza valore')
export class ErroreUso extends Error {}

const VERO = [...inTutteLeLingue('vero'), 'true', '1']
const FALSO = [...inTutteLeLingue('falso'), 'false', '0']

/**
 * Il testo di un'opzione diventa il valore del tipo dichiarato dallo schema,
 * mai indovinato: un campo di testo con cifre (telefono) resta testo.
 */
function converti (testoInput, forma, campo, t) {
  const tipi = Array.isArray(forma?.type) ? forma.type : [forma?.type]
  const ammette = (genere) => tipi.includes(genere)

  if (ammette('null') && testoInput.toLowerCase() === 'null') return null

  if (tipi.length > 2) return deduci(testoInput, ammette, campo, t)

  if (ammette('number') || ammette('integer')) {
    const numero = testoInput.trim() === '' ? Number.NaN : Number(testoInput)
    if (!Number.isFinite(numero)) {
      throw new ErroreUso(t.vuoleNumero(campo, testoInput))
    }
    return numero
  }
  if (ammette('boolean')) {
    const basso = testoInput.toLowerCase()
    if (VERO.includes(basso)) return true
    if (FALSO.includes(basso)) return false
    throw new ErroreUso(t.vuoleVeroFalso(campo, testoInput))
  }
  if (ammette('array')) {
    if (testoInput.trim() === '') return []
    if (testoInput.trimStart().startsWith('[')) {
      try {
        return JSON.parse(testoInput)
      } catch {
        throw new ErroreUso(t.nonÈElencoJson(campo, testoInput))
      }
    }
    return testoInput.split(',').map((voce) => converti(voce.trim(), forma.items ?? {}, campo, t))
  }
  if (ammette('object')) {
    try {
      return JSON.parse(testoInput)
    } catch {
      throw new ErroreUso(t.vuoleOggetto(campo, testoInput))
    }
  }
  return testoInput
}

function deduci (testoInput, ammette, campo, t) {
  const basso = testoInput.toLowerCase()
  if (ammette('boolean')) {
    if (VERO.includes(basso) && !/^\d+$/.test(basso)) return true
    if (FALSO.includes(basso) && !/^\d+$/.test(basso)) return false
  }
  if ((ammette('number') || ammette('integer')) && testoInput.trim() !== '') {
    const numero = Number(testoInput)
    if (Number.isFinite(numero) && (ammette('number') || Number.isInteger(numero))) return numero
  }
  const inizio = testoInput.trimStart()[0]
  if ((inizio === '{' && ammette('object')) || (inizio === '[' && ammette('array'))) {
    try {
      return JSON.parse(testoInput)
    } catch {
      throw new ErroreUso(t.nonÈJson(campo, testoInput))
    }
  }
  if (ammette('string')) return testoInput
  throw new ErroreUso(t.nonSaCheFarsene(campo, testoInput))
}

function componiIngresso (campi, corpo, schemaIngresso, scriviErrore) {
  const t = testi()
  const proprieta = schemaIngresso?.properties ?? {}
  const ingresso = {}

  for (const [campo, testoInput] of campi) {
    if (!Object.prototype.hasOwnProperty.call(proprieta, campo)) {
      throw new ErroreUso(t.nessunCampo(campo, Object.keys(proprieta)))
    }
    if (testoInput === SENZA_VALORE) {
      const tipi = [proprieta[campo]?.type].flat()
      if (!tipi.includes('boolean')) throw new ErroreUso(t.mancaValore(campo))
      ingresso[campo] = true
      continue
    }
    ingresso[campo] = converti(testoInput, proprieta[campo], campo, t)
  }

  if (corpo !== null) {
    let letto
    try {
      letto = JSON.parse(corpo)
    } catch {
      throw new ErroreUso(t.jsonNonValido)
    }
    if (typeof letto !== 'object' || letto === null || Array.isArray(letto)) {
      throw new ErroreUso(t.jsonNonOggetto)
    }
    for (const campo of Object.keys(letto)) {
      if (campi.has(campo)) {
        scriviErrore(t.vinceJson(campo))
      }
    }
    Object.assign(ingresso, letto)
  }

  return ingresso
}

export async function comandoChiama (condotto, nome, campi, corpo, grezzo, opzioni = {}) {
  const t = testi()
  // Prima lo schema, per convertire i valori delle opzioni nel tipo giusto.
  const ritratto = await condotto.chiedi('$schema', { procedura: nome })
  if (ritratto === null) return opzioni.muto()
  if (ritratto.error) {
    opzioni.raccontaGuasto(ritratto)
    if (ritratto.error.data?.codice !== 'non-permesso') {
      opzioni.scriviErrore(t.elencoCompleto(opzioni.COMANDO))
    }
    return opzioni.USCITA_RIFIUTO
  }

  const ingresso = componiIngresso(campi, corpo, ritratto.result.ingresso, opzioni.scriviErrore)

  const busta = await condotto.chiedi(nome, ingresso)
  if (busta === null) return opzioni.muto()
  if (busta.error) {
    opzioni.raccontaGuasto(busta)
    return opzioni.USCITA_RIFIUTO
  }
  if (grezzo) {
    opzioni.scriviDati(JSON.stringify(busta, null, 2))
    return 0
  }
  opzioni.scriviDati(JSON.stringify(busta.result.dati, null, 2))
  return 0
}

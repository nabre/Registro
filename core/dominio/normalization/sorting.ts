// Gli smistamenti dal file: i PDF da dividere fra gli allievi, con le pagine
// lette e i blocchi in quarantena.

import { istanteAdesso } from '#core/dominio/dates.js'
import { nomeDelFile, percorsoRelativo } from '#core/dominio/text.js'
import { nuovoIdSmistamento, nuovoIdBlocco } from '#core/dominio/identifiers.js'
import type {
  Divisione,
  TipoRapporto,
  RiquadroPagina,
  Smistamento,
  BloccoDaSmistare,
} from '#core/dominio/models.js'
import { TIPI_RAPPORTO } from '#core/dominio/models.js'
import {
  testo,
  riferimento,
  numero,
  unaVoce,
  elenco,
  oggetto,
} from './readers.js'


const MOTIVI_QUARANTENA = [
  // Anche `'a-mano'`, che `core/dominio/sorting.ts` produce per passo fisso e divisione a
  // mano: se no `unaVoce` lo degraderebbe a `'senza-nome'`.
  'a-mano',
  'senza-nome',
  'senza-testo',
  'ambiguo',
  'gia-consegnato',
  'fuori-elenco',
  'senza-consegna',
  'da-confermare',
] as const

const LETTURE = ['testo', 'ocr', 'niente'] as const

/**
 * Come il PDF è stato diviso, riletto dal disco: va conservato, se no al
 * riavvio si tornerebbe a `nomi`.
 */
function divisioneSana (valore: unknown): Divisione | undefined {
  if (!valore || typeof valore !== 'object') return undefined
  const modo = (valore as { modo?: unknown }).modo
  if (modo === 'nomi' || modo === 'mano') return { modo }
  if (modo === 'passo') {
    const pagine = Math.max(1, Math.round(numero((valore as { pagine?: unknown }).pagine, 1)))
    return { modo: 'passo', pagine }
  }
  return undefined
}

/**
 * Un blocco in quarantena, con le pagine in ordine e nel verso giusto: un
 * intervallo rovesciato sarebbe un taglio vuoto.
 */
function normalizzaBlocco (grezzo: unknown): BloccoDaSmistare {
  const dati = oggetto(grezzo)
  const da = Math.max(1, Math.round(numero(dati.da, 1)))
  const a = Math.max(da, Math.round(numero(dati.a, da)))
  return {
    id: testo(dati.id) || nuovoIdBlocco(),
    da,
    a,
    allievoId: riferimento(dati.allievoId),
    motivo: unaVoce(dati.motivo, MOTIVI_QUARANTENA, 'senza-nome'),
    estratto: testo(dati.estratto),
    fiducia: Math.min(1, Math.max(0, numero(dati.fiducia, 0))),
    lettura: unaVoce(dati.lettura, LETTURE, 'testo'),
    anteprima: percorsoRelativo(dati.anteprima) || undefined,
  }
}

/**
 * Il riquadro del nome letto, ristretto dentro il foglio (sono frazioni); se
 * non resta niente, nessun riquadro.
 */
function riquadroPagina (grezzo: unknown): RiquadroPagina | undefined {
  if (!grezzo || typeof grezzo !== 'object') return undefined
  const dato = oggetto(grezzo)
  const dentro = (valore: unknown) => Math.min(1, Math.max(0, numero(valore, 0)))
  const x = dentro(dato.x)
  const y = dentro(dato.y)
  const larghezza = Math.min(1 - x, dentro(dato.larghezza))
  const altezza = Math.min(1 - y, dentro(dato.altezza))
  if (larghezza <= 0 || altezza <= 0) return undefined
  return { x, y, larghezza, altezza }
}

/**
 * La casella di assenze in cui sono finite delle pagine. Senza periodo o
 * classe è `undefined`, e la fetta vale come archiviata in una consegna.
 */
function destinazioneAssenze (
  grezzo: unknown,
): { classeId: string, bloccoId: string, tipo: TipoRapporto, firmato: boolean } | undefined {
  if (!grezzo || typeof grezzo !== 'object') return undefined
  const dato = oggetto(grezzo)
  const classeId = testo(dato.classeId)
  const bloccoId = testo(dato.bloccoId)
  if (!classeId || !bloccoId) return undefined
  return {
    classeId,
    bloccoId,
    tipo: unaVoce(dato.tipo, TIPI_RAPPORTO, 'assenze'),
    firmato: dato.firmato === true,
  }
}

export function normalizzaSmistamento (grezzo: unknown): Smistamento {
  const dati = oggetto(grezzo)
  const file = percorsoRelativo(dati.file)
  return {
    id: testo(dati.id) || nuovoIdSmistamento(),
    consegnaId: riferimento(dati.consegnaId),
    classeId: riferimento(dati.classeId),
    file,
    nome: testo(dati.nome) || nomeDelFile(file),
    pagine: Math.max(0, Math.round(numero(dati.pagine, 0))),
    assegnate: elenco(dati.assegnate).map((voce) => {
      const dato = oggetto(voce)
      const da = Math.max(1, Math.round(numero(dato.da, 1)))
      return {
        allievoId: testo(dato.allievoId),
        consegnaId: testo(dato.consegnaId) || undefined,
        // Il foglio firme riguarda tutta la colonna: l'allievo resta vuoto.
        firme: dato.firme === true ? (true as const) : undefined,
        assenze: destinazioneAssenze(dato.assenze),
        da,
        a: Math.max(da, Math.round(numero(dato.a, da))),
      }
    }).filter((v) => v.allievoId || v.firme),
    letture: elenco(dati.letture)
      .map((voce) => {
        const dato = oggetto(voce)
        return {
          numero: Math.max(1, Math.round(numero(dato.numero, 1))),
          testo: testo(dato.testo),
          lettura: unaVoce(dato.lettura, LETTURE, 'niente'),
          anteprima: percorsoRelativo(dato.anteprima) || undefined,
          riquadroNome: riquadroPagina(dato.riquadroNome),
        }
      })
      .sort((x, y) => x.numero - y.numero),
    blocchi: elenco(dati.blocchi).map(normalizzaBlocco),
    divisione: divisioneSana(dati.divisione),
    errore: testo(dati.errore) || undefined,
    arrivatoIl: testo(dati.arrivatoIl, istanteAdesso()),
  }
}

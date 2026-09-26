// I fascicoli composti (pagina Documenti, «Combina»): farne uno, rifarlo, buttarlo.
// Due scritture: la ricetta nell'anno e il PDF sotto `esportazioni/`. La ricetta
// permette di rifare lo stesso fascicolo, stessi fogli e stesso ordine.

import { pdfDi, ricettaDi, type Composizione } from '../domain/compositions.js'
import { ESPORTAZIONI } from '../domain/locations.js'
import { contenutoDi, deposito } from '../data/store.js'
import { composizioniPresenti, ricettePresenti, type Ricetta } from '../data/compositions.js'
import { scriviGenerato } from '../data/exports.js'
import { unisciPdf } from '../data/pdf.js'
import { istanteAdesso } from '../domain/dates.js'
import { identificatore } from '../domain/identifiers.js'
import { conMessaggio, rifiuta, type EsitoAzione, type Parte } from './context.js'
import { testi as comuni } from './context.testi.js'
import { testi } from './compositions.testi.js'

/** Quanti fogli può tenere un fascicolo: oltre, non è più un fascicolo. */
const MASSIMO = 200

/**
 * Compone e scrive il PDF di un fascicolo. I fogli mancanti o illeggibili non lo
 * fermano, ma si contano per dirlo a chi ha premuto.
 */
async function scriviIlPdf (composizione: Composizione): Promise<Esito | { errore: string }> {
  const fogli: Uint8Array[] = []
  for (const percorso of composizione.percorsi) {
    const byte = await contenutoDi(percorso)
    if (byte) fogli.push(byte)
  }
  const mancanti = composizione.percorsi.length - fogli.length
  if (fogli.length === 0) return { errore: testi().nessunoNellaCartella }

  const { pdf, uniti, protetti } = await unisciPdf(fogli)
  if (uniti === 0) return { errore: testi().nessunoLeggibile }
  // Senza pulizia dei doppioni: «Schede (2).pdf» qui è un altro fascicolo.
  if (!(await scriviGenerato(pdfDi(composizione), pdf, [], { doppioni: false }))) {
    return { errore: testi().nonScritto }
  }
  return { scritti: uniti, mancanti, protetti, illeggibili: fogli.length - uniti - protetti }
}

/** Com'è finita una composizione; i motivi di esclusione separati, perché si rimediano in modo diverso. */
interface Esito {
  scritti: number
  mancanti: number
  protetti: number
  illeggibili: number
}

/** Mette la ricetta dentro l'anno; si chiama dopo aver scritto il PDF. */
function scriviLaRicetta (composizione: Composizione): boolean {
  const dove = deposito()
  if (!dove) return false
  return dove.scrivi(
    ricettaDi(composizione.id),
    new TextEncoder().encode(`${JSON.stringify(composizione, null, 2)}\n`),
  )
}

/** Com'è andata, detto a chi ha premuto. */
function racconta (composizione: Composizione, esito: Esito) {
  const t = testi()
  const fuori = esito.mancanti + esito.protetti + esito.illeggibili
  const motivi = [
    esito.mancanti > 0 && t.mancanti(esito.mancanti),
    esito.protetti > 0 && t.protetti(esito.protetti),
    esito.illeggibili > 0 && t.illeggibili(esito.illeggibili),
  ].filter((riga): riga is string => typeof riga === 'string')

  const testo =
    fuori === 0
      ? t.tuttiDentro(composizione.nome, esito.scritti)
      : t.qualcunoFuori(composizione.nome, esito.scritti, fuori, motivi)
  return conMessaggio(testo, fuori === 0 ? 'info' : 'avviso', {
    documento: pdfDi(composizione),
  })
}

export const composizioni = {
  /** Un fascicolo nuovo: la ricetta e il PDF, con i percorsi nell'ordine in cui arrivano. */
  'composizione.crea': async (_contesto, azione) => {
    const nome = azione.nome.trim()
    if (!nome) return rifiuta(testi().senzaNome)

    const percorsi = [
      ...new Set(
        azione.percorsi.filter(
          (p) => p.startsWith(`${ESPORTAZIONI}/`) && !p.includes('..') && p.endsWith('.pdf'),
        ),
      ),
    ]
    if (percorsi.length < 2) return rifiuta(testi().almenoDue)
    if (percorsi.length > MASSIMO) return rifiuta(testi().alMassimo(MASSIMO))

    if (!deposito()) return rifiuta(comuni().nessunAnno)

    const adesso = istanteAdesso()
    const composizione: Composizione = {
      id: identificatore('fas'),
      nome,
      percorsi,
      creataIl: adesso,
      aggiornataIl: adesso,
    }

    // Sul percorso e non sul nome: «Schede 1/2» e «Schede 1-2» fanno lo stesso file.
    const suo = pdfDi(composizione)
    const gia = composizioniPresenti().find((c) => pdfDi(c) === suo)
    if (gia) return rifiuta(testi().giaCe(gia.nome))

    const esito = await scriviIlPdf(composizione)
    if ('errore' in esito) return rifiuta(esito.errore)
    scriviLaRicetta(composizione)
    return racconta(composizione, esito)
  },

  /** Rifà il PDF di un fascicolo dalla ricetta, con i fogli come sono adesso. */
  'composizione.aggiorna': async (_contesto, azione) => {
    const composizione = composizioniPresenti().find((c) => c.id === azione.id)
    if (!composizione) return rifiuta(testi().nonCePiu)

    const esito = await scriviIlPdf(composizione)
    if ('errore' in esito) return rifiuta(esito.errore)
    const aggiornata = { ...composizione, aggiornataIl: istanteAdesso() }
    scriviLaRicetta(aggiornata)
    return racconta(aggiornata, esito)
  },

  /** Butta via un fascicolo: ricetta e PDF. I fogli sorgente restano. */
  'composizione.elimina': (_contesto, azione) => {
    const ricetta = ricettePresenti().find((r) => r.composizione.id === azione.id)
    if (!ricetta) return rifiuta(testi().nonCePiu)
    return buttaIlFascicolo(ricetta)
  },
} satisfies Parte

/**
 * Toglie l'elenco di una composizione (al percorso da cui è stato letto, non a
 * quello di `ricettaDi`) e il suo PDF, e dice com'è andata. L'elenco va per primo:
 * se il PDF resta, è un PDF «senza elenco» che il cestino può togliere; al
 * contrario resterebbe un elenco impossibile da buttare. Una delle due già
 * assente non è un errore, ma si dice.
 */
export function buttaIlFascicolo (ricetta: Ricetta): EsitoAzione {
  const dove = deposito()
  if (!dove) return rifiuta(comuni().nessunAnno)

  const t = testi()
  const { nome } = ricetta.composizione
  const elenco = dove.elimina(ricetta.percorso)
  const pdf = dove.elimina(pdfDi(ricetta.composizione))

  if (!elenco && !pdf) return rifiuta(t.nonTolta(nome))
  if (elenco && pdf) return conMessaggio(t.buttata(nome))
  return conMessaggio(elenco ? t.senzaPdf(nome) : t.elencoRimasto(nome), 'avviso')
}

/** Rifà i PDF di tutti i fascicoli: lo chiama «Aggiorna tutto». */
export async function aggiornaComposizioni (): Promise<number> {
  let fatti = 0
  for (const composizione of composizioniPresenti()) {
    const esito = await scriviIlPdf(composizione)
    if (!('errore' in esito)) fatti += 1
  }
  return fatti
}

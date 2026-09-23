// I fascicoli composti: farne uno, rifarlo, buttarlo via.
//
// Il gesto sta nella pagina Documenti — si spuntano le caselle dei fogli che si
// vogliono insieme, si preme «Combina», si dà un nome — e quel che succede qui
// è due scritture: la ricetta dentro l'anno e il PDF sotto `esportazioni/`.
//
// La ricetta è la ragione per cui questo non è `esportazione.unisci` e basta.
// Un fascicolo si consegna a fine semestre, ma le schede che ci stanno dentro
// cambiano fino all'ultimo giorno: rifarlo deve voler dire «le stesse
// venticinque, nello stesso ordine, com'erano stamattina», e senza un posto in
// cui quell'elenco resti scritto vorrebbe dire rispuntare venticinque caselle.

import { pdfDi, ricettaDi, type Composizione } from '../domain/compositions.js'
import { ESPORTAZIONI } from '../domain/locations.js'
import { contenutoDi, deposito } from '../data/store.js'
import { composizioniPresenti, ricettePresenti, type Ricetta } from '../data/compositions.js'
import { scriviGenerato } from '../data/exports.js'
import { unisciPdf } from '../data/pdf.js'
import { istanteAdesso } from '../domain/dates.js'
import { identificatore } from '../domain/identifiers.js'
import { conMessaggio, rifiuta, type EsitoAzione, type Parte } from './context.js'

/** Quanti fogli può tenere un fascicolo: oltre, non è più un fascicolo. */
const MASSIMO = 200

/**
 * Compone il PDF di un fascicolo e lo scrive al posto suo.
 *
 * Torna quanti fogli ci sono finiti davvero: quelli che non ci sono più — una
 * scheda buttata via, un rapporto datato rifatto con un nome nuovo — e quelli
 * che non si sono lasciati leggere non fermano il fascicolo, ma chi ha premuto
 * deve saperlo, perché un fascicolo di ventitré schede su venticinque si
 * consegna per sbaglio.
 */
async function scriviIlPdf (composizione: Composizione): Promise<Esito | { errore: string }> {
  const fogli: Uint8Array[] = []
  for (const percorso of composizione.percorsi) {
    const byte = await contenutoDi(percorso)
    if (byte) fogli.push(byte)
  }
  const mancanti = composizione.percorsi.length - fogli.length
  if (fogli.length === 0) {
    return { errore: 'Nessuno di quei documenti è più nella cartella: prima si rifanno.' }
  }

  const { pdf, uniti, protetti } = await unisciPdf(fogli)
  if (uniti === 0) return { errore: 'Nessuno di quei PDF si è lasciato leggere.' }
  // Senza la pulizia dei doppioni numerati: qui «Schede (2).pdf» non è la
  // stampa di prima di «Schede.pdf», è il fascicolo che qualcuno ha chiamato
  // così, e ha una ricetta sua.
  if (!(await scriviGenerato(pdfDi(composizione), pdf, [], { doppioni: false }))) {
    return { errore: 'Il fascicolo non si è potuto scrivere.' }
  }
  return { scritti: uniti, mancanti, protetti, illeggibili: fogli.length - uniti - protetti }
}

/**
 * Com'è finita una composizione, contando anche chi è rimasto fuori e perché.
 *
 * I tre motivi stanno separati perché portano a tre gesti diversi: un foglio
 * che non c'è più si rifà, uno protetto da password non entrerà mai, uno
 * illeggibile è un file rotto da rifare. «Tre rimasti fuori» e basta non dice a
 * nessuno che cosa fare.
 */
interface Esito {
  scritti: number
  mancanti: number
  protetti: number
  illeggibili: number
}

/**
 * Mette la ricetta dentro l'anno.
 *
 * Si chiama dopo aver scritto il PDF, e a quel punto l'anno c'è per forza — il
 * PDF è appena passato dallo stesso deposito. Un anno chiuso in mezzo ai due
 * gesti lascerebbe un PDF senza ricetta, che è la stessa cosa di un PDF
 * composto a mano: si guarda e si butta via.
 */
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
  const fuori = esito.mancanti + esito.protetti + esito.illeggibili
  const motivi = [
    esito.mancanti > 0 && `${esito.mancanti} non erano più nella cartella`,
    esito.protetti > 0 && `${esito.protetti} protetti da password`,
    esito.illeggibili > 0 && `${esito.illeggibili} non si sono lasciati leggere`,
  ].filter((riga): riga is string => typeof riga === 'string')

  const testo =
    fuori === 0
      ? `«${composizione.nome}»: ${esito.scritti} documenti in un PDF solo.`
      : `«${composizione.nome}»: ${esito.scritti} documenti; ${fuori} rimasti fuori — ` +
        `${motivi.join(', ')}.`
  return conMessaggio(testo, fuori === 0 ? 'info' : 'avviso', {
    documento: pdfDi(composizione),
  })
}

export const composizioni = {
  /**
   * Un fascicolo nuovo: la ricetta e il suo PDF.
   *
   * L'ordine dei percorsi è quello in cui arrivano — cioè quello in cui la
   * pagina li elenca — e resta scritto nella ricetta: un fascicolo con le
   * schede in ordine diverso è un altro fascicolo.
   */
  'composizione.crea': async (_contesto, azione) => {
    const nome = azione.nome.trim()
    if (!nome) return rifiuta('Dai un nome alla composizione: è il nome del file che ne esce.')

    const percorsi = [
      ...new Set(
        azione.percorsi.filter(
          (p) => p.startsWith(`${ESPORTAZIONI}/`) && !p.includes('..') && p.endsWith('.pdf'),
        ),
      ),
    ]
    if (percorsi.length < 2) return rifiuta('Servono almeno due documenti da combinare.')
    if (percorsi.length > MASSIMO) return rifiuta(`Una composizione tiene al massimo ${MASSIMO} fogli.`)

    if (!deposito()) return rifiuta('Nessun anno aperto.')

    const adesso = istanteAdesso()
    const composizione: Composizione = {
      id: identificatore('fas'),
      nome,
      percorsi,
      creataIl: adesso,
      aggiornataIl: adesso,
    }

    // Il confronto è sul percorso e non sul nome: due nomi diversi che il
    // filesystem non sa distinguere — «Schede 1/2» e «Schede 1-2» — scrivono lo
    // stesso file, e il secondo coprirebbe il primo senza dirlo.
    const suo = pdfDi(composizione)
    const gia = composizioniPresenti().find((c) => pdfDi(c) === suo)
    if (gia) return rifiuta(`C’è già una composizione che si chiama «${gia.nome}».`)

    const esito = await scriviIlPdf(composizione)
    if ('errore' in esito) return rifiuta(esito.errore)
    scriviLaRicetta(composizione)
    return racconta(composizione, esito)
  },

  /**
   * Rifà il PDF di un fascicolo con i fogli che stanno nella cartella adesso.
   *
   * È il motivo per cui la ricetta esiste: le schede cambiano fino all'ultimo
   * giorno, e «aggiorna» deve voler dire le stesse venticinque, nello stesso
   * ordine, com'erano stamattina.
   */
  'composizione.aggiorna': async (_contesto, azione) => {
    const composizione = composizioniPresenti().find((c) => c.id === azione.id)
    if (!composizione) return rifiuta('Quella composizione non c’è più.')

    const esito = await scriviIlPdf(composizione)
    if ('errore' in esito) return rifiuta(esito.errore)
    const aggiornata = { ...composizione, aggiornataIl: istanteAdesso() }
    scriviLaRicetta(aggiornata)
    return racconta(aggiornata, esito)
  },

  /**
   * Butta via un fascicolo: la ricetta e il PDF.
   *
   * Tutti e due, perché senza la ricetta il PDF è un file che nessuno sa più
   * rifare — e i fogli che c'erano dentro restano dove sono sempre stati, nella
   * cartella, uno per uno.
   */
  'composizione.elimina': (_contesto, azione) => {
    const ricetta = ricettePresenti().find((r) => r.composizione.id === azione.id)
    if (!ricetta) return rifiuta('Quella composizione non c’è più.')
    return buttaIlFascicolo(ricetta)
  },
} satisfies Parte

/**
 * Toglie dall'anno l'elenco di una composizione e il suo PDF, e dice com'è
 * andata davvero.
 *
 * L'elenco si toglie al percorso da cui è stato letto e non a quello che
 * `ricettaDi` comporrebbe adesso: un file scritto da una versione di prima, o
 * rinominato a mano, resterebbe lì a far ricomparire una composizione appena
 * buttata via — e il secondo tentativo darebbe di nuovo «fatto».
 *
 * **L'elenco per primo, e il PDF dopo.** I due gesti possono riuscire uno sì e
 * uno no, e l'ordine decide che cosa resta quando succede. Tolto l'elenco, quel
 * che rimane è un PDF come un altro: sta in `esportazioni/composizioni/`, il
 * riquadro lo mostra fra i «senza elenco» e il cestino se lo porta via.
 * Nell'ordine contrario resterebbe in elenco una composizione senza PDF, e ogni
 * nuovo tentativo di buttarla via troverebbe l'elenco ancora lì: il gesto non
 * arriverebbe mai in fondo, per quante volte lo si ripeta.
 *
 * Che una delle due cose non ci fosse già più non è un errore: un PDF si può
 * aver tolto a mano dalla cartella, e l'elenco rimasto è proprio quel che si sta
 * togliendo. Si dice, però, perché chi ha premuto se ne aspettava due.
 */
export function buttaIlFascicolo (ricetta: Ricetta): EsitoAzione {
  const dove = deposito()
  if (!dove) return rifiuta('Nessun anno aperto.')

  const { nome } = ricetta.composizione
  const elenco = dove.elimina(ricetta.percorso)
  const pdf = dove.elimina(pdfDi(ricetta.composizione))

  if (!elenco && !pdf) return rifiuta(`«${nome}» non si è potuto togliere dall’anno.`)
  if (elenco && pdf) return conMessaggio(`Composizione «${nome}» buttata via.`)
  return elenco
    ? conMessaggio(
        `Composizione «${nome}» tolta dall’elenco: il suo PDF non era più nella cartella.`,
        'avviso',
      )
    : conMessaggio(
        `Il PDF di «${nome}» è andato via, ma il suo elenco è rimasto nell’anno.`,
        'avviso',
      )
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

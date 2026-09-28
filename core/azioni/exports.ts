// I documenti già esportati: guardarli, aprirli col sistema, buttarli via.
// Non toccano il registro, per questo non stanno fra i rapporti. Ogni percorso
// fuori da `esportazioni/` si rifiuta: altrove ci sono file che non si rifanno.

import * as apparato from 'apparato'

import { ESPORTAZIONI } from '../dominio/locations.js'
import { fraIFascicoli, pdfDi } from '../dominio/compositions.js'
import { ricettePresenti } from '../dati/compositions.js'
import { deposito, percorsoVero } from '../dati/store.js'
import { apriConIlSistema } from '../dati/opening.js'
import { buttaIlFascicolo } from './compositions.js'
import { conMessaggio, rifiuta, type Parte } from './context.js'
import { testi as comuni } from './context.testi.js'
import { testi } from './exports.testi.js'


/** Vero se il percorso sta fra le esportazioni, i soli file che si possono rifare. */
function fraLeEsportazioni (percorso: string): boolean {
  if (!percorso.startsWith(`${ESPORTAZIONI}/`)) return false
  // Risale solo un segmento `..` (o `.`): «Verifica... finale.pdf» è un nome.
  return !percorso.split(/[\\/]/).some((segmento) => segmento === '..' || segmento === '.')
}


export const esportazioni = {
  'esportazione.apri': async (_contesto, azione) => {
    const t = testi()
    if (!fraLeEsportazioni(azione.percorso)) return rifiuta(t.nonEsportato)
    // Sta dentro il documento dell'anno: se ne materializza una copia e si apre quella.
    const file = await percorsoVero(azione.percorso)
    if (!file) return rifiuta(t.sparitoSiRifa)
    if (!(await apriConIlSistema(file))) return rifiuta(t.nonApribile)
    return { ok: true, invariato: true }
  },

  'esportazione.mostra': async (_contesto, azione) => {
    const t = testi()
    if (!fraLeEsportazioni(azione.percorso)) return rifiuta(t.nonEsportato)
    // Anche il lettore interno (`registro://`) legge la copia materializzata.
    const file = await percorsoVero(azione.percorso)
    if (!file) return rifiuta(t.sparitoSiRifa)
    const nome = azione.percorso.split('/').pop() ?? t.documento
    await apparato.comandi.esegui(
      'registroDocenti.mostraDocumento',
      file.fsPath,
      azione.titolo ?? nome,
    )
    return { ok: true, invariato: true }
  },

  /** Butta via un documento esportato; il PDF di un fascicolo se ne va con la sua ricetta. */
  'esportazione.elimina': (_contesto, azione) => {
    const t = testi()
    if (!fraLeEsportazioni(azione.percorso)) return rifiuta(t.nonEsportato)
    const dove = deposito()
    if (!dove) return rifiuta(comuni().nessunAnno)

    // Il PDF di un fascicolo va tolto con la sua ricetta, o una delle due resta orfana.
    if (fraIFascicoli(azione.percorso)) {
      const ricetta = ricettePresenti().find((r) => pdfDi(r.composizione) === azione.percorso)
      if (ricetta) return buttaIlFascicolo(ricetta)
    }

    if (!dove.elimina(azione.percorso)) return rifiuta(t.sparito)
    // La voce resta nel documento finché non lo si compatta: si può recuperare dallo storico.
    return conMessaggio(t.buttato)
  },

} satisfies Parte

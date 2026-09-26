import { registro } from '../../../actions/register.js'
import { inoltra, scrittura } from '../../core.js'
import { elenco, identificatore, iso, oggetto, opzionale, testo, type Schema } from '../../schemas.js'
import { testi } from './anni.testi.js'

const t = () => testi().crea

/** Un periodo di chiusura, come lo manda il modulo delle pause. */
const sospensione = oggetto({
  id: identificatore(),
  etichetta: testo({ aiuto: () => t().etichettaPausa }),
  dal: iso(),
  al: iso(),
})

/**
 * I nomi dei due semestri: il protocollo ne vuole esattamente due. `elenco`
 * controlla la lunghezza a runtime, il tipo dichiara una coppia: il travaso
 * si fa qui, una volta sola.
 */
const coppiaDiEtichette = elenco(testo(), {
  minimo: 2,
  massimo: 2,
  aiuto: () => t().etichetteSemestri,
}) as unknown as Schema<[string, string]>

/**
 * Un anno nuovo è un documento nuovo. Non idempotente: due chiamate fanno due
 * documenti. Nessun dialogo: nasce provvisorio in una cartella del programma
 * (`percorsoProvvisorio` in `actions/register.ts`) e si salva con nome dopo.
 */
export const procedura = scrittura({
  nome: 'anni.crea',
  titolo: () => t().titolo,
  azione: 'anno.crea',
  idempotente: false,
  collezioni: ['registro'],
  ingresso: oggetto({
    inizio: iso({ aiuto: () => t().inizio }),
    fine: iso({ aiuto: () => t().fine }),
    etichetta: opzionale(testo({ aiuto: () => t().etichetta })),
    confine: opzionale(iso({ aiuto: () => t().confine })),
    sospensioni: opzionale(elenco(sospensione, { aiuto: () => t().sospensioni })),
    etichetteSemestri: opzionale(coppiaDiEtichette),
  }),
  esegui: inoltra(registro, 'anno.crea'),
})

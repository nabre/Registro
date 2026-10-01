import { registro } from '#core/azioni/register.js'
import { inoltra, scrittura } from '#contract/core.js'
import { elenco, identificatore, iso, oggetto, opzionale, testo } from '#contract/schemas.js'
import { testi } from './anni.testi.js'

const t = () => testi().crea

/** Un periodo di chiusura, come lo manda il modulo delle pause. */
const sospensione = oggetto({
  id: identificatore(),
  etichetta: testo({ aiuto: () => t().etichettaPausa }),
  dal: iso(),
  al: iso(),
})

/** L'anno del calendario ufficiale che l'anno segue. */
const calendarioDellAnno = oggetto({
  cantone: testo({ aiuto: () => t().cantone }),
  annoScolastico: testo({ aiuto: () => t().annoScolastico }),
}, { aiuto: () => t().calendarioUfficiale })

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
    calendarioUfficiale: opzionale(calendarioDellAnno),
  }),
  esegui: inoltra(registro, 'anno.crea'),
})

import { esportazioni } from '#core/azioni/exports.js'
import { inoltra, scrittura } from '#contract/core.js'
import { oggetto, opzionale, testo } from '#contract/schemas.js'
import { esigiDocumento } from './common.js'
import { testi } from './esportazioni.testi.js'

export const procedura = scrittura({
  nome: 'esportazioni.mostra',
  titolo: () => testi().mostra.titolo,
  azione: 'esportazione.mostra',
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({
    percorso: testo({ minimo: 1 }),
    titolo: opzionale(testo({ aiuto: () => testi().mostra.titoloFinestra })),
  }),
  esegui: (ambito, ingresso) => {
    esigiDocumento(ingresso.percorso)
    return inoltra(esportazioni, 'esportazione.mostra')(ambito, ingresso)
  },
})

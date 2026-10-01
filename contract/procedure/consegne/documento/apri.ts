import { consegne } from '#core/azioni/assignments.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, oggetto } from '#contract/schemas.js'
import { esigiConsegna, perChi } from '#contract/procedure/consegne/common.js'
import { testi } from '#contract/procedure/consegne/consegne.testi.js'

export const procedura = scrittura({
  nome: 'consegne.documento.apri',
  titolo: () => testi().documento.apri.titolo,
  azione: 'consegna.documento.apri',
  // Non tocca il registro (`collezioni` vuoto), ma è `scrittura`: ha un effetto
  // fuori di qui, e «lettura» vuol dire una domanda che non fa succedere niente.
  idempotente: true,
  ingresso: oggetto({
    consegnaId: identificatore(),
    allievoId: perChi,
  }),
  esegui: (ambito, ingresso) => {
    // Che il documento ci sia lo dice il gestore, con un rimedio.
    esigiConsegna(ambito, ingresso.consegnaId)
    return inoltra(consegne, 'consegna.documento.apri')(ambito, ingresso)
  },
})

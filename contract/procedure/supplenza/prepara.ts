import { supplenza } from '#core/azioni/substitute.js'
import { inoltra, scrittura } from '#contract/core.js'
import { booleano, elenco, identificatore, oggetto, opzionale, testo } from '#contract/schemas.js'
import { esigiLezione } from '#contract/procedure/common/plans.js'
import { testi } from './supplenza.testi.js'

export const procedura = scrittura({
  nome: 'supplenza.prepara',
  titolo: () => testi().prepara.titolo,
  azione: 'supplenza.prepara',
  /**
   * Con un indirizzo manda una mail: ritentare la manda due volte. Lo zip
   * accanto al documento si riscrive uguale (e partita la mail si toglie);
   * il registro resta identico.
   */
  idempotente: false,
  collezioni: [],
  ingresso: oggetto({
    lezioniIds: elenco(identificatore(), { minimo: 1, aiuto: () => testi().prepara.lezioni }),
    supplente: opzionale(testo({ massimo: 200, aiuto: () => testi().prepara.supplente })),
    email: opzionale(testo({ massimo: 320, aiuto: () => testi().prepara.email })),
    segretariato: opzionale(booleano({ aiuto: () => testi().prepara.segretariato })),
    conferma: opzionale(booleano({ aiuto: () => testi().prepara.conferma })),
  }),
  esegui: (ambito, ingresso) => {
    for (const id of ingresso.lezioniIds) esigiLezione(ambito, id)
    return inoltra(supplenza, 'supplenza.prepara')(ambito, ingresso)
  },
})

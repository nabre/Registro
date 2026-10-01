import { smistamento } from '#core/azioni/sorting.js'
import type { TipoRapporto } from '#core/dominio/models.js'
import { inoltra, scrittura } from '#contract/core.js'
import { booleano, esaustivo, identificatore, oggetto, scelta } from '#contract/schemas.js'
import { esigiClasse } from '#contract/procedure/common/register.js'
import { esigiSmistamento, pagine } from '#contract/procedure/smistamento/common.js'
import { testi } from '#contract/procedure/smistamento/smistamento.testi.js'

const t = () => testi().assenze.assegna

/**
 * I due rapporti della scuola. Scritti qui perché lo schema li vuole in
 * compilazione; `esaustivo()` ne garantisce la completezza.
 */
const RAPPORTI = esaustivo<TipoRapporto>()(['assenze', 'ritardi'] as const)

/**
 * Le pagine trascinate su una casella della matrice delle assenze.
 *
 * `genere` e `firmato` il file non li sa: i due rapporti si somigliano, e uno
 * scambio spedirebbe all'azienda i ritardi al posto delle assenze. Per questo
 * `genere` è una `scelta`. Il periodo (`bloccoId`) lo cerca `assegnaAssenze`
 * nel fascicolo della classe.
 */
export const procedura = scrittura({
  nome: 'smistamento.assenze.assegna',
  titolo: () => t().titolo,
  azione: 'smistamento.assegnaAssenze',
  idempotente: false,
  collezioni: ['fascicoli', 'smistamenti'],
  ingresso: oggetto({
    smistamentoId: identificatore(),
    classeId: identificatore(),
    bloccoId: identificatore({ aiuto: () => t().bloccoId }),
    allievoId: identificatore(),
    genere: scelta(RAPPORTI, { aiuto: () => t().genere }),
    firmato: booleano({ aiuto: () => t().firmato }),
    pagine: pagine(),
  }),
  esegui: (ambito, ingresso) => {
    esigiSmistamento(ambito, ingresso.smistamentoId)
    esigiClasse(ambito, ingresso.classeId)
    return inoltra(smistamento, 'smistamento.assegnaAssenze')(ambito, ingresso)
  },
})

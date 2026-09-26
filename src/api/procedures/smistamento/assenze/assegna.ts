import { smistamento } from '../../../../actions/sorting.js'
import type { TipoRapporto } from '../../../../domain/models.js'
import { inoltra, scrittura } from '../../../core.js'
import { booleano, identificatore, oggetto, scelta } from '../../../schemas.js'
import { esigiClasse } from '../../common/register.js'
import { esigiSmistamento, pagine } from '../common.js'
import { testi } from '../smistamento.testi.js'

const t = () => testi().assenze.assegna

/**
 * I due rapporti della scuola. Scritti qui perché lo schema li vuole in
 * compilazione; il `satisfies` controlla che siano rapporti del dominio, non
 * che ci siano tutti.
 */
const RAPPORTI = ['assenze', 'ritardi'] as const satisfies readonly TipoRapporto[]

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
    esigiClasse(ambito, ingresso.classeId, null)
    return inoltra(smistamento, 'smistamento.assegnaAssenze')(ambito, ingresso)
  },
})

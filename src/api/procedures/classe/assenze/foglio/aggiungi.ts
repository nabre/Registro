import { docenteClasse } from '../../../../../actions/classTeacher.js'
import { inoltra, scrittura } from '../../../../core.js'
import { booleano, identificatore, oggetto, scelta } from '../../../../schemas.js'
import { esigiAllievo, esigiBlocco, GENERI_RAPPORTO } from '../../common.js'
import { testi } from '../../classe.testi.js'

const t = () => testi().assenze.foglio.aggiungi

export const procedura = scrittura({
  nome: 'classe.assenze.foglio.aggiungi',
  titolo: () => t().titolo,
  azione: 'assenze.foglio.aggiungi',
  // Un foglio ricaricato sostituisce quello nella stessa casella.
  idempotente: true,
  collezioni: ['fascicoli'],
  ingresso: oggetto({
    classeId: identificatore(),
    bloccoId: identificatore(),
    allievoId: identificatore({ aiuto: () => t().allievoId }),
    genere: scelta(GENERI_RAPPORTO, { aiuto: () => t().genere }),
    firmato: booleano({ aiuto: () => t().firmato }),
  }),
  esegui: (ambito, ingresso) => {
    esigiBlocco(ambito, ingresso.classeId, ingresso.bloccoId)
    esigiAllievo(ambito, ingresso.classeId, ingresso.allievoId)
    return inoltra(docenteClasse, 'assenze.foglio.aggiungi')(ambito, ingresso)
  },
})

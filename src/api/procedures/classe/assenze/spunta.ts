import { docenteClasse } from '../../../../actions/classTeacher.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { booleano, identificatore, oggetto } from '../../../schemas.js'
import { esigiAllievo, esigiBlocco } from '../common.js'

export const procedura = definisci({
  nome: 'classe.assenze.spunta',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Segna spedita la richiesta di una persona, o la riporta da mandare',
  azione: 'assenze.spunta',
  idempotente: true,
  collezioni: ['fascicoli'],
  ingresso: oggetto({
    classeId: identificatore(),
    bloccoId: identificatore(),
    allievoId: identificatore(),
    spedita: booleano({ aiuto: 'Falso la riporta da mandare e la casella torna a offrire la bozza' }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiBlocco(ambito, ingresso.classeId, ingresso.bloccoId)
    esigiAllievo(ambito, ingresso.classeId, ingresso.allievoId)
    return daGestore(docenteClasse['assenze.spunta'], (i: typeof ingresso) => ({
      tipo: 'assenze.spunta' as const, ...i,
    }))(ambito, ingresso)
  },
})

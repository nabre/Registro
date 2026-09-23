import { docenteClasse } from '../../../../actions/classTeacher.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, oggetto } from '../../../schemas.js'
import { esigiClasse } from '../common.js'

export const procedura = definisci({
  nome: 'classe.recapiti.elimina',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Toglie un recapito, e con lui il destinatario dalle comunicazioni che lo citavano',
  azione: 'recapito.elimina',
  idempotente: true,
  collezioni: ['fascicoli'],
  ingresso: oggetto({
    classeId: identificatore(),
    recapitoId: identificatore(),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiClasse(ambito, ingresso.classeId)
    // Sul `recapitoId` non c'è guardia, e non per dimenticanza: il lessico non
    // ha un termine per «recapito», e cucire a mano la frase è esattamente quel
    // che il lessico esiste per evitare. Toglierne uno che non c'è più è del
    // resto la cosa voluta, non un errore da raccontare.
    return daGestore(docenteClasse['recapito.elimina'], (i: typeof ingresso) => ({
      tipo: 'recapito.elimina' as const, ...i,
    }))(ambito, ingresso)
  },
})

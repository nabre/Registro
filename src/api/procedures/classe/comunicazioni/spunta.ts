import { docenteClasse } from '../../../../actions/classTeacher.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { booleano, identificatore, oggetto } from '../../../schemas.js'
import { esigiComunicazione } from '../common.js'

export const procedura = definisci({
  nome: 'classe.comunicazioni.spunta',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Segna la comunicazione come spedita, o la riporta a bozza',
  azione: 'comunicazione.spunta',
  // Non manda niente: scrive soltanto quel che chi ha premuto dichiara, e
  // riscriverlo due volte lascia lo stesso stato.
  idempotente: true,
  collezioni: ['fascicoli'],
  ingresso: oggetto({
    classeId: identificatore(),
    comunicazioneId: identificatore(),
    spedita: booleano({ aiuto: 'Falso la riporta a bozza e cancella i destinatari scritti' }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiComunicazione(ambito, ingresso.classeId, ingresso.comunicazioneId)
    return daGestore(docenteClasse['comunicazione.spunta'], (i: typeof ingresso) => ({
      tipo: 'comunicazione.spunta' as const, ...i,
    }))(ambito, ingresso)
  },
})

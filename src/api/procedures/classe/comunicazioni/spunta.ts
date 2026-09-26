import { docenteClasse } from '../../../../actions/classTeacher.js'
import { inoltra, scrittura } from '../../../core.js'
import { booleano, identificatore, oggetto } from '../../../schemas.js'
import { esigiComunicazione } from '../common.js'
import { testi } from '../classe.testi.js'

const t = () => testi().comunicazioni.spunta

export const procedura = scrittura({
  nome: 'classe.comunicazioni.spunta',
  titolo: () => t().titolo,
  azione: 'comunicazione.spunta',
  // Scrive solo quel che chi ha premuto dichiara: due volte, stesso stato.
  idempotente: true,
  collezioni: ['fascicoli'],
  ingresso: oggetto({
    classeId: identificatore(),
    comunicazioneId: identificatore(),
    spedita: booleano({ aiuto: () => t().spedita }),
  }),
  esegui: (ambito, ingresso) => {
    esigiComunicazione(ambito, ingresso.classeId, ingresso.comunicazioneId)
    return inoltra(docenteClasse, 'comunicazione.spunta')(ambito, ingresso)
  },
})

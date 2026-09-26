import { registro } from '../../../actions/register.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, oggetto, testo } from '../../schemas.js'
import { esigiAnno, esigiClasse } from '../common/register.js'
import { testi } from './classi.testi.js'

const t = () => testi().duplica

/**
 * Duplicare non è idempotente: ogni chiamata fa una classe nuova con persone
 * nuove (id nuovi apposta, o le ricerche sarebbero ambigue).
 */
export const procedura = scrittura({
  nome: 'classi.duplica',
  titolo: () => t().titolo,
  azione: 'classe.duplica',
  idempotente: false,
  collezioni: ['classi', 'corsi', 'check'],
  ingresso: oggetto({
    classeId: identificatore({ aiuto: () => t().classeId }),
    annoId: identificatore({ aiuto: () => t().annoId }),
    nome: testo({ aiuto: () => t().nome }),
  }),
  esegui: (ambito, ingresso) => {
    esigiClasse(ambito, ingresso.classeId)
    // Da fuori l'anno non viene da un elenco chiuso: una copia in un anno che non
    // c'è non la mostrerebbe nessuna schermata.
    esigiAnno(ambito, ingresso.annoId)
    return inoltra(registro, 'classe.duplica')(ambito, ingresso)
  },
})

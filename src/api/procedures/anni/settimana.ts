import { registro } from '../../../actions/register.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, iso, nullabile, oggetto, testo } from '../../schemas.js'
import { esigiAnno } from '../common/register.js'
import { testi } from './anni.testi.js'

const t = () => testi().settimana

export const procedura = scrittura({
  nome: 'anni.settimana',
  titolo: () => t().titolo,
  azione: 'anno.settimana',
  idempotente: true,
  collezioni: ['registro'],
  ingresso: oggetto({
    annoId: identificatore(),
    giorno: iso({ aiuto: () => t().giorno }),
    // Testo e non una scelta fissa: i tipi sono le voci della lista «Tipi di
    // settimana» del documento (`tipoSettimana`), estendibile da Impostazioni. Il
    // valore è quello della voce, non l'etichetta.
    lettera: nullabile(testo({ aiuto: () => t().lettera })),
  }),
  esegui: (ambito, ingresso) => {
    esigiAnno(ambito, ingresso.annoId)
    return inoltra(registro, 'anno.settimana')(ambito, ingresso)
  },
})

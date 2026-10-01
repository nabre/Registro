import { registro } from '#core/azioni/register.js'
import { motivoSettimanaRifiutata } from '#core/dominio/years.js'
import { errore } from '#contract/contract.js'
import { inoltra, scrittura } from '#contract/core.js'
import { identificatore, iso, nullabile, oggetto, testo } from '#contract/schemas.js'
import { esigiAnno } from '#contract/procedure/common/register.js'
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
    const anno = esigiAnno(ambito, ingresso.annoId)
    // Una lettera storta o un giorno fuori dall'anno si dicono: l'azione li
    // scarterebbe in silenzio rispondendo «fatto».
    const motivo = motivoSettimanaRifiutata(anno, ingresso.giorno, ingresso.lettera)
    if (motivo) throw errore.rifiuta(motivo)
    return inoltra(registro, 'anno.settimana')(ambito, ingresso)
  },
})

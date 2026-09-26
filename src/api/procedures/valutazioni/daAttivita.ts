import { valutazioni } from '../../../actions/assessments.js'
import { errore } from '../../contract.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { testi } from './valutazioni.testi.js'

const t = () => testi().daAttivita

export const procedura = scrittura({
  nome: 'valutazioni.daAttivita',
  titolo: () => t().titolo,
  azione: 'valutazione.daAttivita',
  // La seconda chiamata non ne crea un altro: per quella tappa torna il momento
  // che c'è già.
  idempotente: true,
  collezioni: ['valutazioni'],
  ingresso: oggetto({
    lezioneId: identificatore({ aiuto: () => t().lezioneId }),
    attivitaId: identificatore({ aiuto: () => t().attivitaId }),
  }),
  esegui: (ambito, ingresso) => {
    // La tappa la cerca il gestore, con la sua frase («Quella tappa non c'è più
    // nel piano.»).
    const lezione = ambito.contesto.registro.lezioni.find((l) => l.id === ingresso.lezioneId)
    if (!lezione) throw errore.nonTrovato('lezione')
    return inoltra(valutazioni, 'valutazione.daAttivita')(ambito, ingresso)
  },
})

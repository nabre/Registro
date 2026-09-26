import { piani } from '../../../actions/plans.js'
import { corsoPerId } from '../../../domain/courses.js'
import { errore } from '../../contract.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, nullabile, oggetto, opzionale } from '../../schemas.js'
import { esigiLezione, esigiPiano } from '../common/plans.js'
import { testi } from './piani.testi.js'

const t = () => testi().perLezione

export const procedura = scrittura({
  nome: 'piani.perLezione',
  titolo: () => t().titolo,
  azione: 'piano.perLezione',
  // Crea un piano una volta sola: la seconda chiamata trova l'ora già servita e
  // risponde `invariato`.
  idempotente: true,
  collezioni: ['piani', 'lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    // Facoltativo e annullabile, come nel protocollo: assente e `null` chiedono
    // entrambi un piano vuoto.
    daPianoId: opzionale(nullabile(identificatore({
      aiuto: () => t().daPianoId,
    }))),
  }),
  esegui: (ambito, ingresso) => {
    const lezione = esigiLezione(ambito, ingresso.lezioneId)
    const passa = inoltra(piani, 'piano.perLezione')
    // Un'ora con un piano è già lo stato voluto: il gestore risponde `invariato`
    // prima di guardare corso e origine.
    if (lezione.pianoId) return passa(ambito, ingresso)
    if (!corsoPerId(ambito.contesto.registro, lezione.corsoId)) {
      throw errore.nonTrovato('corso')
    }
    if (ingresso.daPianoId) esigiPiano(ambito, ingresso.daPianoId)
    return passa(ambito, ingresso)
  },
})

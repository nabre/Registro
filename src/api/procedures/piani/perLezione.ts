import { piani } from '../../../actions/plans.js'
import { corsoPerId } from '../../../domain/courses.js'
import { SCUOLA } from '../../../domain/lexicon.js'
import { definisci, errore } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, nullabile, oggetto, opzionale } from '../../schemas.js'
import { esigiLezione, esigiPiano } from '../common/plans.js'

export const procedura = definisci({
  nome: 'piani.perLezione',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Apre il piano di un’ora: vuoto da completare, o copiato da uno che c’è',
  azione: 'piano.perLezione',
  // Crea un piano, ma una volta sola: la seconda chiamata trova l'ora già
  // servita e si ferma, quindi due chiamate lasciano il registro come una.
  idempotente: true,
  collezioni: ['piani', 'lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    // Facoltativo *e* annullabile, come nel protocollo: chi non dice niente e
    // chi dice «nessuno» chiedono la stessa cosa — un piano vuoto — e tenerne
    // solo uno dei due rifiuterebbe metà delle chiamate che arrivano oggi.
    daPianoId: opzionale(nullabile(identificatore({
      aiuto: 'Il piano da ricopiare. Senza, o nullo, ne nasce uno da completare',
    }))),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    const lezione = esigiLezione(ambito, ingresso.lezioneId)
    // Un'ora che ha già un piano non è un «non trovato»: è un no, e resta un
    // no. La differenza è tutta lì — il primo si ritenta dopo aver riletto, il
    // secondo mai.
    if (lezione.pianoId) throw errore.rifiuta('La lezione ha già un piano assegnato.')
    if (!corsoPerId(ambito.contesto.registro, lezione.corsoId)) {
      throw errore.nonTrovato(SCUOLA.corso)
    }
    if (ingresso.daPianoId) esigiPiano(ambito, ingresso.daPianoId)
    return daGestore(piani['piano.perLezione'], (i: typeof ingresso) => ({
      tipo: 'piano.perLezione' as const, ...i,
    }))(ambito, ingresso)
  },
})

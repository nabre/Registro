import { sistema } from '../../../actions/system.js'
import { LEZIONE } from '../../../domain/lexicon.js'
import { definisci, errore, type Ambito } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'

/** L'ora di lezione, o il motivo per cui non c'è. */
function esigiLezione (ambito: Ambito, lezioneId: string) {
  const lezione = ambito.contesto.registro.lezioni.find((l) => l.id === lezioneId)
  if (!lezione) throw errore.nonTrovato(LEZIONE.lezione)
  return lezione
}

export const procedura = definisci({
  nome: 'esporta.lezione',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Il verbale di un’ora in testo, accanto al suo PDF',
  azione: 'esporta.lezione',
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({ lezioneId: identificatore() }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiLezione(ambito, ingresso.lezioneId)
    return daGestore(sistema['esporta.lezione'], (i: typeof ingresso) => ({
      tipo: 'esporta.lezione' as const, ...i,
    }))(ambito, ingresso)
  },
})

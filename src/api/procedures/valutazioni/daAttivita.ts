import { valutazioni } from '../../../actions/assessments.js'
import { LEZIONE } from '../../../domain/lexicon.js'
import { definisci, errore } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'

export const procedura = definisci({
  nome: 'valutazioni.daAttivita',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Apre il momento di valutazione previsto da una tappa del piano',
  azione: 'valutazione.daAttivita',
  // Chiamarla due volte non ne crea due: per quella tappa il momento c'è già e
  // si torna quello. È la sola di questo file che sia idempotente *creando*.
  idempotente: true,
  collezioni: ['valutazioni'],
  ingresso: oggetto({
    lezioneId: identificatore({ aiuto: 'L’ora dentro cui la prova si fa' }),
    attivitaId: identificatore({ aiuto: 'La tappa della scaletta che prevedeva la prova' }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    // La tappa no: il piano e la scaletta li cerca il gestore, che ha già la
    // sua frase — «Quella tappa non c'è più nel piano.» — e due messaggi per
    // lo stesso no sarebbero due verità da tenere allineate a mano.
    const lezione = ambito.contesto.registro.lezioni.find((l) => l.id === ingresso.lezioneId)
    if (!lezione) throw errore.nonTrovato(LEZIONE.lezione)
    return daGestore(valutazioni['valutazione.daAttivita'], (i: typeof ingresso) => ({
      tipo: 'valutazione.daAttivita' as const, ...i,
    }))(ambito, ingresso)
  },
})

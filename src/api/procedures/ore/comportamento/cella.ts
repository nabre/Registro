import { ore } from '../../../../actions/hours.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, nullabile, oggetto, opzionale, scelta, testo } from '../../../schemas.js'
import { esigiLezione, SEGNI } from '../common.js'

export const procedura = definisci({
  nome: 'ore.comportamento.cella',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Una casella della matrice del comportamento: segno, nota, o tutti e due',
  azione: 'osservazione.cella',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    allievoId: identificatore(),
    aspetto: testo({ minimo: 1, massimo: 80, aiuto: 'Una voce della lista «aspettoOsservato»' }),
    segno: opzionale(nullabile(scelta(SEGNI, {
      aiuto: 'null toglie il segno e lascia la nota; lasciato fuori, resta com’era',
    }))),
    nota: opzionale(testo({ massimo: 500 })),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiLezione(ambito, ingresso.lezioneId)
    // L'iscrizione alla classe la controlla già il gestore, con il suo
    // messaggio: qui non si ripete, per non avere due frasi per lo stesso no.
    return daGestore(ore['osservazione.cella'], (i: typeof ingresso) => ({
      tipo: 'osservazione.cella' as const, ...i,
    }))(ambito, ingresso)
  },
})

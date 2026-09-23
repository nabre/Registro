import { piani } from '../../../actions/plans.js'
import type { StatoAttivita } from '../../../domain/models.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { esaustivo, identificatore, oggetto, opzionale, scelta, testo } from '../../schemas.js'
import { esigiLezione } from '../common/plans.js'

const STATI_ATTIVITA = esaustivo<StatoAttivita>()([
  'da-fare', 'svolta', 'parziale', 'saltata',
] as const)

export const procedura = definisci({
  nome: 'avanzamento.imposta',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Come è andata una tappa della scaletta in quell’ora',
  azione: 'avanzamento.imposta',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    attivitaId: identificatore({ aiuto: 'La tappa del piano assegnato all’ora' }),
    stato: scelta(STATI_ATTIVITA),
    nota: opzionale(testo({ massimo: 2000, aiuto: 'Lasciata fuori, resta quel che c’era' })),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiLezione(ambito, ingresso.lezioneId)
    // La tappa non si controlla, ed è voluto: il piano è fatto per essere
    // riusato e quindi cambia, e il gestore sa già tenere una spunta su
    // un'attività nel frattempo rinominata o tolta — si copia il titolo del
    // giorno. Pretenderla qui renderebbe impossibile raccontare un'ora di
    // novembre dopo aver ritoccato il piano a gennaio.
    return daGestore(piani['avanzamento.imposta'], (i: typeof ingresso) => ({
      tipo: 'avanzamento.imposta' as const, ...i,
    }))(ambito, ingresso)
  },
})

import { piani } from '../../../actions/plans.js'
import type { StatoAttivita } from '../../../domain/models.js'
import { inoltra, scrittura } from '../../core.js'
import { esaustivo, identificatore, oggetto, opzionale, scelta, testo } from '../../schemas.js'
import { esigiLezione } from '../common/plans.js'
import { testi } from './avanzamento.testi.js'

const t = () => testi().imposta

const STATI_ATTIVITA = esaustivo<StatoAttivita>()([
  'da-fare', 'svolta', 'parziale', 'saltata',
] as const)

export const procedura = scrittura({
  nome: 'avanzamento.imposta',
  titolo: () => t().titolo,
  azione: 'avanzamento.imposta',
  idempotente: true,
  collezioni: ['lezioni'],
  ingresso: oggetto({
    lezioneId: identificatore(),
    attivitaId: identificatore({ aiuto: () => t().attivitaId }),
    stato: scelta(STATI_ATTIVITA),
    nota: opzionale(testo({ massimo: 2000, aiuto: () => t().nota })),
  }),
  esegui: (ambito, ingresso) => {
    esigiLezione(ambito, ingresso.lezioneId)
    // La tappa non si controlla: il piano cambia, e il gestore tiene la spunta
    // anche su un'attività rinominata o tolta (copia il titolo del giorno).
    return inoltra(piani, 'avanzamento.imposta')(ambito, ingresso)
  },
})

import { piani } from '../../../actions/plans.js'
import type { Risorsa } from '../../../domain/models.js'
import { validaRisorsa } from '../../../domain/validation.js'
import { inoltra, scrittura } from '../../core.js'
import { entita, identificatore, nullabile, oggetto } from '../../schemas.js'
import { esigiPiano } from '../common/plans.js'
import { esigiRisorsa, esigiTappa } from './common.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import { Uno } from '../../../domain/lexicon.js'
import { testi } from './risorse.testi.js'

const t = () => testi().salva

export const procedura = scrittura({
  nome: 'risorse.salva',
  titolo: () => t().titolo,
  azione: 'risorsa.salva',
  idempotente: true,
  collezioni: ['piani'],
  ingresso: oggetto({
    pianoId: identificatore(),
    attivitaId: nullabile(identificatore({ aiuto: () => t().attivitaId })),
    // Con `validaRisorsa` (un collegamento senza indirizzo non è una risorsa): il
    // gestore lo rifà, ma così la forma dichiarata è quella vera.
    risorsa: entita<Risorsa>({ cosa: () => Uno(lessico().risorsa), valida: validaRisorsa }),
  }),
  esegui: (ambito, ingresso) => {
    const piano = esigiPiano(ambito, ingresso.pianoId)
    esigiTappa(piano, ingresso.attivitaId)
    // Se la riga non c'è il gestore risponderebbe «fatto» senza scrivere: qui è
    // «non trovato».
    esigiRisorsa(piano, ingresso.attivitaId, ingresso.risorsa.id)
    return inoltra(piani, 'risorsa.salva')(ambito, ingresso)
  },
})

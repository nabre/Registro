import { piani } from '../../../actions/plans.js'
import type { Risorsa } from '../../../domain/models.js'
import { validaRisorsa } from '../../../domain/validation.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { entita, identificatore, nullabile, oggetto } from '../../schemas.js'
import { esigiPiano } from '../common/plans.js'
import { esigiRisorsa, esigiTappa } from './common.js'

export const procedura = definisci({
  nome: 'risorse.salva',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Riscrive titolo e note di una risorsa; il file non si tocca da qui',
  azione: 'risorsa.salva',
  idempotente: true,
  collezioni: ['piani'],
  ingresso: oggetto({
    pianoId: identificatore(),
    attivitaId: nullabile(identificatore({ aiuto: 'null: la risorsa è del piano intero' })),
    // Con `validaRisorsa`, che sa che un collegamento senza indirizzo non è
    // una risorsa. Il gestore lo rifà comunque: qui serve perché la forma
    // dichiarata sia quella vera e non «un oggetto qualunque».
    risorsa: entita<Risorsa>({ cosa: 'Risorsa', valida: validaRisorsa }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    const piano = esigiPiano(ambito, ingresso.pianoId)
    esigiTappa(piano, ingresso.attivitaId)
    // Il gestore, se la riga non c'è, non scrive niente e risponde «fatto»:
    // un salvataggio che non salva e dice di sì. Qui diventa «non trovato».
    esigiRisorsa(piano, ingresso.attivitaId, ingresso.risorsa.id)
    return daGestore(piani['risorsa.salva'], (i: typeof ingresso) => ({
      tipo: 'risorsa.salva' as const, ...i,
    }))(ambito, ingresso)
  },
})

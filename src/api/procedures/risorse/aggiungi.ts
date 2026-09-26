import { piani } from '../../../actions/plans.js'
import type { TipoRisorsa } from '../../../domain/models.js'
import { inoltra, scrittura } from '../../core.js'
import { esaustivo, identificatore, nullabile, oggetto, opzionale, scelta, testo } from '../../schemas.js'
import { esigiPiano } from '../common/plans.js'
import { esigiTappa } from './common.js'
import { testi } from './risorse.testi.js'

const t = () => testi().aggiungi

/**
 * I tre generi di risorsa e i quattro stati di una tappa. Scritti qui perché lo
 * schema li vuole in compilazione; `esaustivo()` fa fallire un valore
 * dimenticato.
 */
const GENERI_RISORSA = esaustivo<TipoRisorsa>()([
  'collegamento', 'file', 'immagine',
] as const)

/** Un titolo di risorsa è un campo di testo, non una pagina. */
const TITOLO_MASSIMO = 200

/** Un indirizzo web sta largamente sotto i duemila caratteri, ovunque. */
const URL_MASSIMO = 2000

export const procedura = scrittura({
  nome: 'risorse.aggiungi',
  titolo: () => t().titolo,
  azione: 'risorsa.aggiungi',
  // Per un file o un'immagine il gestore apre il dialogo e copia la scelta nella
  // cartella dei dati: due chiamate, due copie.
  idempotente: false,
  collezioni: ['piani'],
  ingresso: oggetto({
    pianoId: identificatore(),
    attivitaId: nullabile(identificatore({
      aiuto: () => t().attivitaId,
    })),
    genere: scelta(GENERI_RISORSA, {
      aiuto: () => t().genere,
    }),
    titolo: opzionale(testo({ massimo: TITOLO_MASSIMO })),
    url: opzionale(testo({ massimo: URL_MASSIMO, aiuto: () => t().url })),
  }),
  esegui: (ambito, ingresso) => {
    const piano = esigiPiano(ambito, ingresso.pianoId)
    // Prima del dialogo: non si fa scegliere un file per una tappa che non c'è più.
    esigiTappa(piano, ingresso.attivitaId)
    return inoltra(piani, 'risorsa.aggiungi')(ambito, ingresso)
  },
})

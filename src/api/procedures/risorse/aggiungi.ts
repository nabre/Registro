import { piani } from '../../../actions/plans.js'
import type { TipoRisorsa } from '../../../domain/models.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { esaustivo, identificatore, nullabile, oggetto, opzionale, scelta, testo } from '../../schemas.js'
import { esigiPiano } from '../common/plans.js'
import { esigiTappa } from './common.js'

/**
 * I tre generi di risorsa e i quattro stati di una tappa.
 *
 * Scritti qui come in `hours.ts` gli stati dell'appello, e per lo stesso motivo:
 * uno schema ha bisogno dei valori quando compila, non quando gira. Il
 * `satisfies` fa sì che un genere aggiunto al modello e dimenticato qui non
 * compili — che è l'unico posto in cui uno se ne accorge.
 */
const GENERI_RISORSA = esaustivo<TipoRisorsa>()([
  'collegamento', 'file', 'immagine',
] as const)

/** Un titolo di risorsa è un campo di testo, non una pagina. */
const TITOLO_MASSIMO = 200

/** Un indirizzo web sta largamente sotto i duemila caratteri, ovunque. */
const URL_MASSIMO = 2000

export const procedura = definisci({
  nome: 'risorse.aggiungi',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Appende una risorsa al piano o a una sua tappa: un collegamento, un file, un’immagine',
  azione: 'risorsa.aggiungi',
  // Per un collegamento sarebbe una riga in più e basta; per un file e
  // un'immagine il gestore apre il dialogo di sistema e copia quel che si
  // sceglie dentro la cartella dei dati. Chiamarla due volte fa due copie, e
  // il campo lo deve dire prima che qualcuno ritenti.
  idempotente: false,
  collezioni: ['piani'],
  ingresso: oggetto({
    pianoId: identificatore(),
    attivitaId: nullabile(identificatore({
      aiuto: 'La tappa a cui appenderla; null vuol dire «del piano intero»',
    })),
    genere: scelta(GENERI_RISORSA, {
      aiuto: 'Un collegamento resta un indirizzo; un file e un’immagine si scelgono da disco',
    }),
    titolo: opzionale(testo({ massimo: TITOLO_MASSIMO })),
    url: opzionale(testo({ massimo: URL_MASSIMO, aiuto: 'Solo per «collegamento»' })),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    const piano = esigiPiano(ambito, ingresso.pianoId)
    // Prima del dialogo e non dopo: far scegliere un file per poi dire che la
    // tappa non c'è più è il modo peggiore di dirlo.
    esigiTappa(piano, ingresso.attivitaId)
    return daGestore(piani['risorsa.aggiungi'], (i: typeof ingresso) => ({
      tipo: 'risorsa.aggiungi' as const, ...i,
    }))(ambito, ingresso)
  },
})

import { valutazioni } from '../../../../actions/assessments.js'
import type { RuoloAllegato } from '../../../../domain/models.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, nullabile, oggetto, opzionale, scelta } from '../../../schemas.js'
import { esigiMomento } from '../common.js'

/**
 * I cinque ruoli di un foglio appeso a una prova.
 *
 * Scritti qui come in `hours.ts` gli stati dell'appello, e per lo stesso motivo:
 * uno schema ha bisogno dei valori quando compila. Il `satisfies` fa sì che un
 * ruolo aggiunto al modello e dimenticato qui non compili.
 */
const RUOLI = [
  'verifica', 'soluzione', 'prova', 'recupero', 'recupero-soluzione',
] as const satisfies readonly RuoloAllegato[]

export const procedura = definisci({
  nome: 'valutazioni.allegato.aggiungi',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Appende un PDF a una prova: il testo, la soluzione, o il compito corretto di qualcuno',
  azione: 'allegato.aggiungi',
  // Apre un dialogo e copia un file: due chiamate sono due scelte, e la
  // seconda non è la ripetizione della prima. Chi ritenta dopo un errore di
  // trasporto si ritrova a riscegliere il file, non a ritrovarsi al sicuro.
  idempotente: false,
  collezioni: ['valutazioni'],
  ingresso: oggetto({
    valutazioneId: identificatore(),
    ruolo: scelta(RUOLI, { aiuto: 'Che foglio è: testo, soluzione, prova corretta, recupero' }),
    // `allievoId?: string | null`: con `ruolo: 'recupero'` l'allievo è
    // facoltativo — senza è il testo della prova di recupero, che è uno per
    // tutti. La chiave assente e `null` dicono qui la stessa cosa, ma il
    // protocollo ammette tutte e due e uno schema che ne rifiutasse una
    // romperebbe una delle due sponde che già chiamano.
    allievoId: opzionale(nullabile(identificatore({
      aiuto: 'Di chi è il compito. Senza, il foglio è del momento e non di una persona',
    }))),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    // Il resto — che il ruolo «prova» voglia un allievo, che la classe ci sia,
    // che l'anno sia aperto — lo controlla il gestore prima di aprire il
    // dialogo, con le sue frasi.
    esigiMomento(ambito, ingresso.valutazioneId)
    return daGestore(valutazioni['allegato.aggiungi'], (i: typeof ingresso) => ({
      tipo: 'allegato.aggiungi' as const, ...i,
    }))(ambito, ingresso)
  },
})

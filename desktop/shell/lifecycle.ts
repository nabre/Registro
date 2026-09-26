// Le decisioni del ciclo di vita del documento, fuori da `main.ts` perché lì
// non si possono provare (importarlo accende l'applicazione). Niente Electron
// né stato: chi chiama descrive la situazione e riceve che cosa fare.

/** Com'è il registro nel momento in cui l'ultima finestra se ne va. */
interface StatoSenzaFinestre {
  /** Si sta già uscendo: le finestre si chiudono una dopo l'altra per quello. */
  inChiusura: boolean
  /** Un anno si sta aprendo o creando: la finestra che lo mostrerà non c'è ancora. */
  aperturaInCorso: boolean
  /** L'icona accanto all'orologio c'è, e da lì il registro si riprende. */
  vassoioAcceso: boolean
  /** L'impostazione `vassoio.chiusuraNelVassoio`: la X mette via invece di uscire. */
  chiusuraNelVassoio: boolean
  /** `process.platform`: su macOS l'applicazione sopravvive alle sue finestre. */
  piattaforma: string
}

/**
 * Che cosa fare quando non resta nessuna finestra.
 *
 * - `aspetta`: un anno sta arrivando (il benvenuto chiuso è la risposta al clic).
 * - `vassoio`: si resta vivi accanto all'orologio, e lo si dice.
 * - `esci`: l'applicazione se ne va.
 *
 * Il vassoio vuole l'icona accesa (o non ci sarebbe modo di riprendere il
 * registro), l'impostazione, e che non si stia già uscendo (in `before-quit` le
 * finestre si chiudono una dopo l'altra).
 */
type SenzaFinestre = 'aspetta' | 'vassoio' | 'esci'

export function quandoNonRestanoFinestre (stato: StatoSenzaFinestre): SenzaFinestre {
  // Chi sta uscendo esce: `usaDocumento` controlla da sé e non apre niente.
  if (stato.inChiusura) return stato.piattaforma === 'darwin' ? 'aspetta' : 'esci'
  if (stato.aperturaInCorso) return 'aspetta'
  if (stato.vassoioAcceso && stato.chiusuraNelVassoio) return 'vassoio'
  return stato.piattaforma === 'darwin' ? 'aspetta' : 'esci'
}

/** Com'è il registro quando qualcuno chiede il benvenuto da fuori. */
interface StatoBenvenuto {
  /** Un anno si sta aprendo o creando, scelto un momento fa. */
  aperturaInCorso: boolean
  /** Un anno è aperto, e il registro lo mostra. */
  documentoAperto: boolean
}

/**
 * Che cosa fa «Mostra il benvenuto» quando il benvenuto non è già aperto.
 *
 * - `niente`: un anno sta arrivando, e il benvenuto resterebbe sopra di lui.
 * - `registro`: un anno è aperto, e quel che si vuole è ritrovarlo.
 * - `benvenuto`: nessun anno: il benvenuto è la risposta.
 */
export type RichiestaBenvenuto = 'niente' | 'registro' | 'benvenuto'

export function allaRichiestaDelBenvenuto (stato: StatoBenvenuto): RichiestaBenvenuto {
  if (stato.aperturaInCorso) return 'niente'
  if (stato.documentoAperto) return 'registro'
  return 'benvenuto'
}

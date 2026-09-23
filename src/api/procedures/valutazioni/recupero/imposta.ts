import { valutazioni } from '../../../../actions/assessments.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { booleano, identificatore, iso, nullabile, oggetto, opzionale, testo } from '../../../schemas.js'
import { esigiMomento } from '../common.js'

export const procedura = definisci({
  nome: 'valutazioni.recupero.imposta',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Che cosa si fa del buco lasciato da un’assenza: quando si rifà, o che non si rifà',
  azione: 'recupero.imposta',
  idempotente: true,
  collezioni: ['valutazioni'],
  ingresso: oggetto({
    valutazioneId: identificatore(),
    allievoId: identificatore(),
    // `previstoIl: string | null`: la chiave c'è sempre. `null` senza
    // `dispensato` rimette il recupero fra quelli da fissare — è il modo di
    // disdire una data, e non è la stessa cosa di non dire niente.
    previstoIl: nullabile(iso({ aiuto: 'Quando si rifà. null lo rimette fra quelli da fissare' })),
    nota: opzionale(testo({ massimo: 500 })),
    dispensato: opzionale(booleano({ aiuto: 'La prova non si recupera: niente data, niente foglio da ridare' })),
    // `riconsegnataIl?: string | null`, e qui i due significati non coincidono
    // mai per caso: la chiave assente vuol dire «lascia com'era» — chi sposta
    // il giorno del recupero non sta dicendo niente sulla riconsegna — e
    // `null` vuol dire «toglila». Da cui `opzionale(nullabile(...))`, e non
    // uno dei due da solo: con `nullabile` soltanto la chiave diventerebbe
    // obbligatoria, con `opzionale` soltanto non si potrebbe più togliere.
    riconsegnataIl: opzionale(nullabile(iso({
      aiuto: 'Il giorno in cui la prova rifatta è tornata. Lasciato fuori resta com’era; null la toglie',
    }))),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiMomento(ambito, ingresso.valutazioneId)
    return daGestore(valutazioni['recupero.imposta'], (i: typeof ingresso) => ({
      tipo: 'recupero.imposta' as const, ...i,
    }))(ambito, ingresso)
  },
})

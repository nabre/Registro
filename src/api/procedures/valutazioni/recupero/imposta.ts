import { valutazioni } from '../../../../actions/assessments.js'
import { inoltra, scrittura } from '../../../core.js'
import { booleano, identificatore, iso, nullabile, oggetto, opzionale, testo } from '../../../schemas.js'
import { esigiMomento } from '../common.js'
import { testi } from '../valutazioni.testi.js'

const t = () => testi().recupero.imposta

export const procedura = scrittura({
  nome: 'valutazioni.recupero.imposta',
  titolo: () => t().titolo,
  azione: 'recupero.imposta',
  idempotente: true,
  collezioni: ['valutazioni'],
  ingresso: oggetto({
    valutazioneId: identificatore(),
    allievoId: identificatore(),
    // La chiave c'è sempre: `null` senza `dispensato` disdice la data e rimette il
    // recupero fra quelli da fissare.
    previstoIl: nullabile(iso({ aiuto: () => t().previstoIl })),
    nota: opzionale(testo({ massimo: 500 })),
    dispensato: opzionale(booleano({ aiuto: () => t().dispensato })),
    // Chiave assente = lascia com'era; `null` = togli. Per questo
    // `opzionale(nullabile(...))`: con uno solo dei due, la chiave diventerebbe
    // obbligatoria o non si potrebbe togliere.
    riconsegnataIl: opzionale(nullabile(iso({ aiuto: () => t().riconsegnataIl }))),
  }),
  esegui: (ambito, ingresso) => {
    esigiMomento(ambito, ingresso.valutazioneId)
    return inoltra(valutazioni, 'recupero.imposta')(ambito, ingresso)
  },
})

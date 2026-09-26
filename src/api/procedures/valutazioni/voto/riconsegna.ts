import { valutazioni } from '../../../../actions/assessments.js'
import { errore } from '../../../contract.js'
import { inoltra, scrittura } from '../../../core.js'
import { identificatore, iso, nullabile, oggetto } from '../../../schemas.js'
import { esigiPersona } from '../../common/register.js'
import { esigiMomento } from '../common.js'
import { testi } from '../valutazioni.testi.js'

const t = () => testi().voto.riconsegna

export const procedura = scrittura({
  nome: 'valutazioni.voto.riconsegna',
  titolo: () => t().titolo,
  azione: 'voto.riconsegna',
  idempotente: true,
  collezioni: ['valutazioni'],
  ingresso: oggetto({
    valutazioneId: identificatore(),
    allievoId: identificatore(),
    il: nullabile(iso({ aiuto: () => t().il })),
  }),
  esegui: (ambito, ingresso) => {
    const momento = esigiMomento(ambito, ingresso.valutazioneId)
    // Due no diversi: un id che non c'è è «non trovato» (si rilegge); una persona
    // senza casella in questa prova non ha fogli da riavere.
    esigiPersona(ambito, ingresso.allievoId)
    if (!momento.voti.some((v) => v.allievoId === ingresso.allievoId)) {
      throw errore.rifiuta(t().senzaCasella(momento.titolo))
    }
    return inoltra(valutazioni, 'voto.riconsegna')(ambito, ingresso)
  },
})

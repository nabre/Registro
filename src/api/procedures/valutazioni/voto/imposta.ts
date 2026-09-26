import { valutazioni } from '../../../../actions/assessments.js'
import { errore } from '../../../contract.js'
import { inoltra, scrittura } from '../../../core.js'
import { booleano, identificatore, nullabile, numero, oggetto, opzionale, testo } from '../../../schemas.js'
import { esigiMomento } from '../common.js'
import { testi } from '../valutazioni.testi.js'

const t = () => testi().voto.imposta

export const procedura = scrittura({
  nome: 'valutazioni.voto.imposta',
  titolo: () => t().titolo,
  azione: 'voto.imposta',
  idempotente: true,
  collezioni: ['valutazioni'],
  ingresso: oggetto({
    valutazioneId: identificatore(),
    allievoId: identificatore(),
    valore: nullabile(numero({ aiuto: () => t().valore })),
    assente: booleano({ aiuto: () => t().assente }),
    nota: opzionale(testo({ massimo: 500 })),
  }),
  esegui: (ambito, ingresso) => {
    const momento = esigiMomento(ambito, ingresso.valutazioneId)
    // La scala congelata nel momento: il controllo si rifà qui solo per dire quale
    // scala nel messaggio. Il gestore lo rifà comunque.
    const fuoriScala = ingresso.valore !== null &&
      (ingresso.valore < momento.scala.min || ingresso.valore > momento.scala.max)
    if (fuoriScala) {
      throw errore.rifiuta(t().fuoriScala(momento.scala.min, momento.scala.max, momento.titolo))
    }
    return inoltra(valutazioni, 'voto.imposta')(ambito, ingresso)
  },
})

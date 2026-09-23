import { valutazioni } from '../../../../actions/assessments.js'
import { definisci, errore } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { booleano, identificatore, nullabile, numero, oggetto, opzionale, testo } from '../../../schemas.js'
import { esigiMomento } from '../common.js'

export const procedura = definisci({
  nome: 'valutazioni.voto.imposta',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Il voto di una persona in una prova',
  azione: 'voto.imposta',
  idempotente: true,
  collezioni: ['valutazioni'],
  ingresso: oggetto({
    valutazioneId: identificatore(),
    allievoId: identificatore(),
    valore: nullabile(numero({
      aiuto: 'null vuol dire «non ancora messo», che non è zero. Entra arrotondato al passo della scala',
    })),
    assente: booleano({ aiuto: 'Non ha fatto la prova: il voto non fa media e nasce un recupero' }),
    nota: opzionale(testo({ massimo: 500 })),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    const momento = esigiMomento(ambito, ingresso.valutazioneId)
    // La scala è quella congelata nel momento, non quella corrente del
    // registro: il controllo si rifà qui solo per poter dire *quale* scala,
    // che in un messaggio all'esterno è la differenza fra un errore che si
    // capisce e uno che si indovina. Il gestore lo rifarà comunque.
    const fuoriScala = ingresso.valore !== null &&
      (ingresso.valore < momento.scala.min || ingresso.valore > momento.scala.max)
    if (fuoriScala) {
      throw errore.rifiuta(
        `Voto fuori dalla scala ${momento.scala.min}–${momento.scala.max} di «${momento.titolo}».`,
      )
    }
    return daGestore(valutazioni['voto.imposta'], (i: typeof ingresso) => ({
      tipo: 'voto.imposta' as const, ...i,
    }))(ambito, ingresso)
  },
})

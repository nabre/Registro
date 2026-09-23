import { piani } from '../../../actions/plans.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiPiano } from '../common/plans.js'

export const procedura = definisci({
  nome: 'piani.elimina',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Toglie un piano e la cartella di risorse che si porta dietro',
  azione: 'piano.elimina',
  idempotente: true,
  // Le ore che lo usavano restano, senza scaletta e senza le spunte già messe:
  // anche il file delle lezioni va riscritto. E i momenti di valutazione nati
  // da una tappa vengono staccati allo stesso modo, quindi pure quello.
  collezioni: ['piani', 'lezioni', 'valutazioni'],
  ingresso: oggetto({ pianoId: identificatore() }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiPiano(ambito, ingresso.pianoId)
    return daGestore(piani['piano.elimina'], (i: typeof ingresso) => ({
      tipo: 'piano.elimina' as const, ...i,
    }))(ambito, ingresso)
  },
})

import { piani } from '../../../actions/plans.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiPiano } from '../common/plans.js'

export const procedura = definisci({
  nome: 'piani.duplica',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Una copia del piano, con i file delle sue risorse ricopiati davvero',
  azione: 'piano.duplica',
  // Non idempotente, e per il motivo peggiore: ogni chiamata ricopia sul disco
  // ogni file appeso al piano e alle sue tappe. Ritentarla dopo un guasto di
  // trasporto lascia un piano in più e una cartella di file in più.
  idempotente: false,
  collezioni: ['piani'],
  ingresso: oggetto({ pianoId: identificatore() }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiPiano(ambito, ingresso.pianoId)
    return daGestore(piani['piano.duplica'], (i: typeof ingresso) => ({
      tipo: 'piano.duplica' as const, ...i,
    }))(ambito, ingresso)
  },
})

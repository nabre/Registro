import { piani } from '../../../actions/plans.js'
import { inoltra, scrittura } from '../../core.js'
import { identificatore, oggetto } from '../../schemas.js'
import { esigiPiano } from '../common/plans.js'
import { testi } from './piani.testi.js'

export const procedura = scrittura({
  nome: 'piani.duplica',
  titolo: () => testi().duplica.titolo,
  azione: 'piano.duplica',
  // Non idempotente: ogni chiamata ricopia sul disco tutti i file del piano e
  // delle sue tappe.
  idempotente: false,
  collezioni: ['piani'],
  ingresso: oggetto({ pianoId: identificatore() }),
  esegui: (ambito, ingresso) => {
    esigiPiano(ambito, ingresso.pianoId)
    return inoltra(piani, 'piano.duplica')(ambito, ingresso)
  },
})
